import fs from "node:fs/promises"
import path from "node:path"

export const dynamic = "force-dynamic"

type BBox = [number, number, number, number]

type Geometry =
  | { type: "LineString"; coordinates: number[][] }
  | { type: "MultiLineString"; coordinates: number[][][] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }

type StoredFeature = {
  type: "Feature"
  properties: { id: number }
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const lat = Number(searchParams.get("lat"))
    const lon = Number(searchParams.get("lon"))
    const side = clamp(Number(searchParams.get("side") ?? 500), 250, 1000)
    const px = clamp(Number(searchParams.get("px") ?? 320), 200, 800)

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response("Missing or invalid lat/lon", { status: 400 })
    }

    const [buildings, streets] = await Promise.all([loadLayer("buildings"), loadLayer("streets")])

    const bbox = getBBoxAround(lat, lon, side / 2)

    const streetsInView = streets.features.filter((feature) => bboxIntersects(feature.bbox, bbox))
    const buildingsInView = buildings.features.filter((feature) => bboxIntersects(feature.bbox, bbox))

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
