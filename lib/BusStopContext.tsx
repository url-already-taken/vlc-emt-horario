"use client"

import { createContext, useContext, useState, useEffect, useMemo } from "react"
import { fetchBusStops } from "./busStopService"
import { distanceKm } from "./geoUtils"
import { BusStop } from "./busStopTypes"

interface Location {
  latitude: number
  longitude: number
}

interface BusStopContextType {
  stops: BusStop[]
  loading: boolean
  error: string | null
  userLocation: Location | null
  setUserLocation: (location: Location) => void
  filteredStops: BusStop[]
  setDistanceFilter: (distance: number) => void
  nearestStops: BusStop[]   // <--- добавляем сюда
}

const BusStopContext = createContext<BusStopContextType | undefined>(undefined)

export function BusStopProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStops] = useState<BusStop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<Location | null>(null)
  const [distanceFilter, setDistanceFilter] = useState<number>(Number.POSITIVE_INFINITY)

  useEffect(() => {
    const loadStops = async () => {
      try {
        const apiUrl =
          "https://geoportal.emtvalencia.es/opentripplanner-api-webapp/ws/metadata/stopsInExtent?lowerCornerLon=-0.4187679290778661&lowerCornerLat=39.431221084842264&upperCornerLon=-0.33207893371653785&upperCornerLat=39.51099400566781"
        const fetchedStops = await fetchBusStops(apiUrl)
        setStops(fetchedStops)
      } catch (err) {
        setError("Failed to load bus stops")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadStops()
  }, [])

  // фильтрованные остановки по distanceFilter
  const filteredStops = useMemo(() => {
    if (!userLocation) return stops
    return stops.filter((stop) => {
      const dist = distanceKm(userLocation.latitude, userLocation.longitude, stop.lat, stop.lon)
      return dist <= distanceFilter
    })
  }, [stops, userLocation, distanceFilter])

  // ближайшие 5
  const nearestStops = useMemo(() => {
    if (!userLocation) return []
    return filteredStops
      .slice()
      .sort((a, b) => {
        const distA = distanceKm(userLocation.latitude, userLocation.longitude, a.lat, a.lon)
        const distB = distanceKm(userLocation.latitude, userLocation.longitude, b.lat, b.lon)
        return distA - distB
      })
      .slice(0, 5)
  }, [filteredStops, userLocation])

  return (
    <BusStopContext.Provider
      value={{
        stops,
        loading,
        error,
        userLocation,
        setUserLocation,
        filteredStops,
        setDistanceFilter,
        nearestStops
      }}
    >
      {children}
    </BusStopContext.Provider>
  )
}

export function useBusStops() {
  const context = useContext(BusStopContext)
  if (!context) {
    throw new Error("useBusStops must be used within a BusStopProvider")
  }
  return context
}
