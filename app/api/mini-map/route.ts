import fs from "node:fs/promises"
import path from "node:path"

export const dynamic = "force-dynamic"

type BBox = [number, number, number, number]
type Point = [number, number]

type Geometry =
  | { type: "LineString"; coordinates: number[][] }
  | { type: "MultiLineString"; coordinates: number[][][] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }

type StoredFeature = {
  type: "Feature"
  properties: {
    id: number
    name?: string | null
    labelPoint?: Point | null
    labelLength?: number
  }
  geometry: Geometry
  bbox: BBox
}

type StoredCollection = {
  type: "FeatureCollection"
  features: StoredFeature[]
}

const DATA_DIR = path.join(process.cwd(), "data", "derived")

const cache: Partial<Record<"buildings" | "streets", Promise<StoredCollection>>> = {}

function loadLayer(name: "buildings" | "streets") {
  if (!cache[name]) {
    const layerPath = path.join(DATA_DIR, `${name}.json`)
    cache[name] = fs
      .readFile(layerPath, "utf8")
      .then((text) => JSON.parse(text) as StoredCollection)
      .catch((error: NodeJS.ErrnoException) => {
        delete cache[name]
        if (error.code === "ENOENT") {
          throw new Error(`Mini-map layer not found: ${layerPath}. Run "npm run build:minimap-data" first.`)
        }
        throw error
      })
  }
  return cache[name]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getBBoxAround(lat: number, lon: number, halfMeters: number): BBox {
  const latDelta = halfMeters / 111320
  const lonDelta = halfMeters / (111320 * Math.cos((lat * Math.PI) / 180))
  return [lon - lonDelta, lat - latDelta, lon + lonDelta, lat + latDelta]
}

function bboxIntersects(a: BBox, b: BBox) {
  return !(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1])
}

function projectPoint([lon, lat]: number[], bbox: BBox, size: number) {
  const x = ((lon - bbox[0]) / (bbox[2] - bbox[0])) * size
  const y = size - ((lat - bbox[1]) / (bbox[3] - bbox[1])) * size
  return [Number(x.toFixed(1)), Number(y.toFixed(1))]
}

function projectPointRaw([lon, lat]: number[], bbox: BBox, size: number) {
  const x = ((lon - bbox[0]) / (bbox[2] - bbox[0])) * size
  const y = size - ((lat - bbox[1]) / (bbox[3] - bbox[1])) * size
  return [x, y]
}

function pathFromLine(coords: number[][], bbox: BBox, size: number) {
  return coords
    .map((point, index) => {
      const [x, y] = projectPoint(point, bbox, size)
      return `${index === 0 ? "M" : "L"}${x} ${y}`
    })
    .join(" ")
}

function pathFromPolygon(rings: number[][][], bbox: BBox, size: number) {
  return rings
    .map((ring) => `${pathFromLine(ring, bbox, size)} Z`)
    .join(" ")
}

function geometryToPath(geometry: Geometry, bbox: BBox, size: number) {
  switch (geometry.type) {
    case "LineString":
      return pathFromLine(geometry.coordinates, bbox, size)
    case "MultiLineString":
      return geometry.coordinates.map((line) => pathFromLine(line, bbox, size)).join(" ")
    case "Polygon":
      return pathFromPolygon(geometry.coordinates, bbox, size)
    case "MultiPolygon":
      return geometry.coordinates.map((poly) => pathFromPolygon(poly, bbox, size)).join(" ")
    default:
      return ""
  }
}

function pointInBBox([lon, lat]: Point, bbox: BBox) {
  return lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]
}

function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function pickStreetLabels(features: StoredFeature[], bbox: BBox, size: number) {
  const labels: Array<{ name: string; x: number; y: number }> = []
  const seenNames = new Set<string>()

  const candidates = features
    .filter((feature) => {
      const { name, labelPoint, labelLength } = feature.properties
      return Boolean(name && labelPoint && labelLength && labelLength >= 55 && pointInBBox(labelPoint, bbox))
    })
    .sort((a, b) => (b.properties.labelLength ?? 0) - (a.properties.labelLength ?? 0))

  for (const feature of candidates) {
    const { name, labelPoint } = feature.properties

    if (!name || !labelPoint || seenNames.has(name)) continue

    const [x, y] = projectPoint(labelPoint, bbox, size)
    if (x < 26 || x > size - 26 || y < 22 || y > size - 18) continue

    const overlaps = labels.some((label) => Math.hypot(label.x - x, label.y - y) < 42)
    if (overlaps) continue

    labels.push({ name, x, y })
    seenNames.add(name)

    if (labels.length >= 10) break
  }

  return labels
}

