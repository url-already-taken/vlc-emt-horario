"use client"

import React, { useEffect, useRef, useState } from "react"
import { useBusStops } from "../../lib/BusStopContext"

// Minimal bus stop type (можно удалить, если уже есть в контексте)
type BusStop = {
  stopId: string
  name: string
  lat: string
  lon: string
}

function deg2rad(deg: number) {
  return (deg * Math.PI) / 180
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
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

export default function CompassOverlay() {
    const { nearestStops = [], userLocation } = useBusStops() // FIX: Используем данные из контекста

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [heading, setHeading] = useState(0)

  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      let hd = 0
      if (typeof event.webkitCompassHeading === "number") {
        hd = event.webkitCompassHeading
      } else if (typeof event.alpha === "number") {
        hd = 360 - event.alpha
      }
      if (hd < 0) hd += 360
      setHeading(Math.round(hd))
    }

    function requestPermissionIfNeeded() {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        // @ts-ignore: iOS only property
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        // @ts-ignore: iOS only
        DeviceOrientationEvent.requestPermission()
          .then((perm) => {
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
  }, [heading, nearestStops, userLocation]) // FIX: Добавили userLocation в зависимости

  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas || !userLocation) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.rotate(-heading * (Math.PI / 180))

    // Draw user center
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, 2 * Math.PI)
    ctx.fillStyle = "blue"
    ctx.fill()

    const scalePxPerKm = 5
    const userLat = parseFloat(userLocation.latitude.toString()) // FIX: Приведение к числу
    const userLon = parseFloat(userLocation.longitude.toString())

    if (nearestStops.length === 0) return
    // FIX: Используем nearestStops из контекста
    nearestStops.forEach((stop, index) => {
        // Example: we put them each 3km away from center, spaced by 72 degrees
        // If you want real bearings, you'd do actual math with lat/lon
        const distKm = 3 + index // pretend each further
        const angleDeg = index * (360 / 5) // space them around
        const angleRad = angleDeg * (Math.PI / 180)

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

  // Функция для расчета направления (bearing)
  function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
    const dLon = deg2rad(lon2 - lon1)
    const y = Math.sin(dLon) * Math.cos(deg2rad(lat2))
    const x = 
      Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
      Math.sin(deg2rad(lat1)) * 
      Math.cos(deg2rad(lat2)) * 
      Math.cos(dLon)
    return (Math.atan2(y, x) * 180) / Math.PI
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
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  )
}