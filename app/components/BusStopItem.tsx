"use client"
import { useState, useEffect, useRef } from "react"
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
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onSelectStop(stop)} className="min-w-0 flex-1 text-left">
            <div className="truncate text-[13px] font-semibold leading-4 text-slate-900">{stopLabel}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] leading-3 text-slate-500">
              <span className="font-medium text-slate-700">#{stop.stopId}</span>
              <span className="text-slate-300">•</span>
              <span className="truncate">{distanceSummary}</span>
            </div>
          </button>
          {isVisible && <BusArrivalInfo stopId={stop.stopId} directions={directions} variant="favorite" />}
          <Button
            type="button"
            onClick={() => onToggleFavorite(stop.stopId)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 shrink-0 rounded-full px-0 text-[11px] text-slate-400 hover:bg-white/80 hover:text-slate-700"
            aria-label="Eliminar de favoritos"
          >
            ✕
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
      className="group rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => onSelectStop(stop)} className="min-w-0 text-left">
            <span className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="truncate">{stopLabel}</span>
              {isFavorite && (
                <span
                  className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                  aria-label="Parada favorita"
                >
                  ★
                </span>
              )}
            </span>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">#{stop.stopId}</span>
            <span className="truncate">{stop.ubica}</span>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => onToggleFavorite(stop.stopId)}
          variant={isFavorite ? "default" : "outline"}
          size="sm"
          className={
            isFavorite
              ? "shrink-0 rounded-full bg-slate-900 px-3 text-xs"
              : "shrink-0 rounded-full border-slate-200 bg-white/90 px-3 text-xs text-slate-600"
          }
        >
          {isFavorite ? "★ Guardada" : "☆ Favorita"}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => setShowMap((prev) => !prev)}
          variant="outline"
          size="sm"
          className="rounded-full border-slate-200 bg-white/90 px-3 text-xs text-slate-600"
        >
          {showMap ? "Ocultar mapa" : "Mostrar mapa"}
        </Button>

        <Button
          type="button"
          onClick={() => onSelectStop(stop)}
          variant="ghost"
          size="sm"
          className="rounded-full px-3 text-xs text-slate-600"
        >
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
                ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
            }
          >
            {isClose ? "Muy cerca" : "Distancia"}: {distanceSummary}
          </span>
        </div>
      )}

      {isVisible && (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
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
  if (name.includes(" - ")) {
    return name.split(" - ")[1]
  }
  return name
}

function formatDistanceSummary(userLat: number, userLon: number, stopLat: number, stopLon: number): string {
  const distanceKm = calculateDistance(userLat, userLon, stopLat, stopLon)
  const distanceM = distanceKm * 1000

  return distanceM < 1000 ? `~${distanceM.toFixed(0)} m` : `~${distanceKm.toFixed(2)} km`
}
