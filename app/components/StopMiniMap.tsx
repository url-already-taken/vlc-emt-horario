"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

const MAP_SIZES = [250, 500, 1000] as const

interface StopMiniMapProps {
  lat: number
  lon: number
  stopName: string
}

export default function StopMiniMap({ lat, lon, stopName }: StopMiniMapProps) {
  const [side, setSide] = useState<(typeof MAP_SIZES)[number]>(500)

  const src = useMemo(() => {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      side: String(side),
      px: "320",
    })
    return `/api/mini-map?${params.toString()}`
  }, [lat, lon, side])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-700">Mapa ligero</div>
          <div className="text-[11px] text-slate-500">
            {side} × {side} m alrededor de {stopName}
          </div>
        </div>

        <div className="flex gap-1">
          {MAP_SIZES.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={side === value ? "default" : "outline"}
              className="h-7 rounded-full px-2 text-[11px]"
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
        className="block w-full rounded-xl border border-slate-100 bg-slate-50"
      />
    </div>
  )
}
