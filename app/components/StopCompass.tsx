// StopCompass.tsx
"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useDeviceHeading } from "@/lib/useDeviceHeading"

interface StopCompassProps {
  isActive: boolean
  onToggle: (newState: boolean) => void
}

export default function StopCompass({ isActive, onToggle }: StopCompassProps) {
  const { permission, requestPermission } = useDeviceHeading({ enabled: isActive })
  const pendingActivationRef = useRef(false)

  const handleClick = async () => {
    if (!isActive) {
      if (permission !== "granted") {
        pendingActivationRef.current = true
        await requestPermission()
        return
      }
      onToggle(true)
      return
    }

    onToggle(false)
  }

  useEffect(() => {
    if (!pendingActivationRef.current) return

    if (permission === "granted" && !isActive) {
      pendingActivationRef.current = false
      onToggle(true)
    }

    if (permission === "denied") {
      pendingActivationRef.current = false
      alert("Necesitamos acceso a los sensores para activar la brújula")
    }
  }, [permission, isActive, onToggle])

  return (
    <Button onClick={handleClick} variant={isActive ? "default" : "outline"}>
      {permission === "granted" ? (isActive ? "🦇" : "🧭") : "🧭"}
    </Button>
  )
}
