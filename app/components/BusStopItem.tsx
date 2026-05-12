"use client"
import { useState, useEffect, useRef } from "react"
import { Info, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import BusArrivalInfo from "./BusArrivalInfo"
import type { BusStop, RouteDirectionInfo } from "../../lib/busStopTypes"

interface BusStopItemProps {
  stop: BusStop
  sortBy: "nearest" | "soonest"
  onSelectStop: (stop: BusStop) => void
  userLocation: { latitude: number; longitude: number } | null
  isFavorite: boolean
  onToggleFavorite: (stopId: string) => void
  directions?: RouteDirectionInfo[]
  compact?: boolean
}

export default function BusStopItem({
  stop,
  sortBy,
  onSelectStop,
  userLocation,
  isFavorite,
  onToggleFavorite,
  directions = [],
  compact = false,
}: BusStopItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLLIElement>(null)
  const stopLabel = formatStopName(stop.name)
  const favoriteStopLabel = formatFavoriteStopName(stop.name)
  const distanceSummary =
    sortBy === "nearest" && userLocation
      ? formatDistanceSummary(userLocation.latitude, userLocation.longitude, stop.lat, stop.lon)
      : stop.ubica

  const handleToggleFavorite = () => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50)
    }

    onToggleFavorite(stop.stopId)
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      },
    )
    if (ref.current) {
      observer.observe(ref.current)
    }
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [])

  if (compact) {
    return (
      <li ref={ref} className="border-t border-slate-950/20 first:border-t-0 dark:border-white/15">
        <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_9.75rem_2.5rem] items-stretch bg-white text-slate-950 transition-colors hover:bg-slate-100 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900 sm:grid-cols-[minmax(0,1fr)_12rem_2.75rem]">
          <button
            type="button"
            onClick={() => onSelectStop(stop)}
            className="flex min-w-0 items-center border-r border-slate-950/20 px-3 py-3 text-left dark:border-white/15"
          >
            <span className="truncate text-base font-black leading-5 text-slate-950 dark:text-white sm:text-lg">
              {favoriteStopLabel}
            </span>
          </button>
          <div className="min-w-0 border-r border-slate-950/20 dark:border-white/15">
            {isVisible ? (
              <BusArrivalInfo stopId={stop.stopId} directions={directions} variant="favorite" />
            ) : (
              <div className="flex h-full min-h-16 items-center justify-center bg-slate-100 px-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                --
              </div>
            )}
          </div>
          <Button
            type="button"
            onClick={handleToggleFavorite}
            variant="ghost"
            size="sm"
            className="h-full min-h-16 w-full shrink-0 rounded-none px-0 text-slate-500 transition-transform hover:bg-red-600 hover:text-white active:scale-95 dark:text-slate-300 dark:hover:bg-red-500 dark:hover:text-white"
            aria-label="Eliminar de favoritos"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </li>
    )
  }

  const distanceKmValue =
    sortBy === "nearest" && userLocation
      ? calculateDistance(userLocation.latitude, userLocation.longitude, stop.lat, stop.lon)
      : null
  const distanceMeters = distanceKmValue !== null ? distanceKmValue * 1000 : null
  const isClose = distanceMeters !== null && distanceMeters <= 150

  return (
    <li
      ref={ref}
      className="group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/70 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/30 dark:hover:border-white/15 dark:hover:shadow-black/40"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-15 dark:opacity-20 bg-cover bg-center rounded-[28px]"
        style={{ backgroundImage: `url('/api/mini-map?lat=${stop.lat}&lon=${stop.lon}&side=1000&px=600')` }}
      />
      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => onSelectStop(stop)} className="min-w-0 text-left">
              <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <span className="truncate">{stopLabel}</span>
                {isFavorite && (
                  <span
                    className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200"
                    aria-label="Parada favorita"
                  >
                    <Star className="h-3 w-3 fill-current" />
                  </span>
                )}
              </span>
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded-full border border-slate-200 bg-slate-50/90 px-2 py-0.5 font-medium text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                #{stop.stopId}
              </span>
              <span className="truncate">{stop.ubica}</span>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleToggleFavorite}
            variant={isFavorite ? "default" : "outline"}
            size="sm"
            className={
              isFavorite
                ? "shrink-0 rounded-full bg-slate-950 px-3 text-xs text-white shadow-sm shadow-slate-900/20 transition-transform hover:bg-slate-800 active:scale-90 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                : "shrink-0 rounded-full border-slate-200 bg-white/90 px-3 text-xs text-slate-600 shadow-sm transition-transform hover:bg-slate-50 active:scale-90 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-white/10"
            }
          >
            <Star className={isFavorite ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
            {isFavorite ? "Guardada" : "Favorita"}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => onSelectStop(stop)}
            variant="ghost"
            size="sm"
            className="rounded-full px-3 text-xs text-slate-600 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Info className="h-3.5 w-3.5" />
            Detalles
          </Button>
        </div>

        {distanceMeters !== null && (
          <div className="mt-3">
            <span
              className={
                isClose
                  ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200"
                  : "inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
              }
            >
              {isClose ? "Muy cerca" : "Distancia"}: {distanceSummary}
            </span>
          </div>
        )}

        {isVisible && (
          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
            <BusArrivalInfo stopId={stop.stopId} directions={directions} />
          </div>
        )}
      </div>
    </li>
  )
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

function formatStopName(name: string): string {
  return name.trim()
}

function formatFavoriteStopName(name: string): string {
  const trimmed = formatStopName(name)
  const hyphenIndex = trimmed.indexOf("-")

  if (hyphenIndex === -1) {
    return trimmed
  }

  return trimmed.slice(hyphenIndex + 1).trim() || trimmed
}

function formatDistanceSummary(userLat: number, userLon: number, stopLat: number, stopLon: number): string {
  const distanceKm = calculateDistance(userLat, userLon, stopLat, stopLon)
  const distanceM = distanceKm * 1000

  return distanceM < 1000 ? `~${distanceM.toFixed(0)} m` : `~${distanceKm.toFixed(2)} km`
}
