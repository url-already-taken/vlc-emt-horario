export class StopsService {
  private url: string
  private stops: any[]

  constructor() {
    this.url =
      "https://geoportal.emtvalencia.es/opentripplanner-api-webapp/ws/metadata/stopsInExtent?lowerCornerLon=-0.4187679290778661&lowerCornerLat=39.431221084842264&upperCornerLon=-0.33207893371653785&upperCornerLat=39.51099400566781"
    this.stops = []
    console.log("StopsService initialized")
  }

  async fetchStops() {
    console.log("Fetching stops...")
    try {
      const response = await fetch(this.url)
      console.log("Fetch response status:", response.status)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const xmlText = await response.text()
      console.log("XML text length:", xmlText.length)
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, "application/xml")

      const stopNodes = xmlDoc.getElementsByTagName("stop")
      const totalStops = stopNodes.length
      console.log("Total stop nodes found:", totalStops)

      this.stops = new Array(totalStops)

      for (let i = 0; i < totalStops; i++) {
        const stopNode = stopNodes[i]

        const lat = Number.parseFloat(this._getText(stopNode, "lat"))
        const lon = Number.parseFloat(this._getText(stopNode, "lon"))
        const name = this._getText(stopNode, "name")
        const stopId = this._getText(stopNode, "stopId")
        const ubica = this._getText(stopNode, "ubica")

        const routesNode = stopNode.getElementsByTagName("routes")[0]
        let routes: any[] = []
        if (routesNode) {
          const rtINodes = routesNode.getElementsByTagName("rtI")
          const totalRoutes = rtINodes.length
          console.log(`Stop ${stopId} has ${totalRoutes} routes`)
          if (totalRoutes) {
            routes = new Array(totalRoutes)
            for (let j = 0; j < totalRoutes; j++) {
              const rtINode = rtINodes[j]
              routes[j] = {
                headSign: this._getText(rtINode, "headSign"),
                id_linea: this._getText(rtINode, "id_linea"),
                LN: this._getText(rtINode, "LN"),
                SN: this._getText(rtINode, "SN"),
                type: this._getText(rtINode, "type"),
              }
            }
          }
        }

        this.stops[i] = {
          lat,
          lon,
          name,
          stopId,
          ubica,
          routes,
        }

        if (i % 100 === 0) {
          console.log(`Processed ${i + 1} stops`)
        }
      }
      console.log("All stops processed. Total stops:", this.stops.length)
    } catch (error) {
      console.error("Failed to fetch or parse stops:", error)
    }
  }

  getAllStops() {
    console.log("Getting all stops. Total:", this.stops.length)
    return this.stops
  }

  filterByName(query: string) {
    console.log("Filtering by name:", query)
    if (!query) return this.stops
    const lowerQuery = query.toLowerCase()
    const filtered = this.stops.filter((stop) => stop.name && stop.name.toLowerCase().includes(lowerQuery))
    console.log("Filtered stops by name. Results:", filtered.length)
    return filtered
  }

  filterByRoute(routeQuery: string) {
    console.log("Filtering by route:", routeQuery)
    if (!routeQuery) return this.stops
    const lowerQuery = routeQuery.toLowerCase()
    const filtered = this.stops.filter((stop) =>
      stop.routes.some(
        (route: any) =>
          (route.SN && route.SN.toLowerCase().includes(lowerQuery)) ||
          (route.headSign && route.headSign.toLowerCase().includes(lowerQuery)),
      ),
    )
    console.log("Filtered stops by route. Results:", filtered.length)
    return filtered
  }

  private _getText(parent: Element, tagName: string): string {
    const el = parent.getElementsByTagName(tagName)[0]
    return el && el.textContent ? el.textContent.trim() : ""
  }
}