function userMarkerSvg(userLat: number, userLon: number, bbox: BBox, size: number) {
  const [rawX, rawY] = projectPointRaw([userLon, userLat], bbox, size)
  const center = size / 2

  if (rawX >= 0 && rawX <= size && rawY >= 0 && rawY <= size) {
    const [x, y] = [Number(rawX.toFixed(1)), Number(rawY.toFixed(1))]
    return `
  <g>
    <circle cx="${x}" cy="${y}" r="6" fill="#2563eb" stroke="#ffffff" stroke-width="2" />
    <circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#2563eb" stroke-opacity="0.18" stroke-width="4" />
    <text x="${x + 10}" y="${y - 8}" fill="#1d4ed8" font-size="11" font-weight="700" paint-order="stroke" stroke="#ffffff" stroke-width="3">Tu</text>
  </g>`.trim()
  }

  const dx = rawX - center
  const dy = rawY - center

  if (dx === 0 && dy === 0) return ""

  const padding = 22
  const ratios = [
    dx > 0 ? (size - padding - center) / dx : Number.POSITIVE_INFINITY,
    dx < 0 ? (padding - center) / dx : Number.POSITIVE_INFINITY,
    dy > 0 ? (size - padding - center) / dy : Number.POSITIVE_INFINITY,
    dy < 0 ? (padding - center) / dy : Number.POSITIVE_INFINITY,
  ].filter((value) => Number.isFinite(value) && value > 0)

  const ratio = Math.min(...ratios)
  const x = Number((center + dx * ratio).toFixed(1))
  const y = Number((center + dy * ratio).toFixed(1))
  const angle = Number((Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1))

  return `
  <g transform="translate(${x} ${y}) rotate(${angle})">
    <circle r="13" fill="#ffffff" fill-opacity="0.92" stroke="#bfdbfe" stroke-width="1.5" />
    <path d="M-5 -6 L7 0 L-5 6 L-1 0 Z" fill="#2563eb" />
    <text x="0" y="23" text-anchor="middle" fill="#1d4ed8" font-size="10" font-weight="700" paint-order="stroke" stroke="#ffffff" stroke-width="3">Tu</text>
  </g>`.trim()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const lat = Number(searchParams.get("lat"))
    const lon = Number(searchParams.get("lon"))
    const userLat = Number(searchParams.get("userLat"))
    const userLon = Number(searchParams.get("userLon"))
    const side = clamp(Number(searchParams.get("side") ?? 500), 250, 1000)
    const px = clamp(Number(searchParams.get("px") ?? 320), 200, 800)

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response("Missing or invalid lat/lon", { status: 400 })
    }

    const [buildings, streets] = await Promise.all([loadLayer("buildings"), loadLayer("streets")])

    const bbox = getBBoxAround(lat, lon, side / 2)

    const streetsInView = streets.features.filter((feature) => bboxIntersects(feature.bbox, bbox))
    const buildingsInView = buildings.features.filter((feature) => bboxIntersects(feature.bbox, bbox))
    const streetLabels = pickStreetLabels(streetsInView, bbox, px)

    const streetPaths = streetsInView
      .map((feature) => geometryToPath(feature.geometry, bbox, px))
      .filter(Boolean)
      .map((d) => `<path d="${d}" />`)
      .join("")

    const buildingPaths = buildingsInView
      .map((feature) => geometryToPath(feature.geometry, bbox, px))
      .filter(Boolean)
      .map((d) => `<path d="${d}" />`)
      .join("")

    const streetLabelText = streetLabels
      .map(
        (label) =>
          `<text x="${label.x}" y="${label.y}" text-anchor="middle">${escapeXml(label.name)}</text>`,
      )
      .join("")

    const userMarker =
      Number.isFinite(userLat) && Number.isFinite(userLon) ? userMarkerSvg(userLat, userLon, bbox, px) : ""

    const center = px / 2

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${px}" width="${px}" height="${px}">
  <rect width="100%" height="100%" fill="#f8fafc" rx="18" ry="18" />
  <g fill="none" stroke="#cbd5e1" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    ${streetPaths}
  </g>
  <g fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.7" fill-rule="evenodd">
    ${buildingPaths}
  </g>
  <g fill="#475569" font-size="10" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif" paint-order="stroke" stroke="#f8fafc" stroke-width="3" stroke-linejoin="round">
    ${streetLabelText}
  </g>
  ${userMarker}
  <circle cx="${center}" cy="${center}" r="7" fill="#ef4444" />
  <circle cx="${center}" cy="${center}" r="14" fill="none" stroke="#ef4444" stroke-opacity="0.25" stroke-width="3" />
</svg>`.trim()

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render mini-map."
    return new Response(message, { status: 500 })
  }
}
