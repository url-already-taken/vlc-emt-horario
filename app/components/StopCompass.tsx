// StopCompass.tsx
"use client"

import { useState } from "react"
import { Compass, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StopCompassProps {
  isActive: boolean
  onToggle: (newState: boolean) => void
}

export default function StopCompass({ isActive, onToggle }: StopCompassProps) {
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)

  const handleClick = async () => {
    if (isRequesting) return

    const triggerHapticFeedback = () => {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([30, 50, 30])
      }
    }

    if (isActive) {
      triggerHapticFeedback()
      onToggle(false)
      return
    }

    if (!permissionGranted) {
      setIsRequesting(true)

      try {
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof (DeviceOrientationEvent as any).requestPermission === "function"
        ) {
          const permission = await (DeviceOrientationEvent as any).requestPermission()
          if (permission === "granted") {
            setPermissionGranted(true)
            triggerHapticFeedback()
            onToggle(true)
          } else {
            alert("Necesitamos acceso a los sensores para activar la brújula")
          }
        } else {
          setPermissionGranted(true)
          triggerHapticFeedback()
          onToggle(true)
        }
      } catch (error) {
        console.error("Error al solicitar permiso de orientación:", error)
      } finally {
        setIsRequesting(false)
      }
    } else {
      triggerHapticFeedback()
      onToggle(true)
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant={isActive ? "default" : "outline"}
      size="sm"
      className={
        isActive
          ? "h-10 rounded-xl bg-slate-900 px-4 text-xs shadow-sm"
          : "h-10 rounded-xl border-slate-200 bg-white/90 px-4 text-xs text-slate-700"
      }
    >
      {isActive ? <X className="mr-2 h-4 w-4" /> : <Compass className="mr-2 h-4 w-4" />}
      {isActive ? "Cerrar brújula" : permissionGranted ? "Abrir brújula" : "Mapa brújula"}
    </Button>
  )
}
