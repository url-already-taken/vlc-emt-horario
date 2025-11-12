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

  const favoriteList = sortedStops.filter((stop) => favoriteStops[stop.stopId])
  const regularList = sortedStops.filter((stop) => !favoriteStops[stop.stopId])

  return (
    <div className="space-y-6">
      {favoriteList.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Избранные остановки</h3>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteList.map((stop) => (
              <BusStopItem
                key={`fav-${stop.stopId}`}
                stop={stop}
                sortBy={sortBy}
                onSelectStop={onSelectStop}
                userLocation={userLocation}
                isFavorite
                compact
                onToggleFavorite={handleToggleFavorite}
                directions={routeDirections[stop.stopId]}
              />
            ))}
          </ul>
        </section>
      )}
      <section>
        <ul className="space-y-4">
          {regularList.length > 0 ? (
            regularList.map((stop) => (
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
            favoriteList.length === 0 && <li>No bus stops available</li>
          )}
        </ul>
      </section>
    </div>
  )
}
