import type { BusStop, Route } from "./busStopTypes"

export async function fetchBusStops(apiUrl: string): Promise<BusStop[]> {
  try {
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    const stopsArray = Array.isArray(data.stop) ? data.stop : []

    const stops: BusStop[] = stopsArray.map((item: any) => {
      const rtIValue = item.routes?.rtI
      const rtIArray = Array.isArray(rtIValue) ? rtIValue : rtIValue ? [rtIValue] : []

      const routes: Route[] = rtIArray.map((route: any) => ({
        headSign: route.headSign,
        id_linea: route.id_linea,
        LN: route.LN,
        SN: route.SN,
        type: route.type,
      }))

      const lat = Number.parseFloat(item.lat ?? "0")
      const lon = Number.parseFloat(item.lon ?? "0")

      return {
        lat: Number.isFinite(lat) ? lat : 0,
        lon: Number.isFinite(lon) ? lon : 0,
        name: item.name,
        stopId: item.stopId,
        ubica: item.ubica,
        routes,
      }
    })

    return stops
  } catch (error) {
    console.error("Error in fetchBusStops:", error)
    if (error instanceof Error) {
      console.error("Error Name:", error.name)
      console.error("Error Message:", error.message)
      console.error("Error Stack:", error.stack)
    }
    throw error
  }
}

export function filterStopsByName(stops: BusStop[], name: string): BusStop[] {
  return stops.filter((stop) => stop.name.toLowerCase().includes(name.toLowerCase()))
}

export function filterStopsByRoute(stops: BusStop[], route: string): BusStop[] {
  return stops.filter((stop) =>
    stop.routes.some(
      (r) => r.SN.toLowerCase().includes(route.toLowerCase()) || r.headSign.toLowerCase().includes(route.toLowerCase()),
    ),
  )
}
