import type React from "react"
import { createContext, useContext, useState, useEffect, useMemo } from "react"
import { fetchBusStops, type BusStop } from "./busStopService"

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
  nearestStops: BusStop[]
}

const BusStopContext = createContext<BusStopContextType | undefined>(undefined)

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c // Distance in km
  return d
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

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

  const filteredStops = userLocation
    ? stops.filter((stop) => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          Number.parseFloat(stop.lat),
          Number.parseFloat(stop.lon),
        )
        return distance <= distanceFilter
      })
    : stops

  const nearestStops = useMemo(() => {
      if (!userLocation || !filteredStops.length) return [];
      
      return filteredStops
        .slice()
        .sort((a, b) => {
          const distA = calculateDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
          const distB = calculateDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
          return distA - distB;
        })
        .slice(0, 5);
    }, [filteredStops, userLocation]);

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
      }}
    >
      {children}
    </BusStopContext.Provider>
  )
}

export function useBusStops() {
  const context = useContext(BusStopContext)
  if (context === undefined) {
    throw new Error("useBusStops must be used within a BusStopProvider")
  }
  return context
}

