"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { deg2rad } from "./geoUtils"

type HeadingPermissionState = "unknown" | "granted" | "denied"

interface UseDeviceHeadingOptions {
  enabled: boolean
}

interface UseDeviceHeadingResult {
  heading: number | null
  permission: HeadingPermissionState
  requestPermission: () => Promise<void>
}

const headingListeners = new Set<(value: number | null) => void>()
const permissionListeners = new Set<(value: HeadingPermissionState) => void>()

const HEADING_SMOOTHING = 0.25

let currentHeading: number | null = null
let smoothedHeading: number | null = null
let permissionState: HeadingPermissionState = "unknown"
let hasResolvedInitialPermissionState = false
let activeConsumers = 0
let isListening = false
let orientationEvent: "deviceorientation" | "deviceorientationabsolute" = "deviceorientation"
let orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null

export function useDeviceHeading({ enabled }: UseDeviceHeadingOptions): UseDeviceHeadingResult {
  resolveInitialPermissionState()

  const [heading, setHeading] = useState<number | null>(currentHeading)
  const [permission, setPermission] = useState<HeadingPermissionState>(permissionState)

  useEffect(() => {
    const handleHeadingUpdate = (value: number | null) => {
      setHeading(value)
    }
    headingListeners.add(handleHeadingUpdate)
    setHeading(currentHeading)
    return () => {
      headingListeners.delete(handleHeadingUpdate)
    }
  }, [])

  useEffect(() => {
    const handlePermissionUpdate = (value: HeadingPermissionState) => {
      setPermission(value)
    }
    permissionListeners.add(handlePermissionUpdate)
    setPermission(permissionState)
    return () => {
      permissionListeners.delete(handlePermissionUpdate)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || permissionState === "granted") return
    if (!supportsExplicitPermissionRequest()) {
      if (permissionState !== "granted") {
        permissionState = "granted"
        notifyPermissionListeners()
        updateListeningState()
      }
      return
    }

    try {
      const result = await (DeviceOrientationEvent as any).requestPermission()
      permissionState = result === "granted" ? "granted" : "denied"
    } catch (error) {
      console.error("Device orientation permission request failed:", error)
      permissionState = "denied"
    }

    notifyPermissionListeners()
    updateListeningState()
  }, [])

  const isConsumingRef = useRef(false)
  useEffect(() => {
    const shouldConsume = enabled && permission === "granted"

    if (shouldConsume && !isConsumingRef.current) {
      isConsumingRef.current = true
      activeConsumers += 1
      updateListeningState()
    } else if (!shouldConsume && isConsumingRef.current) {
      isConsumingRef.current = false
      activeConsumers = Math.max(0, activeConsumers - 1)
      updateListeningState()
    }

    return () => {
      if (isConsumingRef.current) {
        isConsumingRef.current = false
        activeConsumers = Math.max(0, activeConsumers - 1)
        updateListeningState()
      }
    }
  }, [enabled, permission])

  return { heading, permission, requestPermission }
}

function resolveInitialPermissionState() {
  if (hasResolvedInitialPermissionState) return
  if (typeof window === "undefined") return
  hasResolvedInitialPermissionState = true
  if (!supportsExplicitPermissionRequest()) {
    permissionState = "granted"
  }
}

function supportsExplicitPermissionRequest(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as any).requestPermission === "function"
  )
}

function notifyHeadingListeners() {
  headingListeners.forEach((listener) => listener(currentHeading))
}

function notifyPermissionListeners() {
  permissionListeners.forEach((listener) => listener(permissionState))
}

function handleOrientation(event: DeviceOrientationEvent) {
  const nextHeading = deriveHeading(event)
  if (nextHeading == null) return

  if (smoothedHeading == null) {
    smoothedHeading = nextHeading
  } else {
    smoothedHeading = smoothHeading(smoothedHeading, nextHeading)
  }

  currentHeading = smoothedHeading
  notifyHeadingListeners()
}

function startListening() {
  if (isListening || typeof window === "undefined") return
  orientationEvent = getOrientationEventName()
  orientationHandler = handleOrientation
  window.addEventListener(orientationEvent, orientationHandler as EventListener)
  isListening = true
}

function stopListening() {
  if (!isListening || typeof window === "undefined") return
  if (orientationHandler) {
    window.removeEventListener(orientationEvent, orientationHandler as EventListener)
  }
  orientationHandler = null
  isListening = false
}

function updateListeningState() {
  if (activeConsumers > 0 && permissionState === "granted") {
    startListening()
  } else if (isListening && (activeConsumers === 0 || permissionState !== "granted")) {
    stopListening()
  }
}

function getOrientationEventName(): "deviceorientation" | "deviceorientationabsolute" {
  if (typeof window !== "undefined" && "ondeviceorientationabsolute" in window) {
    return "deviceorientationabsolute"
  }
  return "deviceorientation"
}

function deriveHeading(event: DeviceOrientationEvent): number | null {
  let heading: number | null = null

  if (typeof (event as any).webkitCompassHeading === "number") {
    heading = (event as any).webkitCompassHeading
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
  return normalizeHeading(applyScreenOrientation(heading))
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

function applyScreenOrientation(value: number): number {
  if (typeof window === "undefined") return value
  const angle = window.screen?.orientation?.angle ?? (window as any).orientation ?? 0
  return value + angle
}

function normalizeHeading(value: number): number {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function smoothHeading(previous: number, next: number): number {
  const diff = shortestAngleDiff(previous, next)
  return normalizeHeading(previous + diff * HEADING_SMOOTHING)
}

function shortestAngleDiff(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}
