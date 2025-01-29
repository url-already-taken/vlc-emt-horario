"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface Bus {
  line: string
  minutes: string
}

interface BusArrivalInfoProps {
  stopId: string
}

export default function BusArrivalInfo({ stopId }: BusArrivalInfoProps) {
  const [buses, setBuses] = useState<Bus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const url = `https://geoportal.emtvalencia.es/EMT/mapfunctions/MapUtilsPetitions.php?sec=getSAE&parada=${stopId}&adaptados=false&idioma=va&nocache=${Math.random()}`
      console.log(`Fetching data for stop ${stopId} from URL: ${url}`)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const xml = await response.text()
      console.log(`Received XML for stop ${stopId}:`, xml)

      const results = parseXml(xml)
      console.log(`Parsed results for stop ${stopId}:`, results)

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
    console.log(`Found ${busBlocks.length} bus blocks in XML for stop ${stopId}`)

    const results: Bus[] = []

    for (const block of busBlocks) {
      const lineaMatch = block.match(/<linea>([^<]+)<\/linea>/)
      const minutosMatch = block.match(/<minutos>([^<]+)<\/minutos>/)

      if (lineaMatch && minutosMatch) {
        results.push({
          line: lineaMatch[1],
          minutes: minutosMatch[1],
        })
      } else {
        console.warn(`Incomplete bus data in XML block for stop ${stopId}:`, block)
      }
    }

    return results
  }

  if (loading) return <div>Loading bus arrival information...</div>
  if (error) return <div>{error}</div>

  return (
    <div className="mt-2">
      <h4 className="text-sm font-semibold mb-1">Next Buses:</h4>
      {buses.length > 0 ? (
        <ul className="space-y-1">
          {buses.map((bus, index) => {
            const minutesNumber = parseInt(bus.minutes.split(' ')[0]) // Extract number before "min."
            const isQuickArrival = minutesNumber < 5
            
            return (
              <li key={index} className="text-sm flex items-center">
                <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center mr-2">
                  {bus.line}
                </span>
                <span
                  className={`${
                    isQuickArrival ? 'text-green-500 font-bold' : 'text-gray-700'
                  }`}
                >
                  {bus.minutes}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No buses found for this stop</p>
      )}
      <Button onClick={fetchData} className="mt-2 text-xs py-1 px-2">
        Refresh
      </Button>
    </div>
  )
  
  
}

