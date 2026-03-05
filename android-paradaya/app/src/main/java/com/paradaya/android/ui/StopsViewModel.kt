package com.paradaya.android.ui

import android.app.Application
import android.location.Location
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paradaya.android.data.location.LocationProvider
import com.paradaya.android.data.model.BusArrival
import com.paradaya.android.data.model.BusStop
import com.paradaya.android.data.repository.BusStopRepository
import com.paradaya.android.data.repository.UserPreferencesRepository
import com.paradaya.android.widget.WidgetUpdateScheduler
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class StopsUiState(
  val isLoading: Boolean = true,
  val isRefreshing: Boolean = false,
  val error: String? = null,
  val query: String = "",
  val allStops: List<BusStop> = emptyList(),
  val favoriteStopIds: Set<String> = emptySet(),
  val arrivalsByStop: Map<String, List<BusArrival>> = emptyMap(),
  val userLocation: Location? = null,
  val lastUpdatedAtMillis: Long? = null,
)

class StopsViewModel(
  application: Application,
) : AndroidViewModel(application) {
  private val appContext = application.applicationContext
  private val busStopRepository = BusStopRepository()
  private val preferencesRepository = UserPreferencesRepository(appContext)
  private val locationProvider = LocationProvider(appContext)

  private val _uiState = MutableStateFlow(StopsUiState())
  val uiState = _uiState.asStateFlow()

  private var refreshJob: Job? = null

  init {
    observeFavorites()
    refreshNow()
    startPeriodicRefresh()
    WidgetUpdateScheduler.ensureScheduledIfWidgetExists(appContext)
  }

  fun onQueryChanged(value: String) {
    _uiState.update { current ->
      current.copy(query = value)
    }
  }

  fun hasLocationPermission(): Boolean = locationProvider.hasLocationPermission()

  fun onLocationPermissionGranted() {
    refreshLocation()
  }

  fun toggleFavorite(stopId: String) {
    viewModelScope.launch {
      preferencesRepository.toggleFavorite(stopId)
      WidgetUpdateScheduler.ensureScheduledIfWidgetExists(appContext)
      WidgetUpdateScheduler.triggerImmediate(appContext)
    }
  }

  fun refreshNow() {
    refreshJob?.cancel()
    refreshJob = viewModelScope.launch {
      refreshNowInternal()
    }
  }

  private suspend fun refreshNowInternal() {
    val showFullLoader = _uiState.value.allStops.isEmpty()
    _uiState.update { current ->
      current.copy(
        isLoading = showFullLoader,
        isRefreshing = true,
        error = null,
      )
    }

    val stops = runCatching { busStopRepository.fetchStops() }

    stops.onSuccess { freshStops ->
      _uiState.update { current ->
        current.copy(
          allStops = freshStops,
          isLoading = false,
          error = null,
        )
      }
    }.onFailure { throwable ->
      _uiState.update { current ->
        current.copy(
          isLoading = false,
          isRefreshing = false,
          error = throwable.message ?: "Не удалось загрузить остановки",
        )
      }
      return
    }

    refreshLocation()
    refreshFavoriteArrivals(_uiState.value.favoriteStopIds)

    _uiState.update { current ->
      current.copy(
        isRefreshing = false,
        lastUpdatedAtMillis = System.currentTimeMillis(),
      )
    }

    WidgetUpdateScheduler.ensureScheduledIfWidgetExists(appContext)
    WidgetUpdateScheduler.triggerImmediate(appContext)
  }

  private fun observeFavorites() {
    viewModelScope.launch {
      preferencesRepository.favoriteStopIds.collectLatest { ids ->
        _uiState.update { current ->
          current.copy(favoriteStopIds = ids)
        }
        refreshFavoriteArrivals(ids)
      }
    }
  }

  private suspend fun refreshFavoriteArrivals(stopIds: Set<String>) {
    if (stopIds.isEmpty()) {
      _uiState.update { current ->
        current.copy(arrivalsByStop = emptyMap())
      }
      return
    }

    val freshArrivals = mutableMapOf<String, List<BusArrival>>()
    stopIds.forEach { stopId ->
      val arrivals = runCatching { busStopRepository.fetchArrivals(stopId) }.getOrElse { emptyList() }
      freshArrivals[stopId] = arrivals
    }

    _uiState.update { current ->
      current.copy(
        arrivalsByStop = freshArrivals,
        lastUpdatedAtMillis = System.currentTimeMillis(),
      )
    }
  }

  private fun refreshLocation() {
    val location = locationProvider.getLastKnownLocationOrNull()
    _uiState.update { current ->
      current.copy(userLocation = location)
    }
  }

  private fun startPeriodicRefresh() {
    viewModelScope.launch {
      while (isActive) {
        delay(60_000L)
        refreshLocation()
        refreshFavoriteArrivals(_uiState.value.favoriteStopIds)
      }
    }
  }
}
