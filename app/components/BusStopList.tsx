"use client"
import { useState, useEffect, useMemo } from "react"
import BusStopItem from "./BusStopItem"
import { useBusStops } from "../../lib/BusStopContext"
import { calculateDistance } from "../../lib/geoUtils"
import type { BusStop } from "../../lib/busStopTypes"

interface BusStopListProps {
  sortBy: "nearest" | "soonest"
  onSelectStop: (stop: BusStop) => void
}

export default function BusStopList({ sortBy, onSelectStop }: BusStopListProps) {
  const { filteredStops, loading, error, userLocation, routeDirections } = useBusStops()
  const [favoriteStops, setFavoriteStops] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem("bus-stop-favorites")
      if (stored) {
        setFavoriteStops(JSON.parse(stored))
      }
    } catch (err) {
      console.error("Error reading saved favorites:", err)
    }
  }, [])

  const handleToggleFavorite = (stopId: string) => {
    setFavoriteStops((prev) => {
      const updated = { ...prev }
      if (updated[stopId]) {
        delete updated[stopId]
      } else {
        updated[stopId] = true
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("bus-stop-favorites", JSON.stringify(updated))
      }
      return updated
    })
  }

  const sortedStops = useMemo(() => {
    if (!filteredStops.length) return []
    if (sortBy !== "nearest" || !userLocation) return filteredStops
    return [...filteredStops].sort((a, b) => {
      const distanceA = calculateDistance(userLocation.latitude, userLocation.longitude, a.lat, a.lon)
      const distanceB = calculateDistance(userLocation.latitude, userLocation.longitude, b.lat, b.lon)
      return distanceA - distanceB
    })
  }, [filteredStops, sortBy, userLocation])

  if (loading) return <div>Loading stations...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <ul className="space-y-4">
      {sortedStops.length > 0 ? (
        sortedStops.map((stop) => (
          <BusStopItem
            key={stop.stopId}
            stop={stop}
            sortBy={sortBy}
            onSelectStop={onSelectStop}
            userLocation={userLocation}
            isFavorite={Boolean(favoriteStops[stop.stopId])}
            onToggleFavorite={handleToggleFavorite}
            directions={routeDirections[stop.stopId]}
          />
        ))
      ) : (
        <li>No bus stops available</li>
      )}
    </ul>
  )
}
