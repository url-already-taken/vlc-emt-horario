export type GeoBBox = [number, number, number, number]

export function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function normalizeDegrees(value: number): number {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export function shortestAngleDiff(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

export function circularAverageDegrees(values: number[]): number {
  if (!values.length) return 0

  const { x, y } = values.reduce(
    (sum, value) => {
      const radians = deg2rad(value)
      return {
        x: sum.x + Math.cos(radians),
        y: sum.y + Math.sin(radians),
      }
    },
    { x: 0, y: 0 },
  )

  if (x === 0 && y === 0) {
    return normalizeDegrees(values[values.length - 1] ?? 0)
  }

  return normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI)
}

export function getBBoxAroundMeters(lat: number, lon: number, halfMeters: number): GeoBBox {
  const latDelta = halfMeters / 111320
  const lonDelta = halfMeters / (111320 * Math.cos((lat * Math.PI) / 180))
  return [lon - lonDelta, lat - latDelta, lon + lonDelta, lat + latDelta]
}

export function projectPointToSquare(lat: number, lon: number, bbox: GeoBBox, size: number) {
  const x = ((lon - bbox[0]) / (bbox[2] - bbox[0])) * size
  const y = size - ((lat - bbox[1]) / (bbox[3] - bbox[1])) * size

  return {
    x,
    y,
  }
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (val: number) => (val * Math.PI) / 180
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180) / Math.PI
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
