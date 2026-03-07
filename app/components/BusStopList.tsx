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
  const { filteredStops, loading, error, userLocation, routeDirections } = useBusStops()
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
    <div className="space-y-5">
      {favoriteList.length > 0 && (
        <section className="rounded-[26px] border border-amber-200/70 bg-amber-50/60 p-3 shadow-sm shadow-amber-100/50 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-amber-950">Paradas favoritas</h3>
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-amber-700">
              {favoriteList.length}
            </span>
          </div>
          <ul className="space-y-2.5">
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
        {favoriteList.length > 0 && (
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Paradas cercanas
          </div>
        )}
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
              />
            ))}
          {noMatches && (
            <li className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
              No encontramos paradas que coincidan con "{searchQuery}".
            </li>
          )}
          {!noMatches && regularList.length === 0 && favoriteList.length === 0 && (
            <li className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
              No hay paradas disponibles
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
