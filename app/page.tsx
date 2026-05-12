"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { filterStopsByQuery } from "../lib/busStopService"
import { LocateFixed } from "lucide-react"

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
  const [distanceFilterValue, setDistanceFilterValue] = useState("Infinity")
  const [, setGeoPermissionState] = useState<PermissionState | "unknown">("unknown")
  const [geoPermissionError, setGeoPermissionError] = useState<string | null>(null)
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [cachedLocationSavedAt, setCachedLocationSavedAt] = useState<number | null>(null)
  const { stops, filteredStops, setUserLocation, setDistanceFilter, loading, error, userLocation } = useBusStops()
  const hasCachedLocation = cachedLocationSavedAt !== null
  const cachedLocationTime = formatLocationTimestamp(cachedLocationSavedAt)
  const visibleStops = useMemo(() => filterStopsByQuery(filteredStops, searchQuery), [filteredStops, searchQuery])
  const hasActiveFilters = Boolean(searchQuery.trim()) || distanceFilterValue !== "Infinity"
  const locationButtonLabel = isRequestingLocation
    ? "Actualizando..."
    : userLocation || hasCachedLocation
      ? "Actualizar ubicación"
      : "Usar mi ubicación"

  const requestUserLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoPermissionError("Tu navegador no soporta geolocalización.")
      setIsRequestingLocation(false)
      return
    }

    setGeoPermissionError(null)
    setIsRequestingLocation(true)
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
        setIsRequestingLocation(false)
        persistGeoPermissionState("granted")
        persistStoredLocation(nextLocation, savedAt)
      },
      (geoError) => {
        console.error("Error getting user location:", geoError)
        setIsRequestingLocation(false)
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

  const handleCompassToggle = useCallback((nextState: boolean) => {
    setShowCompassOverlay(nextState)
  }, [])

  const handleCompassClose = useCallback(() => {
    setShowCompassOverlay(false)
  }, [])

  const handleDistanceFilterChange = (value: string) => {
    setDistanceFilterValue(value)
    setDistanceFilter(Number.parseFloat(value))
  }

  const handleResetFilters = useCallback(() => {
    setSearchQuery("")
    setDistanceFilterValue("Infinity")
    setDistanceFilter(Number.POSITIVE_INFINITY)
  }, [setDistanceFilter])

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl overflow-x-hidden px-4 py-4 sm:py-6">
      {showCompassOverlay && (
        <CompassOverlay
          onClose={handleCompassClose}
          onOpenStop={setSelectedStop}
        />
      )}
      {showAllStations ? (
        <>
          <Button onClick={() => setShowAllStations(false)} variant="outline" className="mb-4 rounded-xl bg-white/90">
            Volver a paradas cercanas
          </Button>
          <AllStations />
        </>
      ) : (
        <>
          <section className="mb-4 rounded-lg border border-white/80 bg-white/85 p-3 shadow-sm shadow-slate-200/50 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:shadow-black/30 sm:p-4">
            <SearchBar query={searchQuery} onQueryChange={handleQueryChange} onSearch={handleSearch} />
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="rounded-full border border-slate-200 bg-slate-50/90 px-3 py-1 font-medium text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                {visibleStops.length} visibles
                {filteredStops.length !== stops.length ? ` de ${filteredStops.length} cercanas` : ` de ${stops.length} total`}
              </span>
              {searchQuery.trim() && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs text-slate-600 dark:text-slate-300 dark:hover:bg-white/10"
                  onClick={() => setSearchQuery("")}
                >
                  Borrar búsqueda
                </Button>
              )}
              {distanceFilterValue !== "Infinity" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs text-slate-600 dark:text-slate-300 dark:hover:bg-white/10"
                  onClick={() => handleDistanceFilterChange("Infinity")}
                >
                  Quitar radio
                </Button>
              )}
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs text-slate-600 dark:text-slate-300 dark:hover:bg-white/10"
                  onClick={handleResetFilters}
                >
                  Resetear filtros
                </Button>
              )}
            </div>
            {geoPermissionError && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">
                <span>{geoPermissionError}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-auto">
                <Select value={distanceFilterValue} onValueChange={handleDistanceFilterChange}>
                  <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 sm:w-[190px]">
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
              <Button
                onClick={requestUserLocation}
                disabled={isRequestingLocation}
                size="sm"
                className="h-12 w-full rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-300/60 hover:bg-cyan-400 disabled:opacity-80 dark:bg-cyan-300 dark:text-slate-950 dark:shadow-cyan-300/20 dark:hover:bg-cyan-200 sm:w-auto"
              >
                <LocateFixed className={`h-5 w-5 ${isRequestingLocation ? "animate-pulse" : ""}`} />
                <span>{locationButtonLabel}</span>
                {cachedLocationTime && !isRequestingLocation && (
                  <span className="hidden text-xs font-medium opacity-80 md:inline">{cachedLocationTime}</span>
                )}
              </Button>
              <StopCompass
                isActive={showCompassOverlay}
                onToggle={handleCompassToggle}
              />
              <Button
                onClick={() => setShowAllStations(true)}
                variant="outline"
                size="sm"
                className="h-10 rounded-lg border-slate-200 bg-white/90 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Ver todas
              </Button>
            </div>
          </section>

          {loading && <div className="mt-4">Cargando paradas...</div>}
          {error && !loading && <div className="mt-4 text-red-600">{error}</div>}
          {!loading && !error && (
            <>
              <BusStopList sortBy={sortBy} onSelectStop={setSelectedStop} searchQuery={searchQuery} />
              {selectedStop && (
                <BusStopDetail
                  stop={selectedStop}
                  onClose={() => setSelectedStop(null)}
                  userLocation={userLocation}
                />
              )}
            </>
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
