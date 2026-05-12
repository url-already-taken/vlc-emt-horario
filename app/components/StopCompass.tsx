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
      aria-pressed={isActive}
      className={
        isActive
          ? "h-10 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white shadow-sm shadow-slate-900/20 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          : "h-10 rounded-xl border-slate-200 bg-white/90 px-4 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-white/10"
      }
    >
      {isActive ? <X className="mr-2 h-4 w-4" /> : <Compass className="mr-2 h-4 w-4" />}
      {isActive ? "Cerrar brújula" : permissionGranted ? "Abrir brújula" : "Mapa brújula"}
    </Button>
  )
}
