import fs from "node:fs/promises"
import path from "node:path"
import { clamp, getBBoxAroundMeters } from "@/lib/geoUtils"

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

function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function toDisplayStreetName(name: string) {
  const shortened = name
    .trim()
    .replace(/^CARRER\s+/i, "")
    .replace(/^CALLE\s+/i, "")
    .replace(/^AVINGUDA\s+/i, "Av. ")
    .replace(/^AVENIDA\s+/i, "Av. ")
    .replace(/^PASSEIG\s+/i, "Pg. ")
    .replace(/^PASEO\s+/i, "Pso. ")
    .replace(/^PLAÇA\s+/i, "Pl. ")
    .replace(/^PLAZA\s+/i, "Pl. ")

  return shortened
    .toLocaleLowerCase("es-ES")
    .replace(/(^|[\s/-])([\p{L}])/gu, (match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("es-ES")}`)
}

function lineStringsFromGeometry(geometry: Geometry) {
  switch (geometry.type) {
    case "LineString":
      return [geometry.coordinates]
    case "MultiLineString":
      return geometry.coordinates
    default:
      return []
  }
}

function normalizeAngle(angle: number) {
  if (angle > 90) return angle - 180
  if (angle < -90) return angle + 180
  return angle
}

function pickStreetLabels(features: StoredFeature[], bbox: BBox, size: number, sideMeters: number) {
  const labels: Array<{ name: string; x: number; y: number; angle: number; textLength: number; fontSize: number }> = []
  const maxLabels = sideMeters <= 250 ? 12 : sideMeters <= 500 ? 14 : 18

  const streetGroups = features
    .map((feature) => {
      const rawName = feature.properties.name?.trim()
      if (!rawName) return null

      const name = toDisplayStreetName(rawName)
      const minSegmentLength = Math.max(14, Math.min(30, name.length * 2.4))
      const segmentCandidates: Array<{
        name: string
        x: number
        y: number
        angle: number
        textLength: number
        fontSize: number
        priority: number
      }> = []

      for (const line of lineStringsFromGeometry(feature.geometry)) {
        for (let index = 1; index < line.length; index += 1) {
          const start = line[index - 1]
          const end = line[index]
          const [x1, y1] = projectPointRaw(start, bbox, size)
          const [x2, y2] = projectPointRaw(end, bbox, size)
          const dx = x2 - x1
          const dy = y2 - y1
          const segmentLength = Math.hypot(dx, dy)

          if (segmentLength < minSegmentLength) continue

          const midX = (x1 + x2) / 2
          const midY = (y1 + y2) / 2

          if (midX < 22 || midX > size - 22 || midY < 20 || midY > size - 20) continue

          const textLength = Math.max(18, Math.min(segmentLength - 4, 88))
          const fontSize = Math.max(5.6, Math.min(7.4, textLength / Math.max(name.length * 0.72, 1)))

          segmentCandidates.push({
            name,
            x: Number(midX.toFixed(1)),
            y: Number(midY.toFixed(1)),
            angle: Number(normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)),
            textLength: Number(textLength.toFixed(1)),
            fontSize: Number(fontSize.toFixed(1)),
            priority: segmentLength,
          })
        }
      }

      if (!segmentCandidates.length) return null

      return {
        name,
        candidates: segmentCandidates.sort((a, b) => b.priority - a.priority).slice(0, 4),
        priority: Math.max(...segmentCandidates.map((candidate) => candidate.priority)),
      }
    })
    .filter(
      (
        street,
      ): street is {
        name: string
        candidates: Array<{
          name: string
          x: number
          y: number
          angle: number
          textLength: number
          fontSize: number
          priority: number
        }>
        priority: number
      } => street !== null,
    )

  const streets = [...streetGroups.reduce((acc, street) => {
    const existing = acc.get(street.name)

    if (!existing) {
      acc.set(street.name, {
        name: street.name,
        candidates: [...street.candidates],
        priority: street.priority,
      })
      return acc
    }

    existing.candidates.push(...street.candidates)
    existing.priority = Math.max(existing.priority, street.priority)
    existing.candidates.sort((a, b) => b.priority - a.priority)
    existing.candidates = existing.candidates.slice(0, 6)

    return acc
  }, new Map<string, {
    name: string
    candidates: Array<{
      name: string
      x: number
      y: number
      angle: number
      textLength: number
      fontSize: number
      priority: number
    }>
    priority: number
  }>()).values()].sort((a, b) => b.priority - a.priority)

  for (const street of streets) {
    const fittingCandidate = street.candidates.find((candidate) => {
      const candidateRadius = Math.max(9, candidate.textLength * 0.34)

      return !labels.some((label) => {
        const labelRadius = Math.max(9, label.textLength * 0.34)
        return Math.hypot(label.x - candidate.x, label.y - candidate.y) < candidateRadius + labelRadius
      })
    })

    if (!fittingCandidate) continue

    labels.push(fittingCandidate)

    if (labels.length >= maxLabels) break
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

function centerMarkerSvg(mode: string, center: number) {
  if (mode === "none") return ""

  if (mode === "user") {
    return `
  <circle cx="${center}" cy="${center}" r="7" fill="#2563eb" />
  <circle cx="${center}" cy="${center}" r="14" fill="none" stroke="#2563eb" stroke-opacity="0.25" stroke-width="3" />`.trim()
  }

  return `
  <circle cx="${center}" cy="${center}" r="7" fill="#ef4444" />
  <circle cx="${center}" cy="${center}" r="14" fill="none" stroke="#ef4444" stroke-opacity="0.25" stroke-width="3" />`.trim()
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
    const centerMode = searchParams.get("center") ?? "stop"

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response("Missing or invalid lat/lon", { status: 400 })
    }

    const [buildings, streets] = await Promise.all([loadLayer("buildings"), loadLayer("streets")])

    const bbox = getBBoxAroundMeters(lat, lon, side / 2)

    const streetsInView = streets.features.filter((feature) => bboxIntersects(feature.bbox, bbox))
    const buildingsInView = buildings.features.filter((feature) => bboxIntersects(feature.bbox, bbox))
    const streetLabels = pickStreetLabels(streetsInView, bbox, px, side)

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
          `<text transform="translate(${label.x} ${label.y}) rotate(${label.angle})" text-anchor="middle" dominant-baseline="central" textLength="${label.textLength}" lengthAdjust="spacing" font-size="${label.fontSize}">${escapeXml(label.name)}</text>`,
      )
      .join("")

    const userMarker =
      Number.isFinite(userLat) && Number.isFinite(userLon) ? userMarkerSvg(userLat, userLon, bbox, px) : ""

    const center = px / 2
    const centerMarker = centerMarkerSvg(centerMode, center)

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${px}" width="${px}" height="${px}">
  <rect width="100%" height="100%" fill="#f8fafc" rx="18" ry="18" />
  <g fill="none" stroke="#cbd5e1" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    ${streetPaths}
  </g>
  <g fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.7" fill-rule="evenodd">
    ${buildingPaths}
  </g>
  <g fill="#64748b" fill-opacity="0.92" font-weight="600" font-family="ui-sans-serif, system-ui, sans-serif" letter-spacing="0.12" paint-order="stroke" stroke="#f8fafc" stroke-opacity="0.96" stroke-width="2.1" stroke-linejoin="round">
    ${streetLabelText}
  </g>
  ${userMarker}
  ${centerMarker}
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
