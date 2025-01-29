import { useBusStops } from "../../lib/BusStopContext"
import BusStopItem from "./BusStopItem"
import { calculateDistance } from "../../lib/geoUtils"


interface BusStopListProps {
  sortBy: "nearest" | "soonest"
  onSelectStop: (stop: any) => void
}

export default function BusStopList({ sortBy, onSelectStop }: BusStopListProps) {
  const { filteredStops, loading, error, userLocation } = useBusStops()

  if (loading) return <div>Loading stations...</div>
  if (error) return <div>Error: {error}</div>

  // Sort stops based on sortBy
  const sortedStops = [...filteredStops].sort((a, b) => {
    if (sortBy === "nearest" && userLocation) {
      const distanceA = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        Number.parseFloat(a.lat),
        Number.parseFloat(a.lon),
      )
      const distanceB = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        Number.parseFloat(b.lat),
        Number.parseFloat(b.lon),
      )
      return distanceA - distanceB
    } else {
      // This is a placeholder. In reality, you'd need to fetch and compare actual next bus times.
      return Math.random() - 0.5
    }
  })

  return (
    <ul className="space-y-4">
      {sortedStops.map((stop) => (
        <BusStopItem
          key={stop.stopId}
          stop={stop}
          sortBy={sortBy}
          onSelectStop={onSelectStop}
          userLocation={userLocation}
        />
      ))}
    </ul>
  )
}


