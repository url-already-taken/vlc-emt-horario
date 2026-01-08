"use client"

import React, { useEffect, useRef } from "react"
import { useBusStops } from "../../lib/BusStopContext"
import { deg2rad, distanceKm, getBearing } from "../../lib/geoUtils"
import type { BusStop, RouteDirectionInfo } from "../../lib/busStopTypes"
import { useDeviceHeading } from "../../lib/useDeviceHeading"

const ROUTE_LINE_COLOR = "rgba(59, 130, 246, 0.65)"
const ROUTE_LINE_WIDTH = 1.5
const ROUTE_DASH_PATTERN: number[] = [4, 4]
const BACKTRACK_RATIO = 0.35
const BACKTRACK_MAX_PX = 90
const FORWARD_CLAMP_PX = 150
const FORWARD_RATIO = 0.55
const ROUTE_BADGE_RADIUS = 12
const ROUTE_BADGE_FILL = "#ffffff"
const ROUTE_BADGE_TEXT = "#1d4ed8"
const RADAR_RADIUS_RATIO = 0.42
const MIN_VISUAL_DISTANCE_KM = 0.05
const MAX_VISUAL_DISTANCE_KM = 2.5
const RANGE_RINGS_METERS = [50, 100, 250, 500]
const RANGE_RING_STROKE = "rgba(148, 163, 184, 0.5)"
const RANGE_LABEL_COLOR = "#475569"

