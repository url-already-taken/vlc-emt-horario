"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import BusArrivalInfo from "./BusArrivalInfo"

interface BusStopItemProps {
  stop: any
  sortBy: "nearest" | "soonest"
  onSelectStop: (stop: any) => void
  userLocation: { latitude: number; longitude: number } | null
}

export default function BusStopItem({ stop, sortBy, onSelectStop, userLocation }: BusStopItemProps) {
  const [isVisible, setIsVisible] = useState(false)
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

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
  }

  function deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
  }

  return (
    <li ref={ref} className="border rounded p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">{stop.name}</span>
        <Button onClick={() => onSelectStop(stop)} variant="ghost">
          View Details
        </Button>
      </div>
      <div className="text-sm text-gray-600 mb-2">
        {sortBy === "nearest" && userLocation
          ? `Distancia: ${calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              Number.parseFloat(stop.lat),
              Number.parseFloat(stop.lon),
            ).toFixed(2)} km`
          : `Proxima bus: TBD`}
      </div>
      {isVisible && <BusArrivalInfo stopId={stop.stopId} />}
    </li>
  )
}

