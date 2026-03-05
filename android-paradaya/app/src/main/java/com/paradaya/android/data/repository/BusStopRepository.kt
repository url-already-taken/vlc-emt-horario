package com.paradaya.android.data.repository

import com.paradaya.android.data.model.BusArrival
import com.paradaya.android.data.model.BusStop
import com.paradaya.android.data.network.EmtApiService

class BusStopRepository(
  private val apiService: EmtApiService = EmtApiService(),
) {
  suspend fun fetchStops(): List<BusStop> = apiService.fetchStops()

  suspend fun fetchArrivals(stopId: String): List<BusArrival> = apiService.fetchArrivals(stopId)
}
