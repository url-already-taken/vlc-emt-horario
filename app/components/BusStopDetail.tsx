import type { BusStop } from "../../lib/busStopService"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import BusArrivalInfo from "./BusArrivalInfo"

interface BusStopDetailProps {
  stop: BusStop
  onClose: () => void
}

export default function BusStopDetail({ stop, onClose }: BusStopDetailProps) {
  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{stop.name}</SheetTitle>
          <SheetDescription>Bus lines and arrival times</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          <p>Stop ID: {stop.stopId}</p>
          <p>Location: {stop.ubica}</p>
          <div>
            <h3 className="font-semibold">Routes:</h3>
            <ul className="list-disc list-inside">
              {stop.routes.map((route) => (
                <li key={route.id_linea}>
                  {route.SN} - {route.headSign}
                </li>
              ))}
            </ul>
          </div>
          <BusArrivalInfo stopId={stop.stopId} />
        </div>
        <Button onClick={onClose} className="mt-4 w-full">
          Close
        </Button>
      </SheetContent>
    </Sheet>
  )
}

