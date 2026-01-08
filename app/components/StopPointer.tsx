"use client"

import { useMemo } from "react"
import { bearingToCompassLabel, calculateDistance, getBearing, shortestAngleDiff } from "../../lib/geoUtils"

interface StopPointerProps {
  target: { lat: number; lon: number; name?: string }
  userLocation: { latitude: number; longitude: number } | null
  heading: number | null
}

export default function StopPointer({ target, userLocation, heading }: StopPointerProps) {
  const info = useMemo(() => {
    if (!userLocation) return null
    const distanceKm = calculateDistance(userLocation.latitude, userLocation.longitude, target.lat, target.lon)
    const distanceM = distanceKm * 1000
    const bearing = getBearing(userLocation.latitude, userLocation.longitude, target.lat, target.lon)
    const compassLabel = bearingToCompassLabel(bearing)
    const headingAvailable = typeof heading === "number" && Number.isFinite(heading)
    const relative = headingAvailable ? shortestAngleDiff(heading!, bearing) : null
    const isStraight = relative != null && Math.abs(relative) <= 10
    return {
      distanceKm,
      distanceM,
      bearing,
      compassLabel,
      headingAvailable,
      relative,
      isStraight,
    }
  }, [heading, target.lat, target.lon, userLocation])

  if (!userLocation) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Activa la geolocalización para navegar hasta esta parada.
      </div>
    )
  }

  if (!info) return null

  if (!info.headingAvailable || info.relative == null) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="text-sm text-slate-600">
          El compás no está activo. Usa la dirección desde el norte para orientarte.
        </div>
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-700">
          <span aria-hidden="true">{COMPASS_ARROW_MAP[info.compassLabel] ?? "↑"}</span>
          <span>{info.compassLabel}</span>
        </div>
        <div className="text-sm text-slate-500">Distancia aproximada: {formatDistance(info)}</div>
      </div>
    )
  }

  const directionLabel = info.isStraight
    ? "прямо"
    : `${info.relative > 0 ? "поверни вправо" : "поверни влево"} ${Math.abs(info.relative).toFixed(0)}°`

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 space-y-3">
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="text-xs uppercase tracking-wide text-emerald-600">Наведи телефон</span>
        <span
          className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-white text-4xl shadow"
          style={{ transform: `rotate(${info.relative}deg)` }}
          aria-label={directionLabel}
        >
          ▲
        </span>
        <span className={info.isStraight ? "text-lg font-semibold text-emerald-700" : "text-lg text-slate-700"}>
          {directionLabel}
        </span>
      </div>
      <div className="text-center text-sm text-slate-600">
        Дистанция: {formatDistance(info)} · Азимут: {info.bearing.toFixed(0)}°
      </div>
    </div>
  )
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

function formatDistance(info: { distanceM: number; distanceKm: number }) {
  return info.distanceM < 1000 ? `${info.distanceM.toFixed(0)} m` : `${info.distanceKm.toFixed(2)} km`
}
