"use client"

import React, { useEffect, useRef, useState } from "react"

/**
 * A simple interface for the points (x,y) we draw and rotate.
 * Adjust or extend as needed for your data.
 */
interface CompassPoint {
  x: number
  y: number
}

/**
 * Props for StopCompass:
 * - `points`: array of points to render. They can be updated externally at runtime.
 */
interface StopCompassProps {
  points?: CompassPoint[]
}

/**
 * A React component that displays a button to request device-orientation permission (iOS),
 * and a canvas that rotates the given points based on the device compass heading.
 *
 * Usage:
 *   <StopCompass points={[{x: -50, y: -50}, {x: 50, y: -50}, {x: 0, y: 60}]} />
 */
export default function StopCompass({ points = [] }: StopCompassProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [heading, setHeading] = useState(0) // 0..360 degrees
  const [permissionRequested, setPermissionRequested] = useState(false)

  // Handle orientation changes
  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      let hd = 0
      // iOS
      if (typeof event.webkitCompassHeading === "number") {
        hd = event.webkitCompassHeading
      } else if (typeof event.alpha === "number") {
        // others typically alpha=0 means device facing East, so let's rotate to make alpha=0 = north
        hd = 360 - event.alpha
      }
      if (hd < 0) {
        hd += 360
      }
      setHeading(Math.round(hd))
    }

    // Add listener only if we've explicitly requested permission (for iOS) or on Android
    if (permissionRequested) {
      window.addEventListener("deviceorientation", handleOrientation)
    }
    return () => window.removeEventListener("deviceorientation", handleOrientation)
  }, [permissionRequested])

  // Redraw whenever heading or points change
  useEffect(() => {
    drawCanvas()
  }, [heading, points])

  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    // Clear
    ctx.clearRect(0, 0, width, height)

    // Move origin to center
    ctx.save()
    ctx.translate(width / 2, height / 2)
    // Rotate opposite to heading so heading=0 is 'north'
    ctx.rotate(-heading * (Math.PI / 180))

    // Draw the points
    ctx.beginPath()
    // If you want them connected: remove if you only want separate shapes.
    if (points.length) {
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.closePath()
      ctx.fillStyle = "rgba(255,0,0,0.2)"
      ctx.fill()
      ctx.strokeStyle = "red"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.restore()
  }

  // Ensures the canvas fills the parent size (or window).
  // Adjust as you like.
  useEffect(() => {
    function resize() {
      if (!canvasRef.current) return
      canvasRef.current.width = window.innerWidth
      canvasRef.current.height = 400 // Example fixed height
      drawCanvas()
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  // Request iOS permission
  function requestOrientationPermission() {
    // Only needed on iOS 13+; otherwise just set permissionRequested = true
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      // @ts-expect-error iOS property
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      // @ts-expect-error iOS property
      DeviceOrientationEvent.requestPermission()
        .then((permissionState: string) => {
          if (permissionState === "granted") {
            setPermissionRequested(true)
          } else {
            alert("Permission not granted for sensor data.")
          }
        })
        .catch(console.error)
    } else {
      // Non-iOS13+ browsers
      setPermissionRequested(true)
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <div style={{ textAlign: "center", padding: "1em" }}>
        <button onClick={requestOrientationPermission}>Enable Compass</button>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "400px",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
