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
  compact?: boolean
}

export default function BusStopItem({
  stop,
  sortBy,
  onSelectStop,
  userLocation,
  isFavorite,
  onToggleFavorite,
  directions = [],
  compact = false,
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

  if (compact) {
    const primaryDirection = directions[0]
    return (
      <li ref={ref} className="border rounded p-3 bg-amber-50/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold flex items-center gap-2 text-sm">
              <span>{stop.name}</span>
              <span className="text-yellow-500" aria-label="Избранная остановка">
                ★
              </span>
            </div>
            <div className="text-xs text-gray-600">
              {sortBy === "nearest" && userLocation
                ? `~${calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    stop.lat,
                    stop.lon,
                  ).toFixed(2)} km`
                : stop.ubica}
            </div>
            {isVisible && (
              <BusArrivalInfo stopId={stop.stopId} directions={directions} variant="compact" />
            )}
          </div>
          <div className="flex items-center gap-2">
            
            <Button
              onClick={() => onToggleFavorite(stop.stopId)}
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              aria-label="Убрать из избранного"
            >
              ✕
            </Button>
          </div>
        </div>
      </li>
    )
  }

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
      {isVisible && <BusArrivalInfo stopId={stop.stopId} directions={directions} />}
      
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
