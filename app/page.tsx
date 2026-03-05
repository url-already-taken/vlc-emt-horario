"use client"

import { useState, useEffect, useCallback } from "react"
import type { BusStop } from "../lib/busStopTypes"
import SearchBar from "./components/SearchBar"
import BusStopList from "./components/BusStopList"
import BusStopDetail from "./components/BusStopDetail"
import AllStations from "./components/AllStations"
import { Button } from "@/components/ui/button"
import { BusStopProvider, useBusStops } from "../lib/BusStopContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import StopCompass from "./components/StopCompass"
import CompassOverlay from "./components/CompassOverlay"

const GEO_PERMISSION_STATE_STORAGE_KEY = "paradaya:geo-permission-state"
const LEGACY_GEO_PERMISSION_STORAGE_KEY = "paradaya:geo-permission-granted"
const safeLocalStorage = {
  get(key: string) {
    if (typeof window === "undefined") return null
    try {
      return window.localStorage.getItem(key)
    } catch (err) {
      console.warn("No se pudo leer localStorage:", err)
      return null
    }
  },
  set(key: string, value: string) {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(key, value)
    } catch (err) {
      console.warn("No se pudo guardar localmente el permiso:", err)
    }
  },
  remove(key: string) {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(key)
    } catch (err) {
      console.warn("No se pudo borrar el permiso almacenado:", err)
    }
  },
}

function readStoredGeoPermissionState(): PermissionState | null {
  const storedState = safeLocalStorage.get(GEO_PERMISSION_STATE_STORAGE_KEY)
  if (storedState === "granted" || storedState === "denied" || storedState === "prompt") {
    return storedState
  }

  const legacyGrant = safeLocalStorage.get(LEGACY_GEO_PERMISSION_STORAGE_KEY)
  if (legacyGrant === "true") return "granted"

  return null
}

function persistGeoPermissionState(state: PermissionState) {
  safeLocalStorage.set(GEO_PERMISSION_STATE_STORAGE_KEY, state)
  if (state === "granted") {
    safeLocalStorage.set(LEGACY_GEO_PERMISSION_STORAGE_KEY, "true")
  } else {
    safeLocalStorage.remove(LEGACY_GEO_PERMISSION_STORAGE_KEY)
  }
}

