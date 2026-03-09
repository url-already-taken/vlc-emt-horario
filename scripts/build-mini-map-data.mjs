import fs from "node:fs/promises"
import path from "node:path"
import shp from "shpjs"
import { simplify } from "@turf/simplify"

const ROOT = process.cwd()
const SOURCE_DIR = path.join(ROOT, "data", "source")
const OUT_DIR = path.join(ROOT, "data", "derived")

await fs.mkdir(OUT_DIR, { recursive: true })

const DATASETS = [
  {
    key: "buildings",
    zip: "cartografia-base-agrupacio-edificis-agrupacion_edificios.zip",
    allowed: new Set(["Polygon", "MultiPolygon"]),
    tolerance: 0.000008,
  },
  {
    key: "streets",
    zip: "eixos-de-carrer-ejes-de-calle.zip",
    allowed: new Set(["LineString", "MultiLineString"]),
    tolerance: 0.000015,
    enrichProperties: (feature, geometry) => {
      const name = normalizeStreetName(feature.properties)
      const { labelPoint, lineLength } = streetLabelData(geometry)

      return {
        name,
        labelPoint,
        labelLength: Number(lineLength.toFixed(1)),
      }
    },
  },
]

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

function flattenParsedShapefile(parsed) {
  if (parsed?.type === "FeatureCollection") return parsed.features ?? []

  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => item?.features ?? [])
  }

  if (parsed && typeof parsed === "object") {
    return Object.values(parsed).flatMap((item) => item?.features ?? [])
  }

  throw new Error("Unsupported shapefile output")
}

function walkCoords(coords, visit) {
  if (!Array.isArray(coords)) return
  if (typeof coords[0] === "number") {
    visit(coords)
    return
  }
  for (const child of coords) {
    walkCoords(child, visit)
  }
}

function geometryBBox(geometry) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  walkCoords(geometry.coordinates, ([x, y]) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  })

  return [minX, minY, maxX, maxY]
}

function normalizeStreetName(properties = {}) {
  const preferred = typeof properties.TIPNOMCALLE === "string" ? properties.TIPNOMCALLE.trim() : ""
  if (preferred) return preferred

  const type = typeof properties.Tipo_calle === "string" ? properties.Tipo_calle.trim() : ""
  const name = typeof properties.Nombre_call === "string" ? properties.Nombre_call.trim() : ""

  return `${type} ${name}`.trim() || null
}

function segmentLengthMeters([lon1, lat1], [lon2, lat2]) {
  const avgLat = ((lat1 + lat2) / 2) * (Math.PI / 180)
  const dx = (lon2 - lon1) * 111320 * Math.cos(avgLat)
  const dy = (lat2 - lat1) * 111320
  return Math.hypot(dx, dy)
}

function lineLengthMeters(coords) {
  let total = 0

  for (let index = 1; index < coords.length; index += 1) {
    total += segmentLengthMeters(coords[index - 1], coords[index])
  }

  return total
}

function pointAlongLine(coords, targetDistance) {
  if (!coords.length) return null
  if (coords.length === 1) return coords[0]

  let covered = 0

  for (let index = 1; index < coords.length; index += 1) {
    const start = coords[index - 1]
    const end = coords[index]
    const segment = segmentLengthMeters(start, end)

    if (segment === 0) continue

    if (covered + segment >= targetDistance) {
      const ratio = (targetDistance - covered) / segment

      return [
        Number((start[0] + (end[0] - start[0]) * ratio).toFixed(6)),
        Number((start[1] + (end[1] - start[1]) * ratio).toFixed(6)),
      ]
    }

    covered += segment
  }

  return coords[coords.length - 1]
}

function streetLabelData(geometry) {
  const lines = geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates

  let bestLine = null
  let bestLength = 0

  for (const line of lines) {
    const currentLength = lineLengthMeters(line)
    if (currentLength > bestLength) {
      bestLine = line
      bestLength = currentLength
    }
  }

  if (!bestLine || bestLength === 0) {
    return {
      labelPoint: null,
      lineLength: 0,
    }
  }

  return {
    labelPoint: pointAlongLine(bestLine, bestLength / 2),
    lineLength: bestLength,
  }
}

for (const dataset of DATASETS) {
  const zipPath = path.join(SOURCE_DIR, dataset.zip)
  const zipBuffer = await fs.readFile(zipPath)
  const parsed = await shp(toArrayBuffer(zipBuffer))
  const features = flattenParsedShapefile(parsed)

  const cleaned = features
    .filter((feature) => feature?.geometry?.type && dataset.allowed.has(feature.geometry.type))
    .map((feature, index) => {
      const simplified = simplify(feature, {
        tolerance: dataset.tolerance,
        highQuality: false,
        mutate: false,
      })

      return {
        type: "Feature",
        properties: {
          id: index,
          ...(dataset.enrichProperties ? dataset.enrichProperties(feature, simplified.geometry) : {}),
        },
        geometry: simplified.geometry,
        bbox: geometryBBox(simplified.geometry),
      }
    })

  const out = {
    type: "FeatureCollection",
    features: cleaned,
  }

  await fs.writeFile(path.join(OUT_DIR, `${dataset.key}.json`), JSON.stringify(out))
  console.log(`Saved ${dataset.key}: ${cleaned.length} features`)
}

console.log("Mini-map data prepared.")
