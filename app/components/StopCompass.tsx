import React, { useEffect, useRef, useState } from "react"

interface CompassPoint {
  x: number
  y: number
}

interface StopCompassProps {
  points?: CompassPoint[]
}

export default function StopCompass({ points = [] }: StopCompassProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [heading, setHeading] = useState(0) // 0..360 degrees
  const [permissionRequested, setPermissionRequested] = useState(false)

  // Handle orientation changes
  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      let hd = 0
      // iOS-specific: check for webkitCompassHeading
      if (typeof event.webkitCompassHeading === "number") {
        hd = event.webkitCompassHeading
      } else if (typeof event.alpha === "number") {
        // Other devices: alpha=0 typically means device facing East, so we adjust
        hd = 360 - event.alpha
      }
      if (hd < 0) {
        hd += 360
      }
      setHeading(Math.round(hd)) // Update heading state
    }

    // Add listener only if permission has been requested
    if (permissionRequested) {
      window.addEventListener("deviceorientation", handleOrientation)
    }

    return () => window.removeEventListener("deviceorientation", handleOrientation)
  }, [permissionRequested])

  // Redraw whenever heading or points change
  useEffect(() => {
    drawCanvas()
  }, [heading, points])

  // Drawing logic for the canvas
  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height) // Clear canvas before redrawing

    // Move origin to center of canvas for easier rotation
    ctx.save()
    ctx.translate(width / 2, height / 2)

    // Rotate opposite to heading so heading=0 = 'north'
    ctx.rotate(-heading * (Math.PI / 180))

    // Draw points (connect them to form a shape)
    ctx.beginPath()
    if (points.length) {
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.closePath()
      ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
      ctx.fill()
      ctx.strokeStyle = "red"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.restore() // Restore the context to the original state
  }

  // Handle window resize to update canvas size dynamically
  useEffect(() => {
    function resize() {
      if (!canvasRef.current) return
      const canvas = canvasRef.current
      canvas.width = window.innerWidth // Make canvas full width
      canvas.height = 400 // Set height as desired
      drawCanvas()
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  // Request permission for device orientation (for iOS)
  function requestOrientationPermission() {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      // @ts-expect-error iOS property
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      // @ts-expect-error iOS property
      DeviceOrientationEvent.requestPermission()
        .then((permissionState: string) => {
          if (permissionState === "granted") {
            setPermissionRequested(true) // Start listening for orientation changes
          } else {
            alert("Permission not granted for sensor data.")
          }
        })
        .catch(console.error)
    } else {
      setPermissionRequested(true) // Non-iOS13+ devices don't need explicit permission
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
          pointerEvents: "none", // Disable canvas interaction, just display
        }}
      />
    </div>
  )
}
