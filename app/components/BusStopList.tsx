"use client"
import { useMemo } from "react"
import BusStopItem from "./BusStopItem"
import { useBusStops } from "../../lib/BusStopContext"
import { calculateDistance } from "../../lib/geoUtils"
import type { BusStop } from "../../lib/busStopTypes"
import { filterStopsByQuery } from "../../lib/busStopService"

interface BusStopListProps {
  sortBy: "nearest" | "soonest"
  onSelectStop: (stop: BusStop) => void
  searchQuery: string
}

export default function BusStopList({ sortBy, onSelectStop, searchQuery }: BusStopListProps) {
  const { filteredStops, loading, error, userLocation, routeDirections, favoriteStops, toggleFavoriteStop } =
    useBusStops()

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const searchFilteredStops = useMemo(() => filterStopsByQuery(filteredStops, normalizedQuery), [filteredStops, normalizedQuery])

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
        <section className="rounded-[24px] border border-amber-200/70 bg-amber-50/60 p-2.5 shadow-sm shadow-amber-100/40 sm:p-3">
          <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">Favoritas</h3>
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {favoriteList.length}
            </span>
          </div>
          <ul className="divide-y divide-amber-200/70">
            {favoriteList.map((stop) => (
              <BusStopItem
                key={`fav-${stop.stopId}`}
                stop={stop}
                sortBy={sortBy}
                onSelectStop={onSelectStop}
                userLocation={userLocation}
                isFavorite
                compact
                onToggleFavorite={toggleFavoriteStop}
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
                onToggleFavorite={toggleFavoriteStop}
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
