export class StopManager {
  stops: any[]

  constructor() {
    this.stops = []
  }

  async fetchStops() {
    const url =
      "https://geoportal.emtvalencia.es/opentripplanner-api-webapp/ws/metadata/stopsInExtent?lowerCornerLon=-0.4187679290778661&lowerCornerLat=39.431221084842264&upperCornerLon=-0.33207893371653785&upperCornerLat=39.51099400566781"

    try {
      const response = await fetch(url)
      const xmlText = await response.text()
      this.parseXML(xmlText)
    } catch (error) {
      console.error("Error fetching stops:", error)
    }
  }

  parseXML(xmlText: string) {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, "text/xml")
    const stopNodes = xmlDoc.getElementsByTagName("stop")

    this.stops = Array.from(stopNodes).map((stopNode) => {
      const lat = stopNode.getElementsByTagName("lat")[0].textContent
      const lon = stopNode.getElementsByTagName("lon")[0].textContent
      const name = stopNode.getElementsByTagName("name")[0].textContent
      const stopId = stopNode.getElementsByTagName("stopId")[0].textContent
      const ubica = stopNode.getElementsByTagName("ubica")[0].textContent

      const routes = Array.from(stopNode.getElementsByTagName("rtI")).map((routeNode) => ({
        headSign: routeNode.getElementsByTagName("headSign")[0].textContent,
        id_linea: routeNode.getElementsByTagName("id_linea")[0].textContent,
        LN: routeNode.getElementsByTagName("LN")[0].textContent,
        SN: routeNode.getElementsByTagName("SN")[0].textContent,
        type: routeNode.getElementsByTagName("type")[0].textContent,
      }))

      return {
        lat: Number.parseFloat(lat!),
        lon: Number.parseFloat(lon!),
        name,
        stopId: Number.parseInt(stopId!),
        ubica,
        routes,
      }
    })
  }

  filterByName(name: string) {
    return this.stops.filter((stop) => stop.name!.toLowerCase().includes(name.toLowerCase()))
  }

  filterByRouteType(type: string) {
    return this.stops.filter((stop) => stop.routes.some((route) => route.type === type))
  }

  filterByRouteNumber(routeNumber: string) {
    return this.stops.filter((stop) => stop.routes.some((route) => route.SN === routeNumber))
  }

  getAllStops() {
    return this.stops
  }
}