function HomeContent() {
  const sortBy: "nearest" | "soonest" = "nearest"
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null)
  const [showAllStations, setShowAllStations] = useState(false)
  const [showCompassOverlay, setShowCompassOverlay] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [geoPermissionState, setGeoPermissionState] = useState<PermissionState | "unknown">("unknown")
  const [geoPermissionError, setGeoPermissionError] = useState<string | null>(null)
  const { setUserLocation, setDistanceFilter, loading, error } = useBusStops()

  const requestUserLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoPermissionError("Tu navegador no soporta geolocalización.")
      return
    }

    setGeoPermissionError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setGeoPermissionState("granted")
        setGeoPermissionError(null)
        persistGeoPermissionState("granted")
      },
      (geoError) => {
        console.error("Error getting user location:", geoError)
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setGeoPermissionState("denied")
          setGeoPermissionError(null)
          persistGeoPermissionState("denied")
          return
        }

        setGeoPermissionError("No pudimos acceder a tu ubicación. Intenta de nuevo en unos segundos.")
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    )
  }, [setUserLocation])

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return
    }

    let permissionStatus: PermissionStatus | null = null
    const storedPermissionState = readStoredGeoPermissionState()

    const handlePermissionChange = () => {
      if (!permissionStatus) return
      setGeoPermissionState(permissionStatus.state)
      persistGeoPermissionState(permissionStatus.state)

      if (permissionStatus.state === "granted") {
        requestUserLocation()
      } else if (permissionStatus.state === "denied") {
        setGeoPermissionError(null)
      } else {
        setGeoPermissionError(null)
      }
    }

    const initPermission = async () => {
      if (navigator.permissions?.query) {
        try {
          permissionStatus = await navigator.permissions.query({ name: "geolocation" })
          setGeoPermissionState(permissionStatus.state)
          persistGeoPermissionState(permissionStatus.state)

          if (permissionStatus.state === "granted") {
            requestUserLocation()
          } else {
            setGeoPermissionError(null)
          }

          permissionStatus.addEventListener?.("change", handlePermissionChange)
          permissionStatus.onchange = handlePermissionChange
          return
        } catch (permError) {
          console.warn("No se pudo leer el estado de permisos de geolocalización:", permError)
        }
      }

      if (storedPermissionState) {
        setGeoPermissionState(storedPermissionState)
      } else {
        setGeoPermissionState("prompt")
      }

      if (storedPermissionState === "granted") {
        setGeoPermissionState("granted")
        requestUserLocation()
      } else {
        setGeoPermissionError(null)
      }
    }

    initPermission()

    return () => {
      if (!permissionStatus) return
      permissionStatus.removeEventListener?.("change", handlePermissionChange)
      permissionStatus.onchange = null
    }
  }, [requestUserLocation])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleQueryChange = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  const handleDistanceFilterChange = (value: string) => {
    setDistanceFilter(Number.parseFloat(value))
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-4">
      <header className="mb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">ParadaYa</h1>
      </header>
      {showCompassOverlay && <CompassOverlay />}
      {showAllStations ? (
        <>
          <Button onClick={() => setShowAllStations(false)} variant="outline" className="mb-4">
            Volver a paradas cercanas
          </Button>
          <AllStations />
        </>
      ) : (
        <>
          <section className="mb-3">
            <SearchBar query={searchQuery} onQueryChange={handleQueryChange} onSearch={handleSearch} />
            {geoPermissionState === "denied" && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-700 mb-2">
                <span>Acceso a ubicación bloqueado. Puedes reintentar tras habilitarlo en el navegador.</span>
                <Button size="sm" variant="outline" onClick={requestUserLocation}>
                  Reintentar acceso
                </Button>
              </div>
            )}
            {geoPermissionError && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-red-600 mb-2">
                <span>{geoPermissionError}</span>
                <Button size="sm" variant="outline" onClick={requestUserLocation}>
                  Intentar de nuevo
                </Button>
              </div>
            )}
            {!geoPermissionError && geoPermissionState === "prompt" && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-2">
                <span>Comparte tu ubicación para ordenar las paradas por cercanía.</span>
                <Button size="sm" variant="ghost" onClick={requestUserLocation}>
                  Solicitar acceso
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-auto">
                <Select onValueChange={handleDistanceFilterChange}>
                  <SelectTrigger className="h-9 w-full sm:w-[180px] bg-white">
                    <SelectValue placeholder="Filtrar por distancia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.1">100 metros</SelectItem>
                    <SelectItem value="0.5">500 metros</SelectItem>
                    <SelectItem value="1">1 kilómetro</SelectItem>
                    <SelectItem value="Infinity">Todas las paradas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <StopCompass
                isActive={showCompassOverlay}
                onToggle={setShowCompassOverlay}
              />
              <Button onClick={() => setShowAllStations(true)} variant="outline" size="sm" className="h-9">
                Ver todas
              </Button>
            </div>
          </section>

          {loading && <div className="mt-4">Cargando paradas...</div>}
          {error && !loading && <div className="mt-4 text-red-600">{error}</div>}
          {!loading && !error && (
            <div
              className={`transition-opacity duration-300 ${
                showCompassOverlay ? "opacity-20" : "opacity-100"
              }`}
            >
              <BusStopList sortBy={sortBy} onSelectStop={setSelectedStop} searchQuery={searchQuery} />
              {selectedStop && <BusStopDetail stop={selectedStop} onClose={() => setSelectedStop(null)} />}
            </div>
          )}
        </>
      )}
    </main>
  )
}

export default function Home() {
  return (
    <BusStopProvider>
      <HomeContent />
    </BusStopProvider>
  )
}
