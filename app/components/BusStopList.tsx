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
        <section className="rounded-[28px] border border-white/80 bg-white/80 p-3 shadow-sm shadow-slate-200/50 backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/30">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Favoritas
            </h3>
            <span className="rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
              {favoriteList.length}
            </span>
          </div>
          <ul className="divide-y divide-slate-200/70 dark:divide-white/10">
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
