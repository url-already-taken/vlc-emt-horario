"use client"

import React, { useEffect, useRef, useState } from "react"
import { useBusStops } from "../../lib/BusStopContext"
import { deg2rad, distanceKm, getBearing } from "../../lib/geoUtils"
import type { BusStop, RouteDirectionInfo } from "../../lib/busStopTypes"

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

export default function CompassOverlay() {
  const { nearestStops, userLocation, routeDirections, stops } = useBusStops()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [heading, setHeading] = useState(0)

  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      let hd = 0
      if (typeof event.webkitCompassHeading === "number") {
        hd = event.webkitCompassHeading
      } else if (typeof event.alpha === "number") {
        // для браузеров, в которых нет webkitCompassHeading
        hd = 360 - event.alpha
      }
      if (hd < 0) hd += 360
      setHeading(Math.round(hd))
    }

    function requestPermissionIfNeeded() {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        // @ts-ignore
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        // @ts-ignore
        DeviceOrientationEvent.requestPermission()
          .then((perm: PermissionState) => {
            if (perm === "granted") {
              window.addEventListener("deviceorientation", handleOrientation)
            }
          })
          .catch(console.error)
      } else {
        window.addEventListener("deviceorientation", handleOrientation)
      }
    }

    requestPermissionIfNeeded()

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation)
    }
  }, [])

  useEffect(() => {
    drawCanvas()
  }, [heading, nearestStops, userLocation, routeDirections, stops])

  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas || !userLocation) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    ctx.save()
    ctx.translate(width / 2, height / 2)
    // Поворачиваем canvas в обратную сторону, чтобы "север" был всегда сверху.
    ctx.rotate(-heading * (Math.PI / 180))

    // Рисуем "я" в центре
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, 2 * Math.PI)
    ctx.fillStyle = "blue"
    ctx.fill()

    const scalePxPerKm = 1000 // Увеличиваем масштаб для лучшей видимости
    const userLat = userLocation.latitude
    const userLon = userLocation.longitude
    const stopLookup = new Map<string, BusStop>(stops.map((stop) => [stop.stopId, stop]))

    const projectPoint = (lat: number, lon: number) => {
      const distKm = distanceKm(userLat, userLon, lat, lon)
      const bearing = getBearing(userLat, userLon, lat, lon)
      const adjustedBearing = (bearing - heading + 360) % 360
      const angleRad = deg2rad(adjustedBearing)
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
      if (Math.abs(x) < width / 2 && Math.abs(y) < height / 2) {
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
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    drawCanvas()
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

      const arrowTipOffset = Math.min(8, forwardLength * 0.2)
      const arrowTip = {
        x: neighborPoint.x + unitX * arrowTipOffset,
        y: neighborPoint.y + unitY * arrowTipOffset,
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
