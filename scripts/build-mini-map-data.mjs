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
