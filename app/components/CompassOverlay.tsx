"use client"

import { type ReactNode, useEffect, useMemo } from "react"
import { Compass, LocateFixed, MapPinned, Navigation, Route, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBusStops } from "@/lib/BusStopContext"
import { useDeviceHeading } from "@/hooks/useDeviceHeading"
import {
  clamp,
  distanceKm,
  getBBoxAroundMeters,
  getBearing,
  normalizeDegrees,
  projectPointToSquare,
} from "@/lib/geoUtils"

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
    badgeClass: "bg-teal-500 text-white",
    chipClass: "bg-teal-50 text-teal-800 ring-teal-200",
  },
  {
    fill: "#1d4ed8",
    stroke: "#60a5fa",
    badgeClass: "bg-blue-500 text-white",
    chipClass: "bg-blue-50 text-blue-800 ring-blue-200",
  },
  {
    fill: "#b45309",
    stroke: "#f59e0b",
    badgeClass: "bg-amber-500 text-white",
    chipClass: "bg-amber-50 text-amber-800 ring-amber-200",
  },
] as const

interface CompassOverlayProps {
  onClose: () => void
}

interface StopSummary {
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
}

export default function CompassOverlay({ onClose }: CompassOverlayProps) {
  const { nearestStops, routeDirections, userLocation } = useBusStops()
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 backdrop-blur-md" onClick={onClose}>
      <div className="min-h-full p-3 sm:p-6">
        <section
          className="mx-auto max-w-6xl rounded-[36px] border border-white/60 bg-white/80 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-xl sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Modo brújula</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Mapa estable con rumbo en vivo
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                La flecha sigue el teléfono con suavizado. El mapa se queda quieto para que las paradas no bailen cada
                vez que gires la mano.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusChip icon={<Navigation className="h-3.5 w-3.5" />} label={headingLabel} />
              <StatusChip
                icon={<Compass className="h-3.5 w-3.5" />}
                label={isSupported ? (hasSignal ? "Sensor activo" : "Buscando señal") : "Sin sensor"}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-white/70 bg-white/90"
                onClick={onClose}
                aria-label="Cerrar brújula"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!userLocation ? (
            <div className="mt-6 rounded-[32px] border border-dashed border-slate-300 bg-slate-50/90 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
                <LocateFixed className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Activa tu ubicación para usar esta vista</h3>
              <p className="mt-2 text-sm text-slate-600">
                La brújula necesita tu posición para centrar el mapa y colocarte respecto a las paradas cercanas.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="space-y-4">
                <div className="rounded-[32px] border border-white/70 bg-slate-950/95 p-3 shadow-xl shadow-slate-900/20">
                  <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-slate-900">
                    <img
                      src={mapSrc}
                      alt="Mapa de las paradas más cercanas"
                      className="block w-full"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.02),rgba(15,23,42,0.32))]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_35%,rgba(15,23,42,0.18))]" />
                    <CompassMapOverlay
                      hasSignal={hasSignal}
                      heading={heading}
                      stops={overlayData?.stopSummaries ?? []}
                    />
                    <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
                      <span className="rounded-full bg-slate-950/55 px-3 py-1 backdrop-blur">Norte fijo</span>
                      <span className="rounded-full bg-slate-950/55 px-3 py-1 backdrop-blur">
                        {overlayData?.mapSideMeters ?? MAP_FALLBACK_SIDE_METERS} m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <LegendDot color="bg-slate-900" label="Tu posición" />
                    <LegendDot color="bg-teal-500" label="Parada 1" />
                    <LegendDot color="bg-blue-500" label="Parada 2" />
                    <LegendDot color="bg-amber-500" label="Parada 3" />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Los números del mapa coinciden con las tarjetas de la derecha. La frase “delante”, “derecha” o
                    “espalda” se calcula según cómo tengas orientado el móvil ahora mismo.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    <MapPinned className="h-4 w-4" />
                    Paradas cercanas
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Vista rápida para moverte a pie sin el overlay antiguo de puntos flotando.
                  </p>
                </div>

                {(overlayData?.stopSummaries ?? []).length > 0 ? (
                  (overlayData?.stopSummaries ?? []).map((stop, index) => {
                    const accent = STOP_ACCENTS[index % STOP_ACCENTS.length]

                    return (
                      <article
                        key={stop.stopId}
                        className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${accent.badgeClass}`}
                              >
                                {index + 1}
                              </span>
                              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                parada cercana
                              </span>
                            </div>
                            <h3 className="mt-2 truncate text-base font-semibold text-slate-950">{stop.name}</h3>
                            <p className="mt-1 text-xs text-slate-500">
                              #{stop.stopId} · {stop.location}
                            </p>
                          </div>

                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                            {formatDistance(stop.distanceMeters)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${accent.chipClass}`}
                          >
                            {stop.relativeLabel}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                            Azimut {Math.round(stop.absoluteBearing)}°
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {stop.routeBadges.length ? (
                            stop.routeBadges.map((route) => (
                              <span
                                key={`${stop.stopId}-${route}`}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                              >
                                <Route className="h-3 w-3" />
                                {route}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">Sin líneas detectadas para esta parada.</span>
                          )}
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/90 p-6 text-sm text-slate-600">
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

function StatusChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3 text-xs font-medium text-slate-700 shadow-sm">
      {icon}
      {label}
    </span>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100/80 px-2.5 py-1">
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
