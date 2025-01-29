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
            alert("Для работы компаса необходимо разрешение на доступ к датчикам")
          }
        } else {
          setPermissionGranted(true)
          onToggle(true)
        }
      } catch (error) {
        console.error("Ошибка при запросе разрешения:", error)
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
        ? (isActive ? "🙈" : "🧭") 
        : "🧭"}
    </Button>
  )
}