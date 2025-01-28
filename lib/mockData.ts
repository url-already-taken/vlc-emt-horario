export interface BusStop {
  id: string
  name: string
  distance: number
  nextBus: number
  lines: BusLine[]
}

interface BusLine {
  number: string
  nextDeparture: number
  routeTime: number
}

export const mockBusStops: BusStop[] = [
  {
    id: "1",
    name: "Central Station",
    distance: 0.2,
    nextBus: 5,
    lines: [
      { number: "101", nextDeparture: 5, routeTime: 15 },
      { number: "202", nextDeparture: 8, routeTime: 20 },
    ],
  },
  {
    id: "2",
    name: "Market Street",
    distance: 0.5,
    nextBus: 3,
    lines: [
      { number: "303", nextDeparture: 3, routeTime: 12 },
      { number: "404", nextDeparture: 10, routeTime: 18 },
    ],
  },
  {
    id: "3",
    name: "City Hall",
    distance: 0.8,
    nextBus: 7,
    lines: [
      { number: "505", nextDeparture: 7, routeTime: 25 },
      { number: "606", nextDeparture: 15, routeTime: 30 },
    ],
  },
]

export function sortBusStops(stops: BusStop[], sortBy: "nearest" | "soonest"): BusStop[] {
  return stops.sort((a, b) => (sortBy === "nearest" ? a.distance - b.distance : a.nextBus - b.nextBus))
}

