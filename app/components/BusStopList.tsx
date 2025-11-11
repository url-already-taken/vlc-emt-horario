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
  const { filteredStops, loading, error, userLocation } = useBusStops()
  const [savedCharacters, setSavedCharacters] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchSavedCharacters = async () => {
      try {
        const response = await fetch("/api/save-character")
        if (!response.ok) {
          throw new Error("Failed to fetch saved characters")
        }
        const data = await response.json()
        setSavedCharacters(data)
      } catch (err) {
        console.error("Error fetching saved characters:", err)
      }
    }

    fetchSavedCharacters()
  }, [])

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
            savedCharacter={savedCharacters[stop.stopId]}
          />
        ))
      ) : (
        <li>No bus stops available</li>
      )}
    </ul>
  )
}
