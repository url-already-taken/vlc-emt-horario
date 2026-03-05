package com.paradaya.android.data.network

import com.paradaya.android.data.model.BusArrival
import com.paradaya.android.data.model.BusRoute
import com.paradaya.android.data.model.BusStop
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject

class EmtApiService(
  private val client: OkHttpClient = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(15, TimeUnit.SECONDS)
    .callTimeout(20, TimeUnit.SECONDS)
    .build(),
) {
  suspend fun fetchStops(): List<BusStop> = withContext(Dispatchers.IO) {
    val request = Request.Builder()
      .url(STOPS_ENDPOINT)
      .get()
      .build()

    client.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        throw IOException("Stops request failed: HTTP ${response.code}")
      }

      val body = response.body?.string().orEmpty()
      if (body.isBlank()) return@withContext emptyList()
      parseStops(body)
    }
  }

  suspend fun fetchArrivals(stopId: String): List<BusArrival> = withContext(Dispatchers.IO) {
    val request = Request.Builder()
      .url(ARRIVAL_ENDPOINT.format(stopId, Math.random()))
      .get()
      .build()

    client.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        throw IOException("Arrivals request failed for stop $stopId: HTTP ${response.code}")
      }

      val xml = response.body?.string().orEmpty()
      parseArrivals(xml)
    }
  }

  private fun parseStops(rawJson: String): List<BusStop> {
    val root = JSONObject(rawJson)
    val stopsJson = root.optJSONArray("stop") ?: JSONArray()
    val results = mutableListOf<BusStop>()

    for (i in 0 until stopsJson.length()) {
      val stopObject = stopsJson.optJSONObject(i) ?: continue
      val routesObject = stopObject.optJSONObject("routes")
      val rawRoutes = routesObject?.opt("rtI")

      val routes = when (rawRoutes) {
        is JSONArray -> parseRouteArray(rawRoutes)
        is JSONObject -> listOf(parseRoute(rawRoutes))
        else -> emptyList()
      }

      results += BusStop(
        lat = stopObject.optDouble("lat", 0.0),
        lon = stopObject.optDouble("lon", 0.0),
        name = stopObject.optString("name", "").trim(),
        stopId = stopObject.optString("stopId", "").trim(),
        ubica = stopObject.optString("ubica", "").trim(),
        routes = routes,
      )
    }

    return results.filter { it.stopId.isNotBlank() && it.name.isNotBlank() }
  }

  private fun parseRouteArray(array: JSONArray): List<BusRoute> {
    val routes = mutableListOf<BusRoute>()
    for (i in 0 until array.length()) {
      val routeObject = array.optJSONObject(i) ?: continue
      routes += parseRoute(routeObject)
    }
    return routes
  }

  private fun parseRoute(route: JSONObject): BusRoute {
    return BusRoute(
      headSign = route.optString("headSign", "").trim(),
      idLinea = route.optString("id_linea", "").trim(),
      shortName = route.optString("SN", "").trim(),
      longName = route.optString("LN", "").trim(),
      type = route.optString("type", "").trim(),
    )
  }

  private fun parseArrivals(xml: String): List<BusArrival> {
    if (xml.isBlank()) return emptyList()

    val busRegex = Regex("<bus>([\\s\\S]*?)</bus>")
    val lineRegex = Regex("<linea>([^<]+)</linea>")
    val minutesRegex = Regex("<minutos>([^<]+)</minutos>")

    return busRegex.findAll(xml).mapNotNull { block ->
      val body = block.groupValues[1]
      val line = lineRegex.find(body)?.groupValues?.get(1)?.trim().orEmpty()
      val minutesRaw = minutesRegex.find(body)?.groupValues?.get(1)?.trim().orEmpty()
      if (line.isBlank() || minutesRaw.isBlank()) return@mapNotNull null

      BusArrival(
        line = line,
        minutesRaw = minutesRaw,
        minutesValue = parseMinutes(minutesRaw),
      )
    }.toList()
  }

  private fun parseMinutes(value: String): Int? {
    val trimmed = value.trim()
    if (trimmed.contains("pròxim", ignoreCase = true) || trimmed.contains("proxim", ignoreCase = true)) {
      return 0
    }

    val digits = Regex("(\\d+)").find(trimmed)?.groupValues?.get(1) ?: return null
    return digits.toIntOrNull()
  }

  companion object {
    const val STOPS_ENDPOINT =
      "https://geoportal.emtvalencia.es/opentripplanner-api-webapp/ws/metadata/stopsInExtent?lowerCornerLon=-0.4187679290778661&lowerCornerLat=39.431221084842264&upperCornerLon=-0.33207893371653785&upperCornerLat=39.51099400566781"

    const val ARRIVAL_ENDPOINT =
      "https://geoportal.emtvalencia.es/EMT/mapfunctions/MapUtilsPetitions.php?sec=getSAE&parada=%s&adaptados=false&idioma=va&nocache=%s"
  }
}
