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

export const dynamic = "force-dynamic"

const GEO_PERMISSION_STATE_STORAGE_KEY = "paradaya:geo-permission-state"
const LEGACY_GEO_PERMISSION_STORAGE_KEY = "paradaya:geo-permission-granted"
const USER_LOCATION_STORAGE_KEY = "paradaya:user-location"

interface StoredLocation {
  latitude: number
  longitude: number
  savedAt: number
}

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

function readStoredLocation(): StoredLocation | null {
  const rawLocation = safeLocalStorage.get(USER_LOCATION_STORAGE_KEY)
  if (!rawLocation) return null

  try {
    const parsed = JSON.parse(rawLocation) as Partial<StoredLocation>
    if (
      typeof parsed.latitude !== "number" ||
      !Number.isFinite(parsed.latitude) ||
      typeof parsed.longitude !== "number" ||
      !Number.isFinite(parsed.longitude)
    ) {
      return null
    }

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      savedAt:
        typeof parsed.savedAt === "number" && Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now(),
    }
  } catch (err) {
    console.warn("No se pudo leer la ubicación guardada:", err)
    return null
  }
}

function persistStoredLocation(location: { latitude: number; longitude: number }, savedAt = Date.now()) {
  safeLocalStorage.set(
    USER_LOCATION_STORAGE_KEY,
    JSON.stringify({
      latitude: location.latitude,
      longitude: location.longitude,
      savedAt,
    }),
  )
}

function formatLocationTimestamp(savedAt: number | null): string | null {
  if (!savedAt) return null

  try {
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(savedAt)
  } catch {
    return null
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
  const [cachedLocationSavedAt, setCachedLocationSavedAt] = useState<number | null>(null)
  const { setUserLocation, setDistanceFilter, loading, error } = useBusStops()
  const hasCachedLocation = cachedLocationSavedAt !== null
  const cachedLocationTime = formatLocationTimestamp(cachedLocationSavedAt)

  const requestUserLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoPermissionError("Tu navegador no soporta geolocalización.")
      return
    }

    setGeoPermissionError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        const savedAt = Date.now()

        setUserLocation(nextLocation)
        setCachedLocationSavedAt(savedAt)
        setGeoPermissionState("granted")
        setGeoPermissionError(null)
        persistGeoPermissionState("granted")
        persistStoredLocation(nextLocation, savedAt)
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
    const storedLocation = readStoredLocation()

    if (storedLocation) {
      setUserLocation({
        latitude: storedLocation.latitude,
        longitude: storedLocation.longitude,
      })
      setCachedLocationSavedAt(storedLocation.savedAt)
    }

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
      setGeoPermissionError(null)
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
    <main className="min-h-screen max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <header className="mb-4 rounded-[28px] border border-white/80 bg-white/85 px-4 py-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Valencia EMT</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">ParadaYa</h1>
        <p className="mt-1 text-sm text-slate-500">Paradas cercanas, favoritos y tiempos en una vista más compacta.</p>
      </header>
      {showCompassOverlay && <CompassOverlay />}
      {showAllStations ? (
        <>
          <Button onClick={() => setShowAllStations(false)} variant="outline" className="mb-4 rounded-xl bg-white/90">
            Volver a paradas cercanas
          </Button>
          <AllStations />
        </>
      ) : (
        <>
          <section className="mb-4 rounded-[28px] border border-white/80 bg-white/80 p-3 shadow-sm shadow-slate-200/50 backdrop-blur sm:p-4">
            <SearchBar query={searchQuery} onQueryChange={handleQueryChange} onSearch={handleSearch} />
            {geoPermissionState === "denied" && !hasCachedLocation && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <span>Acceso a ubicación bloqueado. Puedes reintentar tras habilitarlo en el navegador.</span>
                <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={requestUserLocation}>
                  Reintentar acceso
                </Button>
              </div>
            )}
            {geoPermissionError && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <span>{geoPermissionError}</span>
                <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={requestUserLocation}>
                  Intentar de nuevo
                </Button>
              </div>
            )}
            {!geoPermissionError && hasCachedLocation && geoPermissionState !== "granted" && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs text-slate-600">
                <span>
                  Usando tu última ubicación guardada
                  {cachedLocationTime ? ` (${cachedLocationTime})` : ""} para ordenar por cercanía.
                </span>
                <Button size="sm" variant="ghost" className="rounded-full px-3" onClick={requestUserLocation}>
                  Actualizar ubicación
                </Button>
              </div>
            )}
            {!geoPermissionError && !hasCachedLocation && geoPermissionState === "prompt" && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs text-slate-600">
                <span>Comparte tu ubicación para ordenar las paradas por cercanía.</span>
                <Button size="sm" variant="ghost" className="rounded-full px-3" onClick={requestUserLocation}>
                  Solicitar acceso
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-auto">
                <Select onValueChange={handleDistanceFilterChange}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white/90 shadow-sm sm:w-[190px]">
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
              <Button
                onClick={() => setShowAllStations(true)}
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-slate-200 bg-white/90 px-4"
              >
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
