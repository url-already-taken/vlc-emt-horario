import { NextResponse } from "next/server"
import type { BusStop, Route } from "@/lib/busStopTypes"

const BUS_STOPS_REVALIDATE_SECONDS = 24 * 60 * 60

export const revalidate = BUS_STOPS_REVALIDATE_SECONDS

const OPENDATA_STOPS_URL = "https://valencia.opendatasoft.com/api/v2/catalog/datasets/emt/exports/json"
const LEGACY_STOPS_URL =
  "https://geoportal.emtvalencia.es/opentripplanner-api-webapp/ws/metadata/stopsInExtent?lowerCornerLon=-0.4187679290778661&lowerCornerLat=39.431221084842264&upperCornerLon=-0.33207893371653785&upperCornerLat=39.51099400566781"

export async function GET() {
  try {
    const openDataStops = await fetchOpenDataStops()
    const legacyStops = await fetchLegacyStops().catch((legacyError) => {
      console.error("Failed to enrich OpenDataSoft stops from legacy EMT endpoint:", legacyError)
      return []
    })

    return NextResponse.json(mergeStopsWithLegacyData(openDataStops, legacyStops))
  } catch (openDataError) {
    console.error("Failed to load stops from OpenDataSoft:", openDataError)

    try {
      const legacyStops = await fetchLegacyStops()
      return NextResponse.json(legacyStops)
    } catch (legacyError) {
      console.error("Failed to load stops from legacy EMT endpoint:", legacyError)

      return NextResponse.json({ error: "No se pudieron cargar las paradas" }, { status: 502 })
    }
  }
}

async function fetchOpenDataStops(): Promise<BusStop[]> {
  const response = await fetch(OPENDATA_STOPS_URL, { next: { revalidate: BUS_STOPS_REVALIDATE_SECONDS } })

  if (!response.ok) {
    throw new Error(`OpenDataSoft HTTP ${response.status}`)
  }

  const payload = await response.json()

  if (!Array.isArray(payload)) {
    throw new Error("OpenDataSoft payload is not an array")
  }

  const stops = payload
    .map(normalizeOpenDataStop)
    .filter((stop): stop is BusStop => stop !== null)

  if (stops.length === 0) {
    throw new Error("OpenDataSoft returned no valid stops")
  }

  return stops
}

async function fetchLegacyStops(): Promise<BusStop[]> {
  const response = await fetch(LEGACY_STOPS_URL, { next: { revalidate: BUS_STOPS_REVALIDATE_SECONDS } })

  if (!response.ok) {
    throw new Error(`Legacy EMT HTTP ${response.status}`)
  }

  const payload = (await response.json()) as { stop?: Record<string, unknown>[] }
  const rawStops = Array.isArray(payload.stop) ? payload.stop : []

  return rawStops
    .map(normalizeLegacyStop)
    .filter((stop: BusStop | null): stop is BusStop => stop !== null)
}

function mergeStopsWithLegacyData(openDataStops: BusStop[], legacyStops: BusStop[]): BusStop[] {
  if (!legacyStops.length) {
    return openDataStops
  }

  const legacyById = new Map(legacyStops.map((stop) => [stop.stopId, stop]))

  return openDataStops.map((stop) => {
    const legacyStop = legacyById.get(stop.stopId)

    if (!legacyStop) {
      return stop
    }

    return {
      ...stop,
      name: stop.name !== "Parada desconocida" ? stop.name : legacyStop.name,
      ubica: stop.ubica || legacyStop.ubica,
      routes: legacyStop.routes.length > 0 ? legacyStop.routes : stop.routes,
    }
  })
}

function normalizeOpenDataStop(item: Record<string, unknown>): BusStop | null {
  const coordinates = parseCoordinates(item.geo_point_2d)
  const stopId = toCleanString(item.id_parada ?? item.stopId ?? item.id)

  if (!coordinates || !stopId) {
    return null
  }

  const rawName = toCleanString(item.denominacion ?? item.parada ?? item.name)
  const name = sanitizeStopName(rawName, stopId) ?? "Parada desconocida"
  const ubica = toCleanString(item.numportal ?? item.ubicacion ?? item.ubica) ?? name

  return {
    stopId,
    lat: coordinates.lat,
    lon: coordinates.lon,
    name,
    ubica,
    routes: parseOpenDataRoutes(item.lineas),
  }
}

function normalizeLegacyStop(item: Record<string, unknown>): BusStop | null {
  const lat = toFiniteNumber(item.lat)
  const lon = toFiniteNumber(item.lon)
  const stopId = toCleanString(item.stopId)

  if (lat === null || lon === null || !stopId) {
    return null
  }

  const routes = normalizeRoutes(item.routes)

  return {
    lat,
    lon,
    name: toCleanString(item.name) ?? "Parada desconocida",
    stopId,
    ubica: toCleanString(item.ubica) ?? "",
    routes,
  }
}

function normalizeRoutes(rawRoutes: unknown): Route[] {
  const rtIValue =
    rawRoutes && typeof rawRoutes === "object" && "rtI" in rawRoutes ? (rawRoutes as { rtI?: unknown }).rtI : rawRoutes
  const routeList = Array.isArray(rtIValue) ? rtIValue : rtIValue ? [rtIValue] : []

  return routeList
    .map((route) => {
      if (!route || typeof route !== "object") {
        return null
      }

      const item = route as Record<string, unknown>

      return {
        headSign: toCleanString(item.headSign) ?? "",
        id_linea: toCleanString(item.id_linea) ?? "",
        LN: toCleanString(item.LN) ?? "",
        SN: toCleanString(item.SN) ?? "",
        type: toCleanString(item.type) ?? "",
      }
    })
    .filter((route): route is Route => route !== null)
}

function parseOpenDataRoutes(rawLines: unknown): Route[] {
  if (typeof rawLines !== "string") {
    return []
  }

  return rawLines
    .split(",")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      headSign: "",
      id_linea: line,
      LN: line,
      SN: line,
      type: "",
    }))
}

function parseCoordinates(value: unknown): { lat: number; lon: number } | null {
  if (Array.isArray(value) && value.length >= 2) {
    const first = toFiniteNumber(value[0])
    const second = toFiniteNumber(value[1])

    if (first === null || second === null) {
      return null
    }

    if (isLikelyValenciaCoordinate(first, second)) {
      return { lat: first, lon: second }
    }

    if (isLikelyValenciaCoordinate(second, first)) {
      return { lat: second, lon: first }
    }

    if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
      return { lat: first, lon: second }
    }

    if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
      return { lat: second, lon: first }
    }

    return null
  }

  if (value && typeof value === "object") {
    const point = value as Record<string, unknown>
    const lat = toFiniteNumber(point.lat)
    const lon = toFiniteNumber(point.lon ?? point.lng ?? point.long)

    if (lat === null || lon === null) {
      return null
    }

    return { lat, lon }
  }

  return null
}

function isLikelyValenciaCoordinate(lat: number, lon: number) {
  return lat >= 39 && lat <= 40 && lon >= -1 && lon <= 0.5
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN
  return Number.isFinite(numeric) ? numeric : null
}

function toCleanString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null
  }

  const normalized = String(value).trim()
  return normalized ? normalized : null
}

function sanitizeStopName(name: string | null, stopId: string): string | null {
  if (!name) {
    return null
  }

  return name.replace(new RegExp(`\\s*\\(${escapeForRegExp(stopId)}\\)\\s*$`), "").trim() || null
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
