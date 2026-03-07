"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import type { RouteDirectionInfo } from "../../lib/busStopTypes"

interface Bus {
  line: string
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
    const busBlocks = xml.match(/<bus>[\s\S]*?<\/bus>/g) || []

    const results: Bus[] = []

    for (const block of busBlocks) {
      const lineaMatch = block.match(/<linea>([^<]+)<\/linea>/)
      const minutosMatch = block.match(/<minutos>([^<]+)<\/minutos>/)

      if (lineaMatch && minutosMatch) {
        results.push({
          line: lineaMatch[1],
          minutes: minutosMatch[1],
        })
      }
    }

    return results
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
      <div className={variant === "favorite" ? "mt-2 text-[11px] text-slate-400" : "text-sm text-slate-500"}>
        Cargando llegadas...
      </div>
    )
  }
  if (error) {
    return (
      <div className={variant === "favorite" ? "mt-2 text-[11px] text-red-500" : "text-sm text-red-600"}>{error}</div>
    )
  }

  if (variant === "favorite") {
    return (
      <div className="mt-2">
        {buses.length > 0 ? (
          <ul className="grid grid-cols-2 gap-1.5">
            {buses.slice(0, 2).map((bus, index) => {
              const minutesNumber = Number.parseInt(bus.minutes.split(" ")[0], 10)
              const isQuickArrival = (!Number.isNaN(minutesNumber) && minutesNumber < 5) || bus.minutes.includes("Pròxim")
              const direction = directionByLine.get(bus.line.toUpperCase())

              return (
                <li
                  key={`${stopId}-favorite-${index}`}
                  className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-2 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                      {bus.line}
                    </span>
                    <span
                      className={
                        isQuickArrival ? "text-sm font-semibold text-emerald-600" : "text-sm font-semibold text-slate-800"
                      }
                    >
                      {bus.minutes}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-slate-500">
                    {formatHeadsign(direction?.headSign) ?? "Sin destino"}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-[11px] text-slate-500">Sin tiempos disponibles</p>
        )}
      </div>
    )
  }

  return (
    <div className={variant === "compact" ? "mt-1" : "mt-2"}>
      {variant === "default" && <h4 className="text-sm font-semibold mb-1">Próximos autobuses:</h4>}
      {buses.length > 0 ? (
        <ul className={variant === "compact" ? "space-y-1" : "space-y-1.5"}>
          {buses.slice(0, variant === "compact" ? 2 : buses.length).map((bus, index) => {
            const minutesNumber = Number.parseInt(bus.minutes.split(" ")[0], 10)
            const isQuickArrival = (!Number.isNaN(minutesNumber) && minutesNumber < 5) || bus.minutes.includes("Pròxim")
            const direction = directionByLine.get(bus.line.toUpperCase())
            const rowClass =
              variant === "compact"
                ? "rounded-xl border border-slate-100 bg-white/80 px-2 py-1.5 text-xs"
                : "rounded-2xl border border-slate-100 bg-white/80 px-3 py-2 text-sm"

            return (
              <li key={`${stopId}-${index}`} className={rowClass}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
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
                      <div className="font-medium text-gray-800 truncate">
                        {formatHeadsign(direction?.headSign) ?? "—"}
                      </div>
                    </div>
                  </div>
                  <span className={isQuickArrival ? "text-green-600 font-semibold" : "text-gray-700"}>{bus.minutes}</span>
                </div>
                {direction && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
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
        <p className="text-sm text-gray-500">Sin autobuses para esta parada</p>
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
