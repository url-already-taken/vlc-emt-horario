"use client"

import React, { useEffect, useRef, useState } from "react"

// Minimal bus stop type
type BusStop = {
  stopId: string
  name: string
  lat: string
  lon: string
}

// Props: we receive an array of up to 5 "nearest stops"
interface CompassOverlayProps {
  stops: BusStop[]
}

// A simple function converting degrees to radians
function deg2rad(deg: number) {
  return (deg * Math.PI) / 180
}

// Approx distance in km between lat/lon points (useful if you want to scale your canvas)
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

/**
 * A React component that places an absolutely positioned <canvas>
 * over the entire viewport and draws user position + 5 stops,
 * rotating them based on device orientation heading.
 */
export default function CompassOverlay({ stops }: CompassOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [heading, setHeading] = useState(0) // 0..360 degrees

  // Request device orientation, handle iOS vs. others
  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      let hd = 0
      if (typeof event.webkitCompassHeading === "number") {
        // iOS
        hd = event.webkitCompassHeading
      } else if (typeof event.alpha === "number") {
        // Others typically supply alpha = 0 -> device facing East
        // We'll convert so that alpha=0 means "north" by subtracting from 360:
        hd = 360 - event.alpha
      }
      if (hd < 0) {
        hd += 360
      }
      setHeading(Math.round(hd))
    }

    function requestPermissionIfNeeded() {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        //@ts-expect-error - iOS only property
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        //@ts-expect-error - iOS only property
        DeviceOrientationEvent.requestPermission()
          .then((perm: string) => {
            if (perm === "granted") {
              window.addEventListener("deviceorientation", handleOrientation)
            }
          })
          .catch((err: any) => {
            console.error("Orientation permission not granted:", err)
          })
      } else {
        // Android or older iOS
        window.addEventListener("deviceorientation", handleOrientation)
      }
    }

    requestPermissionIfNeeded()

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation)
    }
  }, [])

  // Each time the heading or stops changes, re-draw
  useEffect(() => {
    drawCanvas()
  }, [heading, stops])

  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    // Clear background
    ctx.clearRect(0, 0, width, height)

    // Move origin to center
    ctx.save()
    ctx.translate(width / 2, height / 2)

    // Rotate opposite to heading so heading=0 means “north”
    ctx.rotate(-heading * (Math.PI / 180))

    // Draw user center (just a small circle at 0,0)
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, 2 * Math.PI)
    ctx.fillStyle = "blue"
    ctx.fill()

    // If you want to lay out stops in a ring at some distance,
    // you can scale them by how far they are from user, etc.
    // For example, pick a scale so each 1km = 5 pixels.
    const scalePxPerKm = 5

    // For each stop, compute approximate bearing and distance from user=0,0
    // But we do not have user lat/lon here unless you pass it. For now, let's assume
    // user lat/lon is 0,0 or we skip. If you do have user lat/lon, you’d compute that here.
    // We'll just place them in a circle for demonstration. 
    // If you want them truly accurate, pass user lat/lon as well, then compute bearing.

    // For demonstration, let’s assume the first 5 stops are in our “stops” array:
    // We'll pretend we have user lat/lon from context (this is just an example).
    // If you do have user location, do e.g.:
    //   userLat = ...
    //   userLon = ...
    //   dist = distanceKm(userLat, userLon, parseFloat(stop.lat), parseFloat(stop.lon))
    //   bearing = some function to get angle from user to that stop
    // We'll just place them in a spaced circle for demonstration:
    stops.forEach((stop, index) => {
      // Example: we put them each 3km away from center, spaced by 72 degrees
      // If you want real bearings, you'd do actual math with lat/lon
      const distKm = 3 + index // pretend each further
      const angleDeg = index * (360 / 5) // space them around
      const angleRad = angleDeg * (Math.PI / 180)

      // Convert distance * scale => radius in px
      const r = distKm * scalePxPerKm

      const x = r * Math.cos(angleRad)
      const y = r * Math.sin(angleRad)

      // Draw a circle for the stop
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.fillStyle = "red"
      ctx.fill()

      // Optional: label with stop name
      ctx.font = "12px sans-serif"
      ctx.fillStyle = "black"
      ctx.fillText(stop.name, x + 8, y + 4)
    })

    ctx.restore()
  }

  // Resize canvas to fill the screen
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="compassCanvas"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none", // so clicks pass through
        zIndex: 9999,
      }}
    />
  )
}
