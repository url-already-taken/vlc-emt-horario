"use client"

import React, { useEffect, useRef, useState } from "react"
import { useBusStops } from "../../lib/BusStopContext"
import { deg2rad, distanceKm, getBearing } from "../../lib/geoUtils"

export default function CompassOverlay() {
  const { nearestStops, userLocation } = useBusStops()
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
  }, [heading, nearestStops, userLocation])

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

    const scalePxPerKm = 5
    const userLat = userLocation.latitude
    const userLon = userLocation.longitude

    nearestStops.forEach((stop) => {
      const distKm = distanceKm(userLat, userLon, stop.lat, stop.lon)
      const bearing = getBearing(userLat, userLon, stop.lat, stop.lon)
      const angleRad = deg2rad(bearing)

      const r = distKm * scalePxPerKm
      const x = r * Math.cos(angleRad)
      const y = r * Math.sin(angleRad)

      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.fillStyle = "red"
      ctx.fill()

      ctx.font = "12px sans-serif"
      ctx.fillStyle = "black"
      ctx.fillText(stop.name, x + 8, y + 4)
    })

    ctx.restore()
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