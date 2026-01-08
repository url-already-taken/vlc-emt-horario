const COMPASS_SEGMENTS = [
  { label: "N", start: 337.5, end: 22.5 },
  { label: "NE", start: 22.5, end: 67.5 },
  { label: "E", start: 67.5, end: 112.5 },
  { label: "SE", start: 112.5, end: 157.5 },
  { label: "S", start: 157.5, end: 202.5 },
  { label: "SO", start: 202.5, end: 247.5 },
  { label: "O", start: 247.5, end: 292.5 },
  { label: "NO", start: 292.5, end: 337.5 },
]

export function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180
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
  const rawBearing = (Math.atan2(y, x) * 180) / Math.PI
  return normalizeBearing(rawBearing)
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

export function normalizeBearing(value: number): number {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export function shortestAngleDiff(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

export function bearingToCompassLabel(bearing: number): string {
  const normalized = normalizeBearing(bearing)
  for (const segment of COMPASS_SEGMENTS) {
    if (segment.start > segment.end) {
      if (normalized >= segment.start || normalized < segment.end) {
        return segment.label
      }
    } else if (normalized >= segment.start && normalized < segment.end) {
      return segment.label
    }
  }
  return "N"
}
