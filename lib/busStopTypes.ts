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
