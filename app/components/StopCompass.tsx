// StopCompass.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface StopCompassProps {
  isActive: boolean
  onToggle: (newState: boolean) => void
}

export default function StopCompass({ isActive, onToggle }: StopCompassProps) {
  const [permissionGranted, setPermissionGranted] = useState(false)

  const handleClick = async () => {
    if (!permissionGranted) {
      try {
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof (DeviceOrientationEvent as any).requestPermission === "function"
        ) {
          const permission = await (DeviceOrientationEvent as any).requestPermission()
          if (permission === "granted") {
            setPermissionGranted(true)
            onToggle(true)
          } else {
            alert("Necesitamos acceso a los sensores para activar la brújula")
          }
        } else {
          setPermissionGranted(true)
          onToggle(true)
        }
      } catch (error) {
        console.error("Error al solicitar permiso de orientación:", error)
      }
    } else {
      onToggle(!isActive)
    }
  }

  return (
    <Button 
      onClick={handleClick}
      variant={isActive ? "default" : "outline"}
    >
      {permissionGranted 
        ? (isActive ? "🦇" : "🧭") 
        : "🧭"}
    </Button>
  )
}
