"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

const MAP_SIZES = [250, 500, 1000] as const

interface StopMiniMapProps {
  lat: number
  lon: number
  stopName: string
  userLocation?: {
    latitude: number
    longitude: number
  } | null
}

export default function StopMiniMap({ lat, lon, stopName, userLocation = null }: StopMiniMapProps) {
  const [side, setSide] = useState<(typeof MAP_SIZES)[number]>(500)

  const src = useMemo(() => {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      side: String(side),
      px: "320",
    })

    if (userLocation) {
      params.set("userLat", String(userLocation.latitude))
      params.set("userLon", String(userLocation.longitude))
    }

    return `/api/mini-map?${params.toString()}`
  }, [lat, lon, side, userLocation])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-2.5 shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/30">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Mapa ligero</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {side} × {side} m alrededor de {stopName}
          </div>
          {userLocation && (
            <div className="text-[11px] text-slate-400 dark:text-slate-500">Rojo: parada. Azul: tu posición.</div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-1">
          {MAP_SIZES.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={side === value ? "default" : "outline"}
              className={
                side === value
                  ? "h-7 rounded-full bg-slate-950 px-2 text-[11px] text-white dark:bg-white dark:text-slate-950"
                  : "h-7 rounded-full border-slate-200 bg-white/90 px-2 text-[11px] text-slate-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-white/10"
              }
              onClick={() => setSide(value)}
            >
              {value}m
            </Button>
          ))}
        </div>
      </div>

      <img
        src={src}
        alt={`Mapa de ${stopName}`}
        loading="lazy"
        className="block w-full rounded-xl border border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:brightness-[0.82] dark:contrast-[1.08]"
      />
    </div>
  )
}
