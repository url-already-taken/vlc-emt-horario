"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import type { RouteDirectionInfo } from "../../lib/busStopTypes"

interface Bus {
  line: string
  destination: string
  minutes: string
}

interface BusArrivalInfoProps {
  stopId: string
  directions?: RouteDirectionInfo[]
  variant?: "default" | "compact" | "favorite"
}

export default function BusArrivalInfo({ stopId, directions = [], variant = "default" }: BusArrivalInfoProps) {
  const [buses, setBuses] = useState<Bus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const url = `https://geoportal.emtvalencia.es/EMT/mapfunctions/MapUtilsPetitions.php?sec=getSAE&parada=${stopId}&adaptados=false&idioma=va&nocache=${Math.random()}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const xml = await response.text()

      const results = parseXml(xml)

      setBuses(results)
    } catch (error) {
      console.error(`Error fetching data for stop ${stopId}:`, error)
      setError(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setLoading(false)
    }
  }, [stopId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function parseXml(xml: string): Bus[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const busNodes = Array.from(doc.getElementsByTagName("bus"))

    return busNodes
      .map((busNode) => {
        const line = busNode.getElementsByTagName("linea")[0]?.textContent?.trim() ?? ""
        const destination = busNode.getElementsByTagName("destino")[0]?.textContent?.trim() ?? ""
        const minutes = busNode.getElementsByTagName("minutos")[0]?.textContent?.trim() ?? ""

        if (!line || !minutes) {
          return null
        }

        return {
          line,
          destination,
          minutes,
        }
      })
      .filter((bus): bus is Bus => bus !== null)
  }

  const directionByLine = useMemo(() => {
    const map = new Map<string, RouteDirectionInfo>()
    directions.forEach((direction) => {
      const key = direction.lineShortName?.toUpperCase()
      if (key && !map.has(key)) {
        map.set(key, direction)
      }
    })
    return map
  }, [directions])

  if (loading) {
    return (
      <div
        className={
          variant === "favorite"
            ? "flex h-full min-h-16 w-full items-center justify-center bg-slate-100 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400"
            : "text-sm text-slate-500 dark:text-slate-400"
        }
      >
        {variant === "favorite" ? "Cargando" : "Cargando llegadas..."}
      </div>
    )
  }
  if (error) {
    return (
      <div
        className={
          variant === "favorite"
            ? "flex h-full min-h-16 w-full items-center justify-center bg-red-50 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-700 dark:bg-red-950/40 dark:text-red-200"
            : "text-sm text-red-600 dark:text-red-300"
        }
        title={error}
      >
        {variant === "favorite" ? "Error" : error}
      </div>
    )
  }

  if (variant === "favorite") {
    const favoriteArrivalSlots: Array<Bus | null> = Array.from({ length: 3 }, (_, index) => buses[index] ?? null)

    return (
      <div className="h-full w-full">
        <ul className="grid h-full min-h-16 grid-cols-3 bg-white dark:bg-slate-950">
          {favoriteArrivalSlots.map((bus, index) => {
            if (!bus) {
              return (
                <li
                  key={`${stopId}-favorite-empty-${index}`}
                  className="grid min-h-16 grid-rows-[1.45rem_1fr] border-r border-slate-950/20 bg-slate-50 text-slate-400 last:border-r-0 dark:border-white/15 dark:bg-slate-950 dark:text-slate-600"
                  title="Sin llegada"
                >
                  <span className="flex items-center justify-center border-b border-slate-950/20 text-[10px] font-black leading-none dark:border-white/15">
                    --
                  </span>
                  <span className="flex items-center justify-center text-base font-black leading-none tabular-nums sm:text-lg">
                    --
                  </span>
                </li>
              )
            }

            const etaMinutes = parseEtaMinutes(bus.minutes)
            const isQuickArrival = etaMinutes !== null && etaMinutes < 5
            const direction = directionByLine.get(bus.line.toUpperCase())
            const label = formatCompactMinutes(bus.minutes)
            const etaClass = isQuickArrival
              ? "bg-emerald-400 text-emerald-950 dark:bg-emerald-300 dark:text-emerald-950"
              : "bg-white text-slate-950 dark:bg-slate-950 dark:text-white"

            return (
              <li
                key={`${stopId}-favorite-${index}`}
                className="grid min-h-16 grid-rows-[1.45rem_1fr] border-r border-slate-950/20 last:border-r-0 dark:border-white/15"
                title={formatDestination(bus.destination) ?? formatHeadsign(direction?.headSign) ?? bus.line}
              >
                <span className="flex items-center justify-center border-b border-slate-950/20 bg-slate-950 px-1 text-[11px] font-black leading-none text-white dark:border-white/15 dark:bg-white dark:text-slate-950 sm:text-xs">
                  {bus.line}
                </span>
                <span className={`flex items-center justify-center px-1 text-[17px] font-black leading-none tabular-nums sm:text-xl ${etaClass}`}>
                  {label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className={variant === "compact" ? "mt-1" : "mt-2"}>
      {variant === "default" && (
        <h4 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Próximos autobuses:</h4>
      )}
      {buses.length > 0 ? (
        <ul className={variant === "compact" ? "space-y-1" : "space-y-1.5"}>
          {buses.slice(0, variant === "compact" ? 2 : buses.length).map((bus, index) => {
            const etaMinutes = parseEtaMinutes(bus.minutes)
            const isQuickArrival = etaMinutes !== null && etaMinutes < 5
            const direction = directionByLine.get(bus.line.toUpperCase())
            const rowClass =
              variant === "compact"
                ? "rounded-xl border border-slate-100 bg-white/80 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-slate-950/60"
                : "rounded-2xl border border-slate-100 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950/60"

            return (
              <li key={`${stopId}-${index}`} className={rowClass}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={
                        variant === "compact"
                          ? "w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                          : "w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      }
                    >
                      {bus.line}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-800 dark:text-slate-100">
                        {formatDestination(bus.destination) ?? formatHeadsign(direction?.headSign) ?? "—"}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap ${isQuickArrival ? "font-semibold text-emerald-600 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    {bus.minutes}
                  </span>
                </div>
                {direction && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{direction.arrow}</span>
                    <span>{direction.compassLabel}</span>
                    <span>{direction.relationToCenter}</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">Sin autobuses para esta parada</p>
      )}
      {variant === "default" && (
        <Button onClick={fetchData} className="mt-2 rounded-full px-3 py-1 text-xs">
          Actualizar
        </Button>
      )}
    </div>
  )
}

function formatHeadsign(headsign?: string): string | undefined {
  if (!headsign) return headsign
  if (headsign.includes(" - ")) {
    return headsign.split(" - ")[1]
  }
  return headsign
}

function formatDestination(destination?: string): string | undefined {
  if (!destination) {
    return undefined
  }

  return destination
    .replace(/\s+/g, " ")
    .replace(/\.+/g, ".")
    .trim()
}

function formatCompactMinutes(minutes: string): string {
  const parsedMinutes = parseEtaMinutes(minutes)
  if (parsedMinutes !== null) {
    if (parsedMinutes >= 60) {
      const hours = Math.floor(parsedMinutes / 60)
      const remainingMinutes = parsedMinutes % 60

      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }

    return `${parsedMinutes}m`
  }

  return minutes
}

function parseEtaMinutes(minutes: string): number | null {
  const normalized = minutes.trim().toLowerCase()

  if (normalized.includes("pròxim") || normalized.includes("proxim")) {
    return 0
  }

  const durationMatch = normalized.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/)
  if (durationMatch) {
    const hours = Number.parseInt(durationMatch[1], 10)
    const durationMinutes = Number.parseInt(durationMatch[2], 10)

    if (Number.isNaN(hours) || Number.isNaN(durationMinutes)) {
      return null
    }

    return hours * 60 + durationMinutes
  }

  const hoursMatch = normalized.match(/(\d+)\s*h\b/)
  const minutesMatch = normalized.match(/(\d+)\s*min\b/)

  if (hoursMatch) {
    const hours = Number.parseInt(hoursMatch[1], 10)
    const extraMinutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0
    return hours * 60 + (Number.isNaN(extraMinutes) ? 0 : extraMinutes)
  }

  if (minutesMatch) {
    const parsedMinutes = Number.parseInt(minutesMatch[1], 10)
    return Number.isNaN(parsedMinutes) ? null : parsedMinutes
  }

  if (normalized.includes("h")) {
    return null
  }

  const parsedMinutes = Number.parseInt(normalized, 10)
  return Number.isNaN(parsedMinutes) ? null : parsedMinutes
}
