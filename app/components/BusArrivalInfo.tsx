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
  variant?: "default" | "compact"
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
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const xml = await response.text()

      const results = parseXml(xml)

      setBuses(results)
    } catch (error) {
      console.error(`Error fetching data for stop ${stopId}:`, error)
      setError(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
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

  if (loading) return <div>Loading bus arrival information...</div>
  if (error) return <div>{error}</div>

  return (
    <div className={variant === "compact" ? "mt-1" : "mt-2"}>
      {variant === "default" && <h4 className="text-sm font-semibold mb-1">Next Buses:</h4>}
      {buses.length > 0 ? (
        <ul className={variant === "compact" ? "space-y-0.5" : "space-y-1"}>
          {buses.slice(0, variant === "compact" ? 2 : buses.length).map((bus, index) => {
            const minutesNumber = Number.parseInt(bus.minutes.split(" ")[0], 10)
            const isQuickArrival = (!Number.isNaN(minutesNumber) && minutesNumber < 5) || bus.minutes.includes("Pròxim")
            const direction = directionByLine.get(bus.line.toUpperCase())

            return (
              <li key={`${stopId}-${index}`} className="text-sm border-b border-gray-100 last:border-b-0 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                      {bus.line}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 truncate">
                        {direction?.headSign?.split(" - ")[1] ?? direction?.headSign ?? "—"}
                      </div>
                    </div>
                  </div>
                  <span className={isQuickArrival ? "text-green-600 font-semibold" : "text-gray-700"}>{bus.minutes}</span>
                </div>
                {direction && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
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
        <p className="text-sm text-gray-500">No buses found for this stop</p>
      )}
      {variant === "default" && (
        <Button onClick={fetchData} className="mt-2 text-xs py-1 px-2">
          Refresh
        </Button>
      )}
    </div>
  )
}
