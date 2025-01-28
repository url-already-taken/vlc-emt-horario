export interface Route {
  headSign: string
  id_linea: string
  LN: string
  SN: string
  type: string
}

export interface BusStop {
  lat: string
  lon: string
  name: string
  stopId: string
  ubica: string
  routes: Route[]
}

export async function fetchBusStops(apiUrl: string): Promise<BusStop[]> {
  try {
    console.log("Fetching URL:", apiUrl)

    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    console.log("Raw JSON Response:", JSON.stringify(data, null, 2))

    const stopsArray = Array.isArray(data.stop) ? data.stop : []
    console.log(`Found ${stopsArray.length} stops`)

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

      return {
        lat: item.lat,
        lon: item.lon,
        name: item.name,
        stopId: item.stopId,
        ubica: item.ubica,
        routes,
      }
    })

    console.log("Parsed Stops:", JSON.stringify(stops, null, 2))

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

