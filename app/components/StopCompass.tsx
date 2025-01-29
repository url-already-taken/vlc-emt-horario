"use client";

import React, { useEffect, useRef, useState } from "react";

interface CompassPoint {
  x: number;
  y: number;
}

interface StopCompassProps {
  points?: CompassPoint[];
}

export default function StopCompass({ points = [] }: StopCompassProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [heading, setHeading] = useState(0); // 0..360 degrees
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Handle orientation changes
  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      let hd = 0;
      // iOS
      if (typeof event.webkitCompassHeading === "number") {
        hd = event.webkitCompassHeading;
      } else if (typeof event.alpha === "number") {
        // others typically alpha=0 means device facing East, so let's rotate to make alpha=0 = north
        hd = 360 - event.alpha;
      }
      if (hd < 0) {
        hd += 360;
      }
      setHeading(Math.round(hd));
    }

    if (permissionRequested) {
      window.addEventListener("deviceorientation", handleOrientation);
    }
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [permissionRequested]);

  // Redraw whenever heading or points change
  useEffect(() => {
    drawCanvas();
  }, [heading, points]);

  function drawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Move origin to center of canvas
    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Rotate opposite to heading so heading=0 is 'north'
    ctx.rotate(-heading * (Math.PI / 180));

    // Draw the points (forming a triangle)
    ctx.beginPath();
    if (points.length) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
      ctx.fill();
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Resize canvas to match window size
  useEffect(() => {
    function resize() {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = 400; // Fixed height for the canvas
      drawCanvas();
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Request iOS permission
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
            setPermissionRequested(true);
          } else {
            alert("Permission not granted for sensor data.");
          }
        })
        .catch(console.error);
    } else {
      setPermissionRequested(true); // Non-iOS13+ browsers
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <div style={{ textAlign: "center", padding: "1em" }}>
        <button
          onClick={requestOrientationPermission}
          style={{
            fontSize: "1em",
            padding: "10px 20px",
            marginTop: "1em",
            cursor: "pointer",
          }}
        >
          Enable Compass
        </button>
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
  );
}
