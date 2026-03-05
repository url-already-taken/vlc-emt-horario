package com.paradaya.android.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import com.paradaya.android.data.location.LocationProvider
import com.paradaya.android.data.repository.BusStopRepository
import com.paradaya.android.data.repository.UserPreferencesRepository
import com.paradaya.android.data.repository.WidgetSnapshotRepository
import com.paradaya.android.data.repository.WidgetStopSnapshot
import com.paradaya.android.domain.GeoUtils
import kotlinx.coroutines.flow.first

class WidgetRefreshCoordinator(
  context: Context,
) {
  private val appContext = context.applicationContext
  private val busStopRepository = BusStopRepository()
  private val preferencesRepository = UserPreferencesRepository(appContext)
  private val snapshotRepository = WidgetSnapshotRepository(appContext)
  private val locationProvider = LocationProvider(appContext)

  suspend fun refresh() {
    val favoriteIds = preferencesRepository.favoriteStopIds.first()

    if (favoriteIds.isEmpty()) {
      snapshotRepository.saveSnapshots(emptyList())
      FavoriteStopsWidget().updateAll(appContext)
      return
    }

    val allStops = runCatching { busStopRepository.fetchStops() }.getOrElse { emptyList() }
    val favorites = allStops
      .filter { stop -> favoriteIds.contains(stop.stopId) }
      .sortedBy { stop -> stop.name }
      .take(6)

    val location = locationProvider.getLastKnownLocationOrNull()

    val snapshots = favorites.map { stop ->
      val arrivals = runCatching { busStopRepository.fetchArrivals(stop.stopId) }.getOrElse { emptyList() }
      val nextArrival = arrivals.minByOrNull { arrival -> arrival.minutesValue ?: Int.MAX_VALUE }

      WidgetStopSnapshot(
        stopId = stop.stopId,
        stopName = stop.name,
        nextLine = nextArrival?.line,
        etaLabel = nextArrival?.minutesRaw ?: "Sin datos",
        distanceMeters = location?.let {
          GeoUtils.distanceMeters(
            lat1 = it.latitude,
            lon1 = it.longitude,
            lat2 = stop.lat,
            lon2 = stop.lon,
          ).toInt()
        },
        updatedAtMillis = System.currentTimeMillis(),
      )
    }

    snapshotRepository.saveSnapshots(snapshots)
    FavoriteStopsWidget().updateAll(appContext)
  }
}
