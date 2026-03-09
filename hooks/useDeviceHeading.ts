"use client"

import { useEffect, useRef, useState } from "react"
import {
  circularAverageDegrees,
  deg2rad,
  normalizeDegrees,
  shortestAngleDiff,
} from "@/lib/geoUtils"

const HEADING_SAMPLE_WINDOW = 5
const HEADING_EASING = 0.16
const HEADING_SETTLE_THRESHOLD = 0.35
const MIN_RENDER_DELTA = 0.05

interface UseDeviceHeadingResult {
  heading: number
  hasSignal: boolean
  isSupported: boolean
}

export function useDeviceHeading(isActive: boolean): UseDeviceHeadingResult {
  const [heading, setHeading] = useState(0)
  const [hasSignal, setHasSignal] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  const displayedHeadingRef = useRef(0)
  const targetHeadingRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const sampleWindowRef = useRef<number[]>([])
  const hasSignalRef = useRef(false)

  useEffect(() => {
    hasSignalRef.current = hasSignal
  }, [hasSignal])

  useEffect(() => {
    displayedHeadingRef.current = heading
  }, [heading])

  useEffect(() => {
    if (!isActive || typeof window === "undefined") return

    if (!("DeviceOrientationEvent" in window)) {
      setIsSupported(false)
      setHasSignal(false)
      return
    }

    setIsSupported(true)
    const orientationEventName = getOrientationEventName()

    const resetSmoothing = () => {
      sampleWindowRef.current = []
      targetHeadingRef.current = displayedHeadingRef.current
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const nextHeading = deriveHeading(event)
      if (nextHeading == null) return

      const accuracy = Number((event as DeviceOrientationEvent & { webkitCompassAccuracy?: number }).webkitCompassAccuracy)
      if (Number.isFinite(accuracy) && accuracy > 50) return

      if (!hasSignalRef.current) {
        hasSignalRef.current = true
        sampleWindowRef.current = [nextHeading]
        targetHeadingRef.current = nextHeading
        displayedHeadingRef.current = nextHeading
        setHeading(nextHeading)
        setHasSignal(true)
        return
      }

      sampleWindowRef.current.push(nextHeading)
      if (sampleWindowRef.current.length > HEADING_SAMPLE_WINDOW) {
        sampleWindowRef.current.shift()
      }

      targetHeadingRef.current = circularAverageDegrees(sampleWindowRef.current)
    }

    const tick = () => {
      const targetHeading = targetHeadingRef.current

      if (targetHeading != null) {
        const currentHeading = displayedHeadingRef.current
        const diff = shortestAngleDiff(currentHeading, targetHeading)

        if (Math.abs(diff) <= HEADING_SETTLE_THRESHOLD) {
          if (Math.abs(diff) > 0) {
            displayedHeadingRef.current = targetHeading
            setHeading(targetHeading)
          }
        } else {
          const nextHeading = normalizeDegrees(currentHeading + diff * HEADING_EASING)
          if (Math.abs(shortestAngleDiff(currentHeading, nextHeading)) >= MIN_RENDER_DELTA) {
            displayedHeadingRef.current = nextHeading
            setHeading(nextHeading)
          }
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(tick)
    }

    window.addEventListener(orientationEventName, handleOrientation as EventListener, { passive: true })
    window.addEventListener("orientationchange", resetSmoothing)
    window.screen?.orientation?.addEventListener?.("change", resetSmoothing)
    animationFrameRef.current = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener(orientationEventName, handleOrientation as EventListener)
      window.removeEventListener("orientationchange", resetSmoothing)
      window.screen?.orientation?.removeEventListener?.("change", resetSmoothing)

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }

      sampleWindowRef.current = []
      targetHeadingRef.current = null
      hasSignalRef.current = false
      setHasSignal(false)
    }
  }, [isActive])

  return {
    heading,
    hasSignal,
    isSupported,
  }
}

function getOrientationEventName(): "deviceorientation" | "deviceorientationabsolute" {
  if (typeof window !== "undefined" && "ondeviceorientationabsolute" in window) {
    return "deviceorientationabsolute"
  }

  return "deviceorientation"
}

function deriveHeading(event: DeviceOrientationEvent): number | null {
  const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
  let heading: number | null = null

  if (typeof webkitHeading === "number") {
    heading = webkitHeading
  } else if (
    typeof event.alpha === "number" &&
    typeof event.beta === "number" &&
    typeof event.gamma === "number"
  ) {
    heading = calculateCompassHeading(event.alpha, event.beta, event.gamma)
  } else if (typeof event.alpha === "number") {
    heading = 360 - event.alpha
  }

  if (heading == null || Number.isNaN(heading)) return null
  return normalizeDegrees(applyScreenOrientation(heading))
}

function calculateCompassHeading(alpha: number, beta: number, gamma: number): number {
  const alphaRad = deg2rad(alpha)
  const betaRad = deg2rad(beta)
  const gammaRad = deg2rad(gamma)

  const cA = Math.cos(alphaRad)
  const sA = Math.sin(alphaRad)
  const cB = Math.cos(betaRad)
  const sB = Math.sin(betaRad)
  const cG = Math.cos(gammaRad)
  const sG = Math.sin(gammaRad)

  const rA = -cA * sG - sA * sB * cG
  const rB = -sA * sG + cA * sB * cG
  let heading = Math.atan2(rA, rB)

  if (heading < 0) {
    heading += 2 * Math.PI
  }

  return (heading * 180) / Math.PI
}

function applyScreenOrientation(heading: number): number {
  if (typeof window === "undefined") return heading
  const angle = window.screen?.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0
  return heading + angle
}
