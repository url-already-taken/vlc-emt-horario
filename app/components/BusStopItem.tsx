"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import BusArrivalInfo from "./BusArrivalInfo"
import type { BusStop } from "../../lib/busStopTypes"

interface BusStopItemProps {
  stop: BusStop
  sortBy: "nearest" | "soonest"
  onSelectStop: (stop: BusStop) => void
  userLocation: { latitude: number; longitude: number } | null
  savedCharacter?: string
  onSaveCharacter: (stopId: string, character: string) => void
}

export default function BusStopItem({
  stop,
  sortBy,
  onSelectStop,
  userLocation,
  savedCharacter,
  onSaveCharacter,
}: BusStopItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      },
    )
    if (ref.current) {
      observer.observe(ref.current)
    }
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [])

  return (
    <li ref={ref} className="border rounded p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">{stop.name}</span>
        <Button onClick={() => onSelectStop(stop)} variant="ghost">
          Ver Details
        </Button>
        <div className="flex items-center space-x-2">
          {/* Show saved character or edit field */}
          {savedCharacter ? (
            <span className="text-blue-500 font-bold">{savedCharacter}</span>
          ) : isEditing ? (
            <>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                maxLength={1}
                className="w-8 text-center border rounded"
              />
              <Button
                onClick={() => {
                  if (inputValue.length === 1) {
                    onSaveCharacter(stop.stopId, inputValue)
                    setIsEditing(false)
                    setInputValue("")
                  } else {
                    alert("Please enter exactly one character.")
                  }
                }}
                variant="ghost"
                size="sm"
              >
                Save
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="ghost"
              size="sm"
            >
              Edit
            </Button>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-600 mb-2">
        {sortBy === "nearest" && userLocation
          ? `Distancia: ${calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              stop.lat,
              stop.lon,
            ).toFixed(2)} km`
          : `Proxima bus: TBD`}
      </div>
      {isVisible && <BusArrivalInfo stopId={stop.stopId} />}
    </li>
  )
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}
