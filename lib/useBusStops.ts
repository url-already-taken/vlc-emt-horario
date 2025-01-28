import { useState, useEffect } from "react"

interface Route {
  headSign: string | null
  id_linea: string | null
  LN: string | null
  SN: string | null
  type: string | null
}

interface BusStop {
  lat: string | null
  lon: string | null
  name: string | null
  stopId: string | null
  ubica: string | null
  routes: Route[]
}

export function useBusStops() {
  const [stops, setStops] = useState<BusStop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchBusStops()
  }, [])

  async function fetchBusStops() {
    try {
      setLoading(true)
      const apiUrl =
        "https://geoportal.emtvalencia.es/opentripplanner-api-webapp/ws/metadata/stopsInExtent?lowerCornerLon=-0.4187679290778661&lowerCornerLat=39.431221084842264&upperCornerLon=-0.33207893371653785&upperCornerLat=39.51099400566781"

      console.log("Fetching URL:", apiUrl)

      // Use a CORS proxy to bypass CORS restrictions
      const corsProxyUrl = "https://cors-anywhere.herokuapp.com/"
      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const xmlText = await response.text()
      console.log("Raw XML Response:", xmlText)

      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, "text/xml")

      const parseError = xmlDoc.querySelector("parsererror")
      if (parseError) {
        console.error("XML Parsing Error:", parseError.textContent)
        throw new Error("Failed to parse XML")
      }

      const stopElements = xmlDoc.querySelectorAll("stop")
      console.log(`Found ${stopElements.length} stops`)

      const parsedStops: BusStop[] = Array.from(stopElements).map((stopElem) => {
        const stop: BusStop = {
          lat: stopElem.querySelector("lat")?.textContent,
          lon: stopElem.querySelector("lon")?.textContent,
          name: stopElem.querySelector("name")?.textContent,
          stopId: stopElem.querySelector("stopId")?.textContent,
          ubica: stopElem.querySelector("ubica")?.textContent,
          routes: [],
        }

        const routeElements = stopElem.querySelectorAll("rtI")
        stop.routes = Array.from(routeElements).map((routeElem) => ({
          headSign: routeElem.querySelector("headSign")?.textContent,
          id_linea: routeElem.querySelector("id_linea")?.textContent,
          LN: routeElem.querySelector("LN")?.textContent,
          SN: routeElem.querySelector("SN")?.textContent,
          type: routeElem.querySelector("type")?.textContent,
        }))

        return stop
      })

      console.log("Parsed Stops:", JSON.stringify(parsedStops, null, 2))
      setStops(parsedStops)
    } catch (error) {
      console.error("Error in fetchBusStops:", error)
      setError(error instanceof Error ? error : new Error("An unknown error occurred"))
    } finally {
      setLoading(false)
    }
  }

  return { stops, loading, error }
}

