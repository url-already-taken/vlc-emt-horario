package com.paradaya.android.data.model

data class BusRoute(
  val headSign: String,
  val idLinea: String,
  val shortName: String,
  val longName: String,
  val type: String,
)

data class BusStop(
  val lat: Double,
  val lon: Double,
  val name: String,
  val stopId: String,
  val ubica: String,
  val routes: List<BusRoute>,
)

data class BusArrival(
  val line: String,
  val minutesRaw: String,
  val minutesValue: Int?,
)
