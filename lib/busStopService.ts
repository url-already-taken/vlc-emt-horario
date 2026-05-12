import type { BusStop, Route } from "./busStopTypes"

export const BUS_STOPS_CACHE_KEY = "bus-stops-cache-v2"
export const BUS_STOPS_CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CachedBusStopsPayload {
  savedAt: number
  stops: BusStop[]
}

export async function fetchBusStops(apiUrl = "/api/stops"): Promise<BusStop[]> {
  try {
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const stops = normalizeBusStops(data)
    writeCachedBusStops(stops)

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

export function readCachedBusStops(): { stops: BusStop[]; isFresh: boolean; savedAt: number | null } {
  if (typeof window === "undefined") {
    return { stops: [], isFresh: false, savedAt: null }
  }

  try {
    const stored = window.localStorage.getItem(BUS_STOPS_CACHE_KEY)
    if (!stored) {
      return { stops: [], isFresh: false, savedAt: null }
    }

    const parsed = JSON.parse(stored) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { stops: [], isFresh: false, savedAt: null }
    }

    const payload = parsed as Partial<CachedBusStopsPayload>
    const savedAt = typeof payload.savedAt === "number" ? payload.savedAt : null
    const stops = normalizeBusStops(payload.stops)

    if (!savedAt || stops.length === 0) {
      return { stops: [], isFresh: false, savedAt: null }
    }

    return {
      stops,
      savedAt,
      isFresh: Date.now() - savedAt < BUS_STOPS_CACHE_TTL_MS,
    }
  } catch (err) {
    console.warn("No se pudieron leer las paradas en cache:", err)
    return { stops: [], isFresh: false, savedAt: null }
  }
}

export function writeCachedBusStops(stops: BusStop[]) {
  if (typeof window === "undefined" || stops.length === 0) return

  try {
    const payload: CachedBusStopsPayload = {
      savedAt: Date.now(),
      stops,
    }

    window.localStorage.setItem(BUS_STOPS_CACHE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn("No se pudieron guardar las paradas en cache:", err)
  }
}

export function filterStopsByName(stops: BusStop[], name: string): BusStop[] {
  return stops.filter((stop) => stop.name.toLowerCase().includes(name.toLowerCase()))
}

export function filterStopsByQuery(stops: BusStop[], query: string): BusStop[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return stops
  }

  return stops.filter((stop) => {
    const nameMatch = stop.name?.toLowerCase().includes(normalizedQuery)
    const codeMatch = stop.stopId?.toLowerCase().includes(normalizedQuery)
    const areaMatch = stop.ubica?.toLowerCase().includes(normalizedQuery)
    return Boolean(nameMatch || codeMatch || areaMatch)
  })
}

export function filterStopsByRoute(stops: BusStop[], route: string): BusStop[] {
  return stops.filter((stop) =>
    stop.routes.some(
      (r) => r.SN.toLowerCase().includes(route.toLowerCase()) || r.headSign.toLowerCase().includes(route.toLowerCase()),
    ),
  )
}

function normalizeBusStops(data: unknown): BusStop[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid bus stops payload")
  }

  return data
    .map((item: unknown) => normalizeBusStop(item))
    .filter((stop): stop is BusStop => stop !== null)
}

function normalizeBusStop(item: unknown): BusStop | null {
  if (!item || typeof item !== "object") {
    return null
  }

  const rawStop = item as Record<string, unknown>
  const lat = Number.parseFloat(String(rawStop.lat ?? ""))
  const lon = Number.parseFloat(String(rawStop.lon ?? ""))
  const stopId = String(rawStop.stopId ?? "").trim()

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !stopId) {
    return null
  }

  const routesInput = Array.isArray(rawStop.routes) ? rawStop.routes : []
  const routes: Route[] = routesInput
    .map((route: unknown) => normalizeRoute(route))
    .filter((route): route is Route => route !== null)

  return {
    lat,
    lon,
    name: String(rawStop.name ?? "Parada desconocida"),
    stopId,
    ubica: String(rawStop.ubica ?? ""),
    routes,
  }
}

function normalizeRoute(route: unknown): Route | null {
  if (!route || typeof route !== "object") {
    return null
  }

  const rawRoute = route as Record<string, unknown>

  return {
    headSign: String(rawRoute.headSign ?? ""),
    id_linea: String(rawRoute.id_linea ?? ""),
    LN: String(rawRoute.LN ?? ""),
    SN: String(rawRoute.SN ?? ""),
    type: String(rawRoute.type ?? ""),
  }
}
