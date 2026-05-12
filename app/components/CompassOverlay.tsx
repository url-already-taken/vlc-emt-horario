"use client"

import { type ReactNode, useEffect, useMemo } from "react"
import { Compass, LocateFixed, MapPinned, Navigation, RefreshCw, Route, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBusStops } from "@/lib/BusStopContext"
import { useDeviceHeading } from "@/hooks/useDeviceHeading"
import BusArrivalInfo from "./BusArrivalInfo"
import {
  clamp,
  distanceKm,
  getBBoxAroundMeters,
  getBearing,
  normalizeDegrees,
  projectPointToSquare,
} from "@/lib/geoUtils"
import type { BusStop, RouteDirectionInfo } from "@/lib/busStopTypes"

const MAP_VIEWBOX = 1000
const MAP_IMAGE_SIZE = 720
const MAP_MIN_SIDE_METERS = 360
const MAP_MAX_SIDE_METERS = 900
const MAP_FALLBACK_SIDE_METERS = 480
const MAP_PADDING_MULTIPLIER = 2.5

const STOP_ACCENTS = [
  {
    fill: "#0f766e",
    stroke: "#14b8a6",
    dotClass: "bg-teal-500",
    badgeClass: "bg-teal-500 text-white",
    chipClass: "bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-300/10 dark:text-teal-100 dark:ring-teal-300/20",
  },
  {
    fill: "#1d4ed8",
    stroke: "#60a5fa",
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-500 text-white",
    chipClass: "bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-300/10 dark:text-blue-100 dark:ring-blue-300/20",
  },
  {
    fill: "#b45309",
    stroke: "#f59e0b",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-500 text-white",
    chipClass: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-300/10 dark:text-amber-100 dark:ring-amber-300/20",
  },
  {
    fill: "#be123c",
    stroke: "#fb7185",
    dotClass: "bg-rose-500",
    badgeClass: "bg-rose-500 text-white",
    chipClass: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-300/10 dark:text-rose-100 dark:ring-rose-300/20",
  },
  {
    fill: "#334155",
    stroke: "#94a3b8",
    dotClass: "bg-slate-500",
    badgeClass: "bg-slate-500 text-white",
    chipClass: "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-white/10 dark:text-slate-100 dark:ring-white/15",
  },
] as const

interface CompassOverlayProps {
  onClose: () => void
  onOpenStop?: (stop: BusStop) => void
  onRequestLocation?: () => void
  isRequestingLocation?: boolean
  locationUpdatedLabel?: string | null
}

interface StopSummary {
  rawStop: BusStop
  stopId: string
  name: string
  location: string
  distanceMeters: number
  absoluteBearing: number
  relativeLabel: string
  point: {
    x: number
    y: number
  }
  routeBadges: string[]
  directions: RouteDirectionInfo[]
}

