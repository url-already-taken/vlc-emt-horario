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

const GEO_PERMISSION_STORAGE_KEY = "paradaya:geo-permission-granted"

function HomeContent() {
  const [sortBy, setSortBy] = useState<"nearest" | "soonest">("nearest")
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
        window.localStorage.setItem(GEO_PERMISSION_STORAGE_KEY, "true")
      },
      (geoError) => {
        console.error("Error getting user location:", geoError)
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setGeoPermissionState("denied")
          window.localStorage.removeItem(GEO_PERMISSION_STORAGE_KEY)
          setGeoPermissionError("Activa los permisos de ubicación en el navegador para usar esta función.")
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
    const storedGrant = window.localStorage.getItem(GEO_PERMISSION_STORAGE_KEY) === "true"

    const handlePermissionChange = () => {
      if (!permissionStatus) return
      setGeoPermissionState(permissionStatus.state)

      if (permissionStatus.state === "granted") {
        requestUserLocation()
      }

      if (permissionStatus.state === "denied") {
        window.localStorage.removeItem(GEO_PERMISSION_STORAGE_KEY)
      }
    }

    const initPermission = async () => {
      if (navigator.permissions?.query) {
        try {
          permissionStatus = await navigator.permissions.query({ name: "geolocation" })
          setGeoPermissionState(permissionStatus.state)

          if (permissionStatus.state === "granted") {
            requestUserLocation()
          }

          permissionStatus.addEventListener?.("change", handlePermissionChange)
          permissionStatus.onchange = handlePermissionChange
          return
        } catch (permError) {
          console.warn("No se pudo leer el estado de permisos de geolocalización:", permError)
        }
      }

      if (storedGrant) {
        setGeoPermissionState("granted")
        requestUserLocation()
      } else {
        setGeoPermissionState("prompt")
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
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ParadaYa</h1>
      {showCompassOverlay && <CompassOverlay />}
      {showAllStations ? (
        <> 
          <Button onClick={() => setShowAllStations(false)} className="mb-4">
            Volver a paradas cercanas
          </Button>
          <AllStations />
        </>
      ) : (
        <>
          <SearchBar query={searchQuery} onQueryChange={handleQueryChange} onSearch={handleSearch} />
          {geoPermissionError && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-red-600 -mt-2 mb-2">
              <span>{geoPermissionError}</span>
              <Button size="sm" variant="outline" onClick={requestUserLocation}>
                Intentar de nuevo
              </Button>
            </div>
          )}
          {!geoPermissionError && geoPermissionState === "prompt" && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 -mt-2 mb-2">
              <span>Comparte tu ubicación para ordenar las paradas por cercanía.</span>
              <Button size="sm" variant="ghost" onClick={requestUserLocation}>
                Solicitar acceso
              </Button>
            </div>
          )}
          <div className="flex justify-between items-center mb-4">
            <Select onValueChange={handleDistanceFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por distancia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.1">100 metros</SelectItem>
                <SelectItem value="0.5">500 metros</SelectItem>
                <SelectItem value="1">1 kilómetro</SelectItem>
                <SelectItem value="Infinity">Todas las paradas</SelectItem>
              </SelectContent>
            </Select>
            <StopCompass 
              isActive={showCompassOverlay} 
              onToggle={setShowCompassOverlay} 
            />
              <Button onClick={() => setShowAllStations(true)} className="mb-4">
              Ver todas
            </Button>
          </div>
          
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
