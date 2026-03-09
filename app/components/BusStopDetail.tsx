import type { BusStop } from "../../lib/busStopTypes"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import BusArrivalInfo from "./BusArrivalInfo"
import StopMiniMap from "./StopMiniMap"

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
          <SheetDescription>Líneas y horarios previstos</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          <p>ID de parada: {stop.stopId}</p>
          <p>Ubicación: {stop.ubica}</p>
          <div>
            <h3 className="font-semibold">Líneas:</h3>
            <ul className="list-disc list-inside">
              {stop.routes.map((route) => (
                <li key={route.id_linea}>
                  {route.SN} - {route.headSign}
                </li>
              ))}
            </ul>
          </div>
          <BusArrivalInfo stopId={stop.stopId} />
          <div className="pt-2">
            <StopMiniMap lat={stop.lat} lon={stop.lon} stopName={stop.name} />
          </div>
        </div>
        <Button onClick={onClose} className="mt-4 w-full">
          Cerrar
        </Button>
      </SheetContent>
    </Sheet>
  )
}
