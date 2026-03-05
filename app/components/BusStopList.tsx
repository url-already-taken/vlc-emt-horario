"use client"
import { useState, useEffect, useMemo } from "react"
import BusStopItem from "./BusStopItem"
import { useBusStops } from "../../lib/BusStopContext"
import { calculateDistance } from "../../lib/geoUtils"
import type { BusStop } from "../../lib/busStopTypes"

const FAVORITES_STORAGE_KEY = "bus-stop-favorites"

const safeFavoritesStorage = {
  read() {
    if (typeof window === "undefined") return null
    try {
      return window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    } catch (err) {
      console.warn("No se pudo leer favoritos almacenados:", err)
      return null
    }
  },
  write(value: string) {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, value)
    } catch (err) {
      console.warn("No se pudo guardar favoritos:", err)
    }
  },
}

interface BusStopListProps {
  sortBy: "nearest" | "soonest"
  onSelectStop: (stop: BusStop) => void
  searchQuery: string
}

export default function BusStopList({ sortBy, onSelectStop, searchQuery }: BusStopListProps) {
  const { filteredStops, loading, error, userLocation, routeDirections, heading } = useBusStops()
  const [favoriteStops, setFavoriteStops] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = safeFavoritesStorage.read()
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
      safeFavoritesStorage.write(JSON.stringify(updated))
      return updated
    })
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const searchFilteredStops = useMemo(() => {
    if (!normalizedQuery) return filteredStops
    return filteredStops.filter((stop) => {
      const nameMatch = stop.name?.toLowerCase().includes(normalizedQuery)
      const codeMatch = stop.stopId?.toLowerCase().includes(normalizedQuery)
      const areaMatch = stop.ubica?.toLowerCase().includes(normalizedQuery)
      return Boolean(nameMatch || codeMatch || areaMatch)
    })
  }, [filteredStops, normalizedQuery])

  const sortedStops = useMemo(() => {
    if (!searchFilteredStops.length) return []
    if (sortBy !== "nearest" || !userLocation) return searchFilteredStops
    return [...searchFilteredStops].sort((a, b) => {
      const distanceA = calculateDistance(userLocation.latitude, userLocation.longitude, a.lat, a.lon)
      const distanceB = calculateDistance(userLocation.latitude, userLocation.longitude, b.lat, b.lon)
      return distanceA - distanceB
    })
  }, [searchFilteredStops, sortBy, userLocation])

  if (loading) return <div>Cargando paradas...</div>
  if (error) return <div>Error: {error}</div>

  const favoriteList = sortedStops.filter((stop) => favoriteStops[stop.stopId])
  const regularList = sortedStops.filter((stop) => !favoriteStops[stop.stopId])
  const noMatches = Boolean(normalizedQuery && favoriteList.length === 0 && regularList.length === 0)

  return (
    <div className="space-y-6">
      {favoriteList.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Paradas favoritas ({favoriteList.length})
          </h3>
          <ul className="grid grid-cols-2 lg:grid-cols-3 gap-2">
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
                heading={heading}
              />
            ))}
          </ul>
        </section>
      )}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Paradas cercanas ({regularList.length})
        </h3>
        <ul className="space-y-3">
          {regularList.length > 0 &&
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
                heading={heading}
              />
            ))}
          {noMatches && (
            <li className="text-sm text-slate-500">
              No encontramos paradas que coincidan con "{searchQuery}".
            </li>
          )}
          {!noMatches && regularList.length === 0 && favoriteList.length === 0 && (
            <li>No hay paradas disponibles</li>
          )}
        </ul>
      </section>
    </div>
  )
}
