"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import BusArrivalInfo from "./BusArrivalInfo"
import type { BusStop, RouteDirectionInfo } from "../../lib/busStopTypes"

interface BusStopItemProps {
  stop: BusStop
  sortBy: "nearest" | "soonest"
  onSelectStop: (stop: BusStop) => void
  userLocation: { latitude: number; longitude: number } | null
  isFavorite: boolean
  onToggleFavorite: (stopId: string) => void
  directions?: RouteDirectionInfo[]
}

export default function BusStopItem({
  stop,
  sortBy,
  onSelectStop,
  userLocation,
  isFavorite,
  onToggleFavorite,
  directions = [],
}: BusStopItemProps) {
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

  return (
    <li ref={ref} className="border rounded p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold flex items-center space-x-2">
          <span>{stop.name}</span>
          {isFavorite && <span className="text-yellow-500" aria-label="Избранная остановка">★</span>}
        </span>
        <Button
          onClick={() => onToggleFavorite(stop.stopId)}
          variant={isFavorite ? "default" : "outline"}
          size="sm"
        >
          {isFavorite ? "★ В избранном" : "☆ В избранное"}
        </Button>
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
      {directions.length > 0 && (
        <div className="space-y-2 text-sm mb-3">
          {directions.slice(0, 4).map((direction) => (
            <div
              key={`${direction.lineId}-${direction.headSign}`}
              className="flex items-center justify-between rounded border px-2 py-1"
            >
              <div className="mr-3">
                <div className="font-semibold">
                  [{direction.lineShortName}] {direction.headSign}
                </div>
                <div className="text-xs text-gray-500">
                  {direction.relationToCenter} · {direction.distanceMeters} м до {direction.neighborName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg leading-none">{direction.arrow}</div>
                <div className="text-xs text-gray-500">{direction.compassLabel}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isVisible && <BusArrivalInfo stopId={stop.stopId} />}
      <div className="flex justify-end mt-2">
        <Button onClick={() => onSelectStop(stop)} variant="ghost">
          Ver Details
        </Button>
      </div>
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
