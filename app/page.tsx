"use client"

import { useState, useEffect, useMemo } from "react"
import { mockBusStops, sortBusStops, type BusStop } from "../lib/mockData"
import SearchBar from "./components/SearchBar"
import SortToggle from "./components/SortToggle"
import BusStopList from "./components/BusStopList"
import BusStopDetail from "./components/BusStopDetail"
import AllStations from "./components/AllStations"
import { Button } from "@/components/ui/button"
import { BusStopProvider, useBusStops } from "../lib/BusStopContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import CompassOverlay from "./components/CompassOverlay"

function HomeContent() {
  const [sortBy, setSortBy] = useState<"nearest" | "soonest">("nearest")
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null)
  const [showAllStations, setShowAllStations] = useState(false)
  const [showCompassOverlay, setShowCompassOverlay] = useState(false)
  const [compassPermissionGranted, setCompassPermissionGranted] = useState(false)
  const { setUserLocation, setDistanceFilter, filteredStops, userLocation } = useBusStops()

  // ... остальной код остаётся без изменений ...

  const handleCompassToggle = () => {
    if (!compassPermissionGranted) {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof (DeviceOrientationEvent as any).requestPermission === "function"
      ) {
        ;(DeviceOrientationEvent as any)
          .requestPermission()
          .then((permissionState: string) => {
            if (permissionState === "granted") {
              setCompassPermissionGranted(true)
              setShowCompassOverlay(true)
            } else {
              alert("Permission not granted for sensor data.")
            }
          })
          .catch(console.error)
      } else {
        setCompassPermissionGranted(true)
        setShowCompassOverlay(true)
      }
    } else {
      setShowCompassOverlay(prev => !prev)
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ParadaYa</h1>
      {showCompassOverlay && <CompassOverlay stops={nearestFiveStops} />}
      
      {/* ... остальной код остаётся без изменений ... */}
      
      <div className="flex justify-between items-center mb-4">
        <Select onValueChange={handleDistanceFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by distance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.1">100 meters</SelectItem>
            <SelectItem value="0.5">500 meters</SelectItem>
            <SelectItem value="1">1 kilometer</SelectItem>
            <SelectItem value="Infinity">All stations</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          onClick={handleCompassToggle}
          variant={showCompassOverlay ? "default" : "outline"}
        >
          {compassPermissionGranted 
            ? (showCompassOverlay ? "Hide Compass" : "Show Compass") 
            : "Enable Compass"}
        </Button>

        <Button onClick={() => setShowAllStations(true)} className="mb-4">
          TODO
        </Button>
      </div>

      {/* ... остальной код остаётся без изменений ... */}
    </main>
  )
}

export default function Home() {
  return (
    <BusStopProvider>
      <HomeContent />
    </BusStopProvider>
  )
}