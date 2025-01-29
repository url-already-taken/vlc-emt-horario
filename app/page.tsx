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
import StopCompass from "./components/StopCompass"
import CompassOverlay from "./components/CompassOverlay"

function HomeContent() {
  const [sortBy, setSortBy] = useState<"nearest" | "soonest">("nearest")
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null)
  const [showAllStations, setShowAllStations] = useState(false)
  const [showCompassOverlay, setShowCompassOverlay] = useState(false)
  const { setUserLocation, setDistanceFilter, filteredStops, userLocation } = useBusStops()

  const nearestFiveStops = useMemo(() => {
    if (!userLocation || !filteredStops?.length) return []
    const { latitude: lat1, longitude: lon1 } = userLocation

    // Simple haversine or basic function:
    function distanceKm(latA: number, lonA: number, latB: number, lonB: number) {
      const R = 6371
      const dLat = ((latB - latA) * Math.PI) / 180
      const dLon = ((lonB - lonA) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((latA * Math.PI) / 180) *
          Math.cos((latB * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    }
    
      return filteredStops.slice().sort((a, b) => {
        const distA = distanceKm(lat1, lon1, a.latitude, a.longitude);
        const distB = distanceKm(lat1, lon1, b.latitude, b.longitude);
        return distA - distB;
    }).slice(0, 5)

  }, [filteredStops, userLocation])

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting user location:", error)
        },
      )
    } else {
      console.log("Geolocation is not available in this browser.")
    }
  }, [setUserLocation])

  const handleSearch = (query: string) => {
    console.log("Searching for:", query)
    // Implement search functionality here
  }

  const handleUseMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting user location:", error)
        },
      )
    } else {
      console.log("Geolocation is not available in this browser.")
    }
  }

  const handleSortChange = (newSortBy: "nearest" | "soonest") => {
    setSortBy(newSortBy)
  }

  const handleDistanceFilterChange = (value: string) => {
    setDistanceFilter(Number.parseFloat(value))
  }

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ParadaYa</h1>
      {showCompassOverlay && <CompassOverlay stops={nearestFiveStops} />}
      {showAllStations ? (
        <> 
          <Button onClick={() => setShowAllStations(false)} className="mb-4">
            Back to Nearby Stops
          </Button>
          <AllStations />
        </>
      ) : (
        <>
          <SearchBar onSearch={handleSearch} onUseMyLocation={handleUseMyLocation} />
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
            <StopCompass 
              isActive={showCompassOverlay} 
              onToggle={setShowCompassOverlay} 
            />
              <Button onClick={() => setShowAllStations(true)} className="mb-4">
              TODO
            </Button>
          </div>
          
          <BusStopList sortBy={sortBy} onSelectStop={setSelectedStop} />
          {selectedStop && <BusStopDetail stop={selectedStop} onClose={() => setSelectedStop(null)} />}
        </>
      )}
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