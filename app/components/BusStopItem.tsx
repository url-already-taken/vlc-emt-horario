"use client"
import { useState, useEffect, useRef } from "react"
import { Info, MapPinned, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import BusArrivalInfo from "./BusArrivalInfo"
import StopMiniMap from "./StopMiniMap"
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
  const [showMap, setShowMap] = useState(false)
  const ref = useRef<HTMLLIElement>(null)
  const stopLabel = formatStopName(stop.name)
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
      <li ref={ref} className="py-1.5 first:pt-0 last:pb-0">
        <div className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/70 dark:hover:bg-white/5">
          <button type="button" onClick={() => onSelectStop(stop)} className="min-w-0 flex-1 text-left">
            <div className="truncate text-[13px] font-semibold leading-4 text-slate-900 dark:text-slate-100">
              {stopLabel}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] leading-3 text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">#{stop.stopId}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="truncate">{distanceSummary}</span>
            </div>
          </button>
          {isVisible && <BusArrivalInfo stopId={stop.stopId} directions={directions} variant="favorite" />}
          <Button
            type="button"
            onClick={handleToggleFavorite}
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 rounded-full px-0 text-slate-400 transition-transform hover:bg-white/80 hover:text-slate-700 active:scale-90 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
            aria-label="Eliminar de favoritos"
          >
            <X className="h-3.5 w-3.5" />
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
      className="group rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/70 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/30 dark:hover:border-white/15 dark:hover:shadow-black/40"
    >
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
          onClick={() => setShowMap((prev) => !prev)}
          variant="outline"
          size="sm"
          className="rounded-full border-slate-200 bg-white/90 px-3 text-xs text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <MapPinned className="h-3.5 w-3.5" />
          {showMap ? "Ocultar mapa" : "Mostrar mapa"}
        </Button>

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

      {showMap && (
        <div className="mt-3">
          <StopMiniMap lat={stop.lat} lon={stop.lon} stopName={stopLabel} userLocation={userLocation} />
        </div>
      )}

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

function formatDistanceSummary(userLat: number, userLon: number, stopLat: number, stopLon: number): string {
  const distanceKm = calculateDistance(userLat, userLon, stopLat, stopLon)
  const distanceM = distanceKm * 1000

  return distanceM < 1000 ? `~${distanceM.toFixed(0)} m` : `~${distanceKm.toFixed(2)} km`
}
