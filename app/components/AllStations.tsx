"use client"

import { useState, useEffect } from "react"
import { filterStopsByName, filterStopsByRoute, type BusStop } from "../../lib/busStopService"
import { useBusStops } from "../../lib/BusStopContext"
import { Input } from "@/components/ui/input"

export default function AllStations() {
  const { filteredStops, loading, error } = useBusStops()
  const [displayedStops, setDisplayedStops] = useState<BusStop[]>([])
  const [nameFilter, setNameFilter] = useState("")
  const [routeFilter, setRouteFilter] = useState("")

  useEffect(() => {
    let result = filteredStops
    if (nameFilter) {
      result = filterStopsByName(result, nameFilter)
    }
    if (routeFilter) {
      result = filterStopsByRoute(result, routeFilter)
    }
    setDisplayedStops(result)
  }, [filteredStops, nameFilter, routeFilter])

  if (loading) return <div>Loading stations...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">All Bus Stations</h2>
      <div className="flex gap-2 flex-wrap">
        <Input
          type="text"
          placeholder="Filter by name"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="flex-grow"
        />
        <Input
          type="text"
          placeholder="Filter by route"
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="flex-grow"
        />
      </div>
      <div>Total stations: {displayedStops.length}</div>
      <ul className="space-y-2">
        {displayedStops.map((stop) => (
          <li key={stop.stopId} className="border rounded p-2">
            <h3 className="font-semibold">{stop.name}</h3>
            <p className="text-sm text-gray-600">ID: {stop.stopId}</p>
            <p className="text-sm text-gray-600">Location: {stop.ubica}</p>
            <p className="text-sm text-gray-600">Routes: {stop.routes.map((route) => route.SN).join(", ")}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

