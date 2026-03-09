import type { BusStop } from "../../lib/busStopTypes"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import BusArrivalInfo from "./BusArrivalInfo"
import StopMiniMap from "./StopMiniMap"

interface BusStopDetailProps {
  stop: BusStop
  onClose: () => void
  userLocation: { latitude: number; longitude: number } | null
}

export default function BusStopDetail({ stop, onClose, userLocation }: BusStopDetailProps) {
  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="flex h-full flex-col overflow-hidden p-0">
        <SheetHeader className="shrink-0 border-b border-slate-200 px-6 py-6 pr-12">
          <SheetTitle>{stop.name}</SheetTitle>
          <SheetDescription>Líneas y horarios previstos</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <div className="space-y-2 pb-4">
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
              <StopMiniMap lat={stop.lat} lon={stop.lon} stopName={stop.name} userLocation={userLocation} />
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-200 bg-background px-6 py-4">
          <Button onClick={onClose} className="w-full">
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