export default function CompassOverlay() {
  const { nearestStops, userLocation, routeDirections, stops } = useBusStops()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const headingRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)
  const needsDrawRef = useRef(true)
  const drawCanvasRef = useRef<() => void>(() => {})
  const { heading } = useDeviceHeading({ enabled: true })

  useEffect(() => {
    if (heading == null) return
    headingRef.current = heading
    needsDrawRef.current = true
  }, [heading])

  useEffect(() => {
    needsDrawRef.current = true
  }, [nearestStops, userLocation, routeDirections, stops])

  useEffect(() => {
    function renderLoop() {
      if (needsDrawRef.current) {
        drawCanvasRef.current()
        needsDrawRef.current = false
      }
      rafIdRef.current = window.requestAnimationFrame(renderLoop)
    }

    rafIdRef.current = window.requestAnimationFrame(renderLoop)

    return () => {
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [])

  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas || !userLocation) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const cssWidth = canvas.clientWidth || window.innerWidth
    const cssHeight = canvas.clientHeight || window.innerHeight
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    ctx.save()
    ctx.translate(cssWidth / 2, cssHeight / 2)
    const userLat = userLocation.latitude
    const userLon = userLocation.longitude
    const stopLookup = new Map<string, BusStop>(stops.map((stop) => [stop.stopId, stop]))
    const radiusPx = Math.min(cssWidth, cssHeight) * RADAR_RADIUS_RATIO
    const distancesKm = nearestStops
      .map((stop) => distanceKm(userLat, userLon, Number(stop.lat), Number(stop.lon)))
      .filter((value) => Number.isFinite(value))
    const rawMaxDist = distancesKm.length ? Math.max(...distancesKm) : MIN_VISUAL_DISTANCE_KM
    const normalizedMaxDist = clamp(rawMaxDist, MIN_VISUAL_DISTANCE_KM, MAX_VISUAL_DISTANCE_KM)
    const scalePxPerKm = radiusPx / normalizedMaxDist

    drawRangeRings(ctx, {
      scalePxPerKm,
      maxRadiusPx: radiusPx,
    })

    // Разворачиваем canvas так, чтобы "вперёд телефона" всегда было вверху экрана.
    ctx.rotate(-headingRef.current * (Math.PI / 180))

    drawForwardMarker(ctx)

    // Рисуем "я" в центре
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, 2 * Math.PI)
    ctx.fillStyle = "blue"
    ctx.fill()

    const projectPoint = (lat: number, lon: number) => {
      const distKm = distanceKm(userLat, userLon, lat, lon)
      const bearing = getBearing(userLat, userLon, lat, lon)
      const angleRad = deg2rad(bearing)
      const r = distKm * scalePxPerKm
      const x = r * Math.sin(angleRad)
      const y = -r * Math.cos(angleRad)
      return { x, y }
    }

    nearestStops.forEach((stop) => {
      // Проверяем, что координаты остановки - числа
      const stopLat = Number(stop.lat)
      const stopLon = Number(stop.lon)
      
      // Вычисляем расстояние и азимут
      const { x, y } = projectPoint(stopLat, stopLon)

      // Отрисовываем только видимые в текущем масштабе точки
      if (Math.abs(x) < cssWidth / 2 && Math.abs(y) < cssHeight / 2) {
        drawDirectionLines(ctx, {
          stopX: x,
          stopY: y,
          projectPoint,
          stopLookup,
          directions: routeDirections?.[stop.stopId] ?? [],
        })

        ctx.beginPath()
        ctx.arc(x, y, 8, 0, 2 * Math.PI)
        ctx.fillStyle = "#ff4757"
        ctx.fill()

        // Добавляем текст с названием остановки
        ctx.font = "14px Arial"
        ctx.fillStyle = "black"
        ctx.textAlign = "center"
        ctx.fillText(formatStopName(stop.name), x, y - 12)
      }
    })

    ctx.restore()
  }

  function formatStopName(name?: string): string {
    if (!name) return ""
    if (name.includes(" - ")) {
      return name.split(" - ")[1]
    }
    return name
  }

  function handleResize() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio ?? 1
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    needsDrawRef.current = true
  }

  useEffect(() => {
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  function drawDirectionLines(
    ctx: CanvasRenderingContext2D,
    {
      directions,
      stopX,
      stopY,
      projectPoint,
      stopLookup,
    }: {
      directions: RouteDirectionInfo[]
      stopX: number
      stopY: number
      projectPoint: (lat: number, lon: number) => { x: number; y: number }
      stopLookup: Map<string, BusStop>
    },
  ) {
    if (!directions?.length) return

    directions.forEach((direction) => {
      const neighbor = stopLookup.get(direction.neighborStopId)
      if (!neighbor) return

      const neighborPoint = projectPoint(neighbor.lat, neighbor.lon)
      if (!neighborPoint) return

      const forwardVector = {
        x: neighborPoint.x - stopX,
        y: neighborPoint.y - stopY,
      }
      const forwardLength = Math.hypot(forwardVector.x, forwardVector.y)
      if (forwardLength === 0) return

      const unitX = forwardVector.x / forwardLength
      const unitY = forwardVector.y / forwardLength
      const effectiveForwardLength = Math.min(forwardLength * FORWARD_RATIO, FORWARD_CLAMP_PX)
      const scaledVector = {
        x: unitX * effectiveForwardLength,
        y: unitY * effectiveForwardLength,
      }
      const lineEnd = {
        x: stopX + scaledVector.x,
        y: stopY + scaledVector.y,
      }
      const backtrackLength = Math.min(effectiveForwardLength * BACKTRACK_RATIO, BACKTRACK_MAX_PX)
      const backwardPoint = {
        x: stopX - unitX * backtrackLength,
        y: stopY - unitY * backtrackLength,
      }
      const badgeOffset = Math.min(8, effectiveForwardLength * 0.15)
      const badgePoint = {
        x: lineEnd.x + unitX * badgeOffset,
        y: lineEnd.y + unitY * badgeOffset,
      }

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(backwardPoint.x, backwardPoint.y)
      ctx.lineTo(stopX, stopY)
      ctx.lineTo(lineEnd.x, lineEnd.y)
      ctx.strokeStyle = ROUTE_LINE_COLOR
      ctx.lineWidth = ROUTE_LINE_WIDTH
      ctx.setLineDash(ROUTE_DASH_PATTERN)
      ctx.stroke()
      ctx.restore()

      // точка в начале сегмента
      ctx.beginPath()
      ctx.arc(backwardPoint.x, backwardPoint.y, 3, 0, 2 * Math.PI)
      ctx.fillStyle = ROUTE_LINE_COLOR
      ctx.fill()

      drawRouteBadge(ctx, {
        centerX: badgePoint.x,
        centerY: badgePoint.y,
        label: direction.lineShortName || direction.lineId,
      })
    })
  }

function drawRouteBadge(
    ctx: CanvasRenderingContext2D,
    {
      centerX,
      centerY,
      label,
    }: {
      centerX: number
      centerY: number
      label: string
    },
  ) {
    const text = label?.slice(0, 3) || "?"

    ctx.beginPath()
    ctx.arc(centerX, centerY, ROUTE_BADGE_RADIUS, 0, 2 * Math.PI)
    ctx.fillStyle = ROUTE_BADGE_FILL
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = ROUTE_LINE_COLOR
    ctx.stroke()

    ctx.font = "10px Inter, system-ui, sans-serif"
    ctx.fillStyle = ROUTE_BADGE_TEXT
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, centerX, centerY)
  }

  drawCanvasRef.current = drawCanvas

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function drawRangeRings(
  ctx: CanvasRenderingContext2D,
  { scalePxPerKm, maxRadiusPx }: { scalePxPerKm: number; maxRadiusPx: number },
) {
  ctx.save()
  ctx.strokeStyle = RANGE_RING_STROKE
  ctx.lineWidth = 1
  ctx.setLineDash([6, 6])
  let labeled = false
  RANGE_RINGS_METERS.forEach((meters) => {
    const radiusPx = (meters / 1000) * scalePxPerKm
    if (radiusPx < 15 || radiusPx > maxRadiusPx) return
    ctx.beginPath()
    ctx.arc(0, 0, radiusPx, 0, 2 * Math.PI)
    ctx.stroke()

    if (!labeled) {
      ctx.save()
      ctx.setLineDash([])
      ctx.fillStyle = RANGE_LABEL_COLOR
      ctx.font = "10px Inter, system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillText(`${meters} m`, 0, -radiusPx - 4)
      ctx.restore()
      labeled = true
    }
  })
  ctx.restore()
}

function drawForwardMarker(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.fillStyle = "rgba(59, 130, 246, 0.85)"
  ctx.strokeStyle = "rgba(37, 99, 235, 0.9)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, -50)
  ctx.lineTo(10, -30)
  ctx.lineTo(-10, -30)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
