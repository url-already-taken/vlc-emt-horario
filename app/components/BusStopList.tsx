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
        <section className="overflow-hidden rounded-lg border-2 border-slate-950 bg-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.9)] dark:border-white dark:bg-slate-950 dark:shadow-black/40">
          <div className="grid grid-cols-[minmax(0,1fr)_3rem] items-stretch border-b-2 border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950">
            <h3 className="flex min-h-9 items-center px-3 text-[11px] font-black uppercase tracking-[0.22em]">
              Favoritas
            </h3>
            <span className="flex min-h-9 items-center justify-center border-l-2 border-white text-sm font-black tabular-nums dark:border-slate-950">
              {favoriteList.length}
            </span>
          </div>
          <ul>
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
