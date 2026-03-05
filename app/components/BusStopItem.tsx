"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import BusArrivalInfo from "./BusArrivalInfo"
import type { BusStop, RouteDirectionInfo } from "../../lib/busStopTypes"
import {
  bearingToCompassLabel,
  calculateDistance,
  getBearing,
  shortestAngleDiff,
} from "../../lib/geoUtils"

interface BusStopItemProps {
  stop: BusStop
  sortBy: "nearest" | "soonest"
  onSelectStop: (stop: BusStop) => void
  userLocation: { latitude: number; longitude: number } | null
  isFavorite: boolean
  onToggleFavorite: (stopId: string) => void
  directions?: RouteDirectionInfo[]
  compact?: boolean
  heading?: number | null
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
  heading = null,
}: BusStopItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLLIElement>(null)
  const routeLabels = Array.from(new Set(stop.routes.map((route) => route.SN).filter(Boolean)))
  const visibleRouteLabels = routeLabels.slice(0, 4)
  const hiddenRouteCount = Math.max(routeLabels.length - visibleRouteLabels.length, 0)

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

  const directionInfo =
    userLocation != null
      ? buildDirectionInfo({
          userLat: userLocation.latitude,
          userLon: userLocation.longitude,
          stopLat: stop.lat,
          stopLon: stop.lon,
          heading,
        })
      : null
  const fallbackText =
    sortBy === "nearest"
      ? "Activa tu ubicación para calcular la distancia."
      : "Próximo bus: por confirmar"

  if (compact) {
    return (
      <li ref={ref} className="border border-amber-200/70 rounded-md p-2 bg-amber-50/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium flex items-center gap-1 text-xs leading-tight">
              <span className="truncate">{stop.name}</span>
              <span className="text-amber-500" aria-label="Parada favorita">
                ★
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">#{stop.stopId}</div>
            <div className="text-xs text-gray-600 space-y-1 mt-1">
              {directionInfo ? (
                <>
                  <span className={directionInfo.isClose ? "text-green-600 font-bold" : undefined}>
                    {directionInfo.isClose ? "🚶 " : ""}
                    {formatDistanceLabel(directionInfo)}
                  </span>
                  <DirectionIndicator info={directionInfo} variant="compact" />
                </>
              ) : (
                <span className="block break-words leading-tight">{stop.ubica}</span>
              )}
            </div>
            {isVisible && (
              <BusArrivalInfo stopId={stop.stopId} directions={directions} variant="compact" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => onToggleFavorite(stop.stopId)}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              aria-label="Eliminar de favoritos"
            >
              ✕
            </Button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li
      ref={ref}
      className="group border border-slate-200 rounded-lg p-3.5 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="min-w-0">
          <span className="font-semibold flex items-center gap-2">
            <span className="truncate">{stop.name}</span>
            {isFavorite && <span className="text-amber-500" aria-label="Parada favorita">★</span>}
          </span>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 min-w-0">
            <span className="font-medium shrink-0">#{stop.stopId}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
            <span className="truncate">{stop.ubica}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            onClick={() => onSelectStop(stop)}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
          >
            Info
          </Button>
          <Button
            onClick={() => onToggleFavorite(stop.stopId)}
            variant={isFavorite ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 text-base"
            aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            {isFavorite ? "★" : "☆"}
          </Button>
        </div>
      </div>
      <div className="text-sm text-gray-600 mb-2">
        {directionInfo ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className={directionInfo.isClose ? "text-green-600 font-bold" : undefined}>
              {directionInfo.isClose ? "🚶 " : ""}
              {formatDistanceLabel(directionInfo)}
            </span>
            <DirectionIndicator info={directionInfo} />
          </div>
        ) : (
          fallbackText
        )}
      </div>
      {visibleRouteLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {visibleRouteLabels.map((line) => (
            <span
              key={`${stop.stopId}-${line}`}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600"
            >
              L{line}
            </span>
          ))}
          {hiddenRouteCount > 0 && (
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
              +{hiddenRouteCount}
            </span>
          )}
        </div>
      )}
      {isVisible && <BusArrivalInfo stopId={stop.stopId} directions={directions} />}
    </li>
  )
}

interface DirectionInfo {
  distanceKm: number
  distanceM: number
  isClose: boolean
  bearing: number
  compassLabel: string
  headingAvailable: boolean
  relative: number | null
  isStraight: boolean
}

const COMPASS_ARROW_MAP: Record<string, string> = {
  N: "↑",
  NE: "↗",
  E: "→",
  SE: "↘",
  S: "↓",
  SO: "↙",
  O: "←",
  NO: "↖",
}

function buildDirectionInfo({
  userLat,
  userLon,
  stopLat,
  stopLon,
  heading,
}: {
  userLat: number
  userLon: number
  stopLat: number
  stopLon: number
  heading: number | null
}): DirectionInfo {
  const distanceKm = calculateDistance(userLat, userLon, stopLat, stopLon)
  const distanceM = distanceKm * 1000
  const bearing = getBearing(userLat, userLon, stopLat, stopLon)
  const compassLabel = bearingToCompassLabel(bearing)
  const headingAvailable = typeof heading === "number" && Number.isFinite(heading)
  const relative = headingAvailable ? shortestAngleDiff(heading!, bearing) : null
  const isStraight = relative != null && Math.abs(relative) <= 15

  return {
    distanceKm,
    distanceM,
    isClose: distanceM <= 150,
    bearing,
    compassLabel,
    headingAvailable,
    relative,
    isStraight,
  }
}

function formatDistanceLabel(info: DirectionInfo): string {
  return info.distanceM < 1000
    ? `~${info.distanceM.toFixed(0)} m`
    : `~${info.distanceKm.toFixed(2)} km`
}

function DirectionIndicator({
  info,
  variant = "regular",
}: {
  info: DirectionInfo
  variant?: "regular" | "compact"
}) {
  const isCompact = variant === "compact"
  const textSize = isCompact ? "text-xs" : "text-sm"

  if (info.headingAvailable && info.relative != null) {
    const directionLabel = info.isStraight
      ? "прямо"
      : `${info.relative > 0 ? "вправо" : "влево"} ${Math.abs(info.relative).toFixed(0)}°`

    return (
      <div className={`flex items-center ${isCompact ? "flex-wrap gap-1" : "gap-2"} ${textSize} text-slate-600 min-w-0`}>
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-base"
          style={{ transform: `rotate(${info.relative}deg)` }}
          aria-label={directionLabel}
        >
          ↑
        </span>
        <span className={`${isCompact ? "break-words" : ""} ${info.isStraight ? "text-green-600 font-semibold" : ""}`}>
          {directionLabel}
        </span>
      </div>
    )
  }

  const compassArrow = COMPASS_ARROW_MAP[info.compassLabel] ?? "↑"

  return (
    <div className={`flex items-center gap-1 ${textSize} text-slate-600`}>
      <span aria-hidden="true">{compassArrow}</span>
      <span>{info.compassLabel}</span>
    </div>
  )
}
