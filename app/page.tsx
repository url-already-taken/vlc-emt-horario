"use client"

import { useState, useEffect } from "react"
import type { BusStop } from "../lib/busStopTypes"
import SearchBar from "./components/SearchBar"
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
  const { setUserLocation, setDistanceFilter, loading, error } = useBusStops()

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
    }
  }, [setUserLocation])

  const handleSearch = (query: string) => {
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
    }
  }

  const handleDistanceFilterChange = (value: string) => {
    setDistanceFilter(Number.parseFloat(value))
  }

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ParadaYa</h1>
      {showCompassOverlay && <CompassOverlay />}
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
          
          {loading && <div className="mt-4">Loading stops...</div>}
          {error && !loading && <div className="mt-4 text-red-600">{error}</div>}
          {!loading && !error && (
            <>
              <BusStopList sortBy={sortBy} onSelectStop={setSelectedStop} />
              {selectedStop && <BusStopDetail stop={selectedStop} onClose={() => setSelectedStop(null)} />}
            </>
          )}
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
