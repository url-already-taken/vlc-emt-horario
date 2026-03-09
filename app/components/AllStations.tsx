"use client"

import { useState, useEffect } from "react"
import { filterStopsByName, filterStopsByRoute } from "../../lib/busStopService"
import { useBusStops } from "../../lib/BusStopContext"
import type { BusStop } from "../../lib/busStopTypes"
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

  if (loading) return <div>Cargando listado de paradas...</div>
  if (error) return <div>Error: {error}</div>
  if (!filteredStops || filteredStops.length === 0) return <div>No se encontraron paradas.</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Todas las paradas</h2>
      <div className="flex gap-2 flex-wrap">
        <Input
          type="text"
          placeholder="Filtrar por nombre"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Input
          type="text"
          placeholder="Filtrar por línea"
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="min-w-0 flex-1"
        />
      </div>
      <div>Total de paradas: {displayedStops.length}</div>
      <ul className="space-y-2">
        {displayedStops.map((stop) => (
          <li key={stop.stopId} className="border rounded p-2">
            <h3 className="font-semibold">{stop.name}</h3>
            <p className="text-sm text-gray-600">ID: {stop.stopId}</p>
            <p className="text-sm text-gray-600">Ubicación: {stop.ubica}</p>
            <p className="text-sm text-gray-600">Líneas: {stop.routes.map((route) => route.SN).join(", ")}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
