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
      <li ref={ref} className="border rounded p-3 bg-amber-50/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold flex items-center gap-2 text-sm">
              <span>{stop.name}</span>
              <span className="text-yellow-500" aria-label="Parada favorita">
                ★
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              {directionInfo ? (
                <>
                  <span className={directionInfo.isClose ? "text-green-600 font-bold" : undefined}>
                    {directionInfo.isClose ? "🚶 " : ""}
                    {formatDistanceLabel(directionInfo)}
                  </span>
                  <DirectionIndicator info={directionInfo} variant="compact" />
                </>
              ) : (
                stop.ubica
              )}
            </div>
            {isVisible && (
              <BusArrivalInfo stopId={stop.stopId} directions={directions} variant="compact" />
            )}
          </div>
          <div className="flex items-center gap-2">
            
            <Button
              onClick={() => onToggleFavorite(stop.stopId)}
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
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
    <li ref={ref} className="border rounded p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold flex items-center space-x-2">
          <span>{stop.name}</span>
          {isFavorite && <span className="text-yellow-500" aria-label="Parada favorita">★</span>}
        </span>
        <Button
          onClick={() => onToggleFavorite(stop.stopId)}
          variant={isFavorite ? "default" : "outline"}
          size="sm"
        >
          {isFavorite ? "★ En favoritos" : "☆ Añadir a favoritos"}
        </Button>
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
  const textSize = variant === "compact" ? "text-xs" : "text-sm"

  if (info.headingAvailable && info.relative != null) {
    const directionLabel = info.isStraight
      ? "прямо"
      : `${info.relative > 0 ? "вправо" : "влево"} ${Math.abs(info.relative).toFixed(0)}°`

    return (
      <div className={`flex items-center gap-2 ${textSize} text-slate-600`}>
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-base"
          style={{ transform: `rotate(${info.relative}deg)` }}
          aria-label={directionLabel}
        >
          ↑
        </span>
        <span className={info.isStraight ? "text-green-600 font-semibold" : undefined}>{directionLabel}</span>
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