export default function CompassOverlay({
  onClose,
  onOpenStop,
  onRequestLocation,
  isRequestingLocation = false,
  locationUpdatedLabel,
}: CompassOverlayProps) {
  const { nearestStops, routeDirections, userLocation, favoriteStops, toggleFavoriteStop } = useBusStops()
  const { heading, hasSignal, isSupported } = useDeviceHeading(true)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  const overlayData = useMemo(() => {
    if (!userLocation) return null

    const stopsWithMetrics = nearestStops.map((stop) => {
      const distanceMeters = distanceKm(userLocation.latitude, userLocation.longitude, stop.lat, stop.lon) * 1000
      const absoluteBearing = normalizeDegrees(getBearing(userLocation.latitude, userLocation.longitude, stop.lat, stop.lon))
      const relativeBearing = normalizeDegrees(absoluteBearing - heading)
      const uniqueRoutes = Array.from(
        new Map(
          (routeDirections[stop.stopId] ?? []).map((direction) => [
            direction.lineId,
            direction.lineShortName || direction.lineId,
          ]),
        ).values(),
      ).slice(0, 4)

      return {
        rawStop: stop,
        stopId: stop.stopId,
        name: formatStopName(stop.name),
        location: stop.ubica,
        distanceMeters,
        absoluteBearing,
        relativeLabel: relativeBearingToLabel(relativeBearing),
        lat: stop.lat,
        lon: stop.lon,
        routeBadges: uniqueRoutes,
      }
    })

    const farthestStopMeters = stopsWithMetrics.reduce((maxDistance, stop) => {
      return Math.max(maxDistance, stop.distanceMeters)
    }, 0)

    const mapSideMeters = clamp(
      Math.ceil(Math.max(MAP_FALLBACK_SIDE_METERS, farthestStopMeters * MAP_PADDING_MULTIPLIER) / 20) * 20,
      MAP_MIN_SIDE_METERS,
      MAP_MAX_SIDE_METERS,
    )

    const bbox = getBBoxAroundMeters(userLocation.latitude, userLocation.longitude, mapSideMeters / 2)

    const stopSummaries: StopSummary[] = stopsWithMetrics.map((stop) => {
      const projectedPoint = projectPointToSquare(stop.lat, stop.lon, bbox, MAP_VIEWBOX)

      return {
        rawStop: stop.rawStop,
        stopId: stop.stopId,
        name: stop.name,
        location: stop.location,
        distanceMeters: stop.distanceMeters,
        absoluteBearing: stop.absoluteBearing,
        relativeLabel: stop.relativeLabel,
        point: {
          x: clamp(projectedPoint.x, 72, MAP_VIEWBOX - 72),
          y: clamp(projectedPoint.y, 72, MAP_VIEWBOX - 72),
        },
        routeBadges: stop.routeBadges,
        directions: routeDirections[stop.stopId] ?? [],
      }
    })

    return {
      mapSideMeters,
      stopSummaries,
    }
  }, [heading, nearestStops, routeDirections, userLocation])

  const mapSrc = useMemo(() => {
    if (!userLocation || !overlayData) return ""

    const params = new URLSearchParams({
      lat: String(userLocation.latitude),
      lon: String(userLocation.longitude),
      side: String(overlayData.mapSideMeters),
      px: String(MAP_IMAGE_SIZE),
      center: "none",
    })

    return `/api/mini-map?${params.toString()}`
  }, [overlayData, userLocation])

  const headingLabel = hasSignal ? `${Math.round(heading)}° ${bearingToCompassLabel(heading)}` : "Calibrando"
  const sensorLabel = isSupported ? (hasSignal ? "Sensor activo" : "Buscando señal") : "Sin sensor"
  const stopSummaries = overlayData?.stopSummaries ?? []
  const locationActionLabel = isRequestingLocation
    ? "Actualizando..."
    : userLocation
      ? "Actualizar ubicación"
      : "Usar mi ubicación"

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md" onClick={onClose}>
      <div className="min-h-full p-3 sm:p-6">
        <section
          className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/75 bg-white/90 p-4 shadow-2xl shadow-slate-950/25 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/50 sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-3 top-3 z-20 h-11 w-11 rounded-full border-slate-200/80 bg-white/95 text-slate-700 shadow-lg shadow-slate-950/10 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-100 dark:shadow-black/35 dark:hover:bg-slate-800 sm:right-5 sm:top-5"
            onClick={onClose}
            aria-label="Cerrar brújula"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="grid gap-4 pr-12 sm:pr-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-white dark:text-slate-950">
                  <Compass className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Modo brújula</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50 sm:text-3xl">
                    Paradas cercanas con rumbo y tiempos
                  </h2>
                </div>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Vista compacta de las 5 paradas más próximas, orientada con el sensor del móvil y tiempos de llegada
                en cada tarjeta.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-slate-200/70 bg-slate-50/85 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06] lg:min-w-[20rem]">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <StatusChip icon={<Navigation className="h-3.5 w-3.5" />} label={headingLabel} />
                <StatusChip icon={<Compass className="h-3.5 w-3.5" />} label={sensorLabel} />
              </div>
              {onRequestLocation && (
                <LocationActionButton
                  onClick={onRequestLocation}
                  isLoading={isRequestingLocation}
                  label={locationActionLabel}
                  updatedLabel={locationUpdatedLabel}
                  fullWidth
                />
              )}
            </div>
          </div>

          {!userLocation ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50/90 p-8 text-center shadow-inner dark:border-white/15 dark:bg-white/[0.04]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 dark:bg-cyan-300 dark:text-slate-950 dark:shadow-cyan-300/20">
                <LocateFixed className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Activa tu ubicación para usar esta vista
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                La brújula necesita tu posición para centrar el mapa y colocar las paradas cercanas.
              </p>
              {onRequestLocation && (
                <div className="mx-auto mt-5 max-w-sm">
                  <LocationActionButton
                    onClick={onRequestLocation}
                    isLoading={isRequestingLocation}
                    label={locationActionLabel}
                    fullWidth
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200/70 bg-white/80 p-2 shadow-lg shadow-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/30">
                  <div className="relative overflow-hidden rounded-lg border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-slate-950">
                    <img
                      src={mapSrc}
                      alt="Mapa de las paradas más cercanas"
                      className="block aspect-square w-full object-cover dark:brightness-[0.78] dark:contrast-[1.12]"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-slate-950/10 dark:bg-slate-950/30" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_38%,rgba(15,23,42,0.24))]" />
                    <CompassMapOverlay hasSignal={hasSignal} heading={heading} stops={stopSummaries} />
                    <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase text-white">
                      <span className="rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 shadow-sm backdrop-blur">
                        Norte fijo
                      </span>
                      <span className="rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 shadow-sm backdrop-blur">
                        {overlayData?.mapSideMeters ?? MAP_FALLBACK_SIDE_METERS} m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200/70 bg-white/80 p-4 shadow-sm shadow-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/25">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <MapPinned className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                    Referencias del mapa
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <LegendDot color="bg-slate-900 dark:bg-white" label="Tu posición" />
                    {stopSummaries.map((stop, index) => (
                      <LegendDot
                        key={`${stop.stopId}-legend`}
                        color={STOP_ACCENTS[index % STOP_ACCENTS.length].dotClass}
                        label={`Parada ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200/70 bg-white/80 p-4 shadow-sm shadow-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/25">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <MapPinned className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                      Paradas cercanas
                    </div>
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                      {stopSummaries.length}/5
                    </span>
                  </div>
                </div>

                {stopSummaries.length > 0 ? (
                  stopSummaries.map((summary, index) => {
                    const accent = STOP_ACCENTS[index % STOP_ACCENTS.length]
                    const isFavorite = Boolean(favoriteStops[summary.stopId])

                    return (
                      <article
                        key={summary.stopId}
                        className="overflow-hidden rounded-lg border border-slate-200/70 bg-white/[0.92] shadow-lg shadow-slate-950/5 backdrop-blur transition-colors hover:border-cyan-200 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/25 dark:hover:border-cyan-300/40"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${accent.badgeClass}`}
                                >
                                  {index + 1}
                                </span>
                                <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                  parada cercana
                                </span>
                              </div>
                              <h3 className="mt-2 truncate text-base font-semibold text-slate-950 dark:text-slate-100">
                                {summary.name}
                              </h3>
                              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                #{summary.stopId} · {summary.location}
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-slate-900/20 dark:bg-white dark:text-slate-950">
                                {formatDistance(summary.distanceMeters)}
                              </span>
                              <Button
                                type="button"
                                onClick={() => toggleFavoriteStop(summary.stopId)}
                                variant={isFavorite ? "default" : "outline"}
                                size="sm"
                                className={
                                  isFavorite
                                    ? "h-8 rounded-full bg-cyan-500 px-3 text-xs text-white shadow-sm shadow-cyan-500/25 hover:bg-cyan-400 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                                    : "h-8 rounded-full border-slate-200 bg-white/90 px-3 text-xs text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:bg-white/10"
                                }
                              >
                                {isFavorite ? "Favorita" : "Guardar"}
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-white/[0.05] dark:ring-white/10">
                              <p className="text-[11px] font-medium uppercase text-slate-500 dark:text-slate-400">
                                Rumbo
                              </p>
                              <p className={`mt-1 text-sm font-semibold ${accent.chipClass} rounded-md px-2 py-1 ring-1`}>
                                {summary.relativeLabel}
                              </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-white/[0.05] dark:ring-white/10">
                              <p className="text-[11px] font-medium uppercase text-slate-500 dark:text-slate-400">
                                Azimut
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {Math.round(summary.absoluteBearing)}°
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {summary.routeBadges.length ? (
                              summary.routeBadges.map((route) => (
                                <span
                                  key={`${summary.stopId}-${route}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
                                >
                                  <Route className="h-3 w-3" />
                                  {route}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                Sin líneas detectadas para esta parada.
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-slate-950/35">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                              Próximos buses
                            </span>
                            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                              {summary.routeBadges.length ? `${summary.routeBadges.length} líneas` : "Sin líneas"}
                            </span>
                          </div>
                          <BusArrivalInfo stopId={summary.stopId} directions={summary.directions} variant="compact" />

                          {onOpenStop && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                type="button"
                                onClick={() => {
                                  onOpenStop(summary.rawStop)
                                  onClose()
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-full px-3 text-xs text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10"
                              >
                                Detalles
                              </Button>
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/90 p-6 text-sm text-slate-600 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-400">
                    No hay paradas cercanas dentro del filtro actual.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function CompassMapOverlay({
  heading,
  hasSignal,
  stops,
}: {
  heading: number
  hasSignal: boolean
  stops: StopSummary[]
}) {
  const center = MAP_VIEWBOX / 2

  return (
    <svg viewBox={`0 0 ${MAP_VIEWBOX} ${MAP_VIEWBOX}`} className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="headingBeam" x1="500" y1="500" x2="500" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="68%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.62)" />
        </linearGradient>
      </defs>

      {stops.map((stop, index) => {
        const accent = STOP_ACCENTS[index % STOP_ACCENTS.length]

        return (
          <g key={stop.stopId}>
            <line
              x1={center}
              y1={center}
              x2={stop.point.x}
              y2={stop.point.y}
              stroke={accent.stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="18 18"
              opacity="0.72"
            />
            <circle cx={stop.point.x} cy={stop.point.y} r="34" fill="rgba(255,255,255,0.18)" />
            <circle cx={stop.point.x} cy={stop.point.y} r="27" fill={accent.fill} stroke="white" strokeWidth="8" />
            <text
              x={stop.point.x}
              y={stop.point.y + 1}
              fill="white"
              fontSize="28"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {index + 1}
            </text>
          </g>
        )
      })}

      <g transform={`rotate(${hasSignal ? heading : 0} ${center} ${center})`} opacity={hasSignal ? 1 : 0.4}>
        <path d="M500 500 L415 130 Q500 56 585 130 Z" fill="url(#headingBeam)" />
        <path d="M500 86 L466 160 H534 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="6" strokeLinejoin="round" />
      </g>

      <circle cx={center} cy={center} r="42" fill="#0f172a" fillOpacity="0.92" stroke="white" strokeWidth="10" />
      <circle cx={center} cy={center} r="68" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="10" />
      <text x={center} y={center + 3} fill="white" fontSize="22" fontWeight="700" textAnchor="middle">
        TU
      </text>
    </svg>
  )
}

function LocationActionButton({
  onClick,
  isLoading,
  label,
  updatedLabel,
  fullWidth = false,
}: {
  onClick: () => void
  isLoading: boolean
  label: string
  updatedLabel?: string | null
  fullWidth?: boolean
}) {
  const Icon = isLoading ? RefreshCw : LocateFixed

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`h-auto min-h-12 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-300/60 hover:bg-cyan-400 focus-visible:ring-cyan-300 disabled:opacity-80 dark:bg-cyan-300 dark:text-slate-950 dark:shadow-cyan-300/20 dark:hover:bg-cyan-200 ${
        fullWidth ? "w-full" : "w-full sm:w-auto"
      }`}
    >
      <Icon className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
      <span className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        {updatedLabel && !isLoading && (
          <span className="text-[11px] font-medium text-cyan-50/90 dark:text-slate-700">Última: {updatedLabel}</span>
        )}
      </span>
    </Button>
  )
}

function StatusChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white/85 px-3 text-xs font-medium text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950/75 dark:text-slate-200">
      {icon}
      {label}
    </span>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 dark:border-white/10 dark:bg-white/10">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function formatStopName(name: string) {
  if (name.includes(" - ")) {
    return name.split(" - ")[1]
  }

  return name
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`
  }

  return `${(distanceMeters / 1000).toFixed(2)} km`
}

function bearingToCompassLabel(bearing: number) {
  const segments = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
  return segments[Math.round(normalizeDegrees(bearing) / 45) % segments.length]
}

function relativeBearingToLabel(relativeBearing: number) {
  const normalized = normalizeDegrees(relativeBearing)

  if (normalized >= 337.5 || normalized < 22.5) return "De frente"
  if (normalized < 67.5) return "Delante a la derecha"
  if (normalized < 112.5) return "A tu derecha"
  if (normalized < 157.5) return "Detrás a la derecha"
  if (normalized < 202.5) return "A tu espalda"
  if (normalized < 247.5) return "Detrás a la izquierda"
  if (normalized < 292.5) return "A tu izquierda"
  return "Delante a la izquierda"
}
