export interface Route {
  headSign: string
  id_linea: string
  LN: string
  SN: string
  type: string
}

export interface BusStop {
  lat: number
  lon: number
  name: string
  stopId: string
  ubica: string
  routes: Route[]
}

export type StopSide = "parell" | "imparell" | null

export interface StopSideInfo extends BusStop {
  streetLabel: string
  crossLabel: string
  streetKey: string
  crossKey: string
  side: StopSide
}

export interface SharedLineDirection {
  lineId: string
  shortName: string
  longName: string
  headSignsA: string[]
  headSignsB: string[]
}

export interface StopPair {
  id: string
  key: string
  street: string
  cross: string
  centroid: {
    lat: number
    lon: number
  }
  stops: [StopSideInfo, StopSideInfo]
  sharedLines: SharedLineDirection[]
}

export interface RouteDirectionInfo {
  stopId: string
  lineId: string
  lineShortName: string
  lineLongName: string
  headSign: string
  neighborStopId: string
  neighborName: string
  distanceMeters: number
  bearing: number
  compassLabel: string
  arrow: string
  relationToCenter: "к центру" | "от центра" | "вдоль"
}

export type StopDirectionMap = Record<string, RouteDirectionInfo[]>
