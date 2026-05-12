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
    <div className="space-y-4">
      {favoriteList.length > 0 && (
        <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/95 via-white/90 to-orange-50/80 p-2 shadow-[0_16px_45px_-28px_rgba(245,158,11,0.8)] ring-1 ring-amber-100/80 backdrop-blur dark:border-amber-300/25 dark:from-amber-300/15 dark:via-slate-950/85 dark:to-orange-400/10 dark:shadow-[0_18px_55px_-32px_rgba(251,191,36,0.55)] dark:ring-amber-300/20">
          <div className="mb-1.5 flex items-center justify-between gap-3 px-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">
              Favoritas
            </h3>
            <span className="rounded-full border border-amber-200/80 bg-amber-100/80 px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow-sm shadow-amber-200/40 dark:border-amber-300/25 dark:bg-amber-300/15 dark:text-amber-100 dark:shadow-black/20">
              {favoriteList.length}
            </span>
          </div>
          <ul className="divide-y divide-amber-200/70 dark:divide-amber-300/15">
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
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
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
            <li className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-slate-950/50 dark:text-slate-400">
              No encontramos paradas que coincidan con "{searchQuery}".
            </li>
          )}
          {!noMatches && regularList.length === 0 && favoriteList.length === 0 && (
            <li className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-slate-950/50 dark:text-slate-400">
              No hay paradas disponibles
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
