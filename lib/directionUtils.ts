import { distanceKm, getBearing } from "./geoUtils"
import type { BusStop, RouteDirectionInfo, StopDirectionMap } from "./busStopTypes"

const MIN_DIRECTION_DISTANCE_M = 30
const MAX_DIRECTION_DISTANCE_M = 600
const CITY_CENTER = { lat: 39.4699, lon: -0.3763 }

const COMPASS_SEGMENTS = [
  { label: "С", arrow: "↑", start: 337.5, end: 22.5 },
  { label: "СВ", arrow: "↗", start: 22.5, end: 67.5 },
  { label: "В", arrow: "→", start: 67.5, end: 112.5 },
  { label: "ЮВ", arrow: "↘", start: 112.5, end: 157.5 },
  { label: "Ю", arrow: "↓", start: 157.5, end: 202.5 },
  { label: "ЮЗ", arrow: "↙", start: 202.5, end: 247.5 },
  { label: "З", arrow: "←", start: 247.5, end: 292.5 },
  { label: "СЗ", arrow: "↖", start: 292.5, end: 337.5 },
]

interface EnrichedRoute {
  stop: BusStop
  headSign: string
  lineId: string
  lineShortName: string
  lineLongName: string
}

export function computeRouteDirections(stops: BusStop[]): StopDirectionMap {
  const index = new Map<string, EnrichedRoute[]>()

  stops.forEach((stop) => {
    stop.routes.forEach((route) => {
      const headSign = route.headSign?.trim()
      if (!route.id_linea || !headSign) return
      const key = `${route.id_linea}::${headSign.toLowerCase()}`
      if (!index.has(key)) {
        index.set(key, [])
      }
      index.get(key)!.push({
        stop,
        headSign,
        lineId: route.id_linea,
        lineShortName: route.SN ?? route.id_linea,
        lineLongName: route.LN ?? route.id_linea,
      })
    })
  })

  const result: StopDirectionMap = {}

  for (const [, routes] of index.entries()) {
    for (const source of routes) {
      const target = findClosestNeighbor(source.stop, routes.map((item) => item.stop))
      if (!target) continue
      const bearing = normalizeBearing(getBearing(source.stop.lat, source.stop.lon, target.lat, target.lon))
      const compass = bearingToCompass(bearing)
      const relation = relationToCenter(source.stop, bearing)

      const info: RouteDirectionInfo = {
        stopId: source.stop.stopId,
        lineId: source.lineId,
        lineShortName: source.lineShortName,
        lineLongName: source.lineLongName,
        headSign: source.headSign,
        neighborStopId: target.stopId,
        neighborName: target.name,
        distanceMeters: roundMeters(distanceKm(source.stop.lat, source.stop.lon, target.lat, target.lon) * 1000),
        bearing,
        compassLabel: `${compass.label} · ${Math.round(bearing)}°`,
        arrow: compass.arrow,
        relationToCenter: relation,
      }

      if (!result[source.stop.stopId]) {
        result[source.stop.stopId] = []
      }
      result[source.stop.stopId].push(info)
    }
  }

  return result
}

function findClosestNeighbor(stop: BusStop, candidates: BusStop[]): BusStop | null {
  let best: { stop: BusStop; distance: number } | null = null
  for (const candidate of candidates) {
    if (candidate.stopId === stop.stopId) continue
    const distanceMeters = distanceKm(stop.lat, stop.lon, candidate.lat, candidate.lon) * 1000
    if (distanceMeters < MIN_DIRECTION_DISTANCE_M || distanceMeters > MAX_DIRECTION_DISTANCE_M) continue
    if (!best || distanceMeters < best.distance) {
      best = { stop: candidate, distance: distanceMeters }
    }
  }
  return best ? best.stop : null
}

function normalizeBearing(value: number): number {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function bearingToCompass(bearing: number) {
  for (const segment of COMPASS_SEGMENTS) {
    if (segment.start > segment.end) {
      if (bearing >= segment.start || bearing < segment.end) return segment
    } else if (bearing >= segment.start && bearing < segment.end) {
      return segment
    }
  }
  return COMPASS_SEGMENTS[0]
}

function relationToCenter(stop: BusStop, bearing: number): "к центру" | "от центра" | "вдоль" {
  const toCenter = normalizeBearing(getBearing(stop.lat, stop.lon, CITY_CENTER.lat, CITY_CENTER.lon))
  const diff = angularDifference(bearing, toCenter)
  if (diff <= 45) return "к центру"
  if (diff >= 135) return "от центра"
  return "вдоль"
}

function angularDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

function roundMeters(value: number): number {
  return Math.round(value)
}
