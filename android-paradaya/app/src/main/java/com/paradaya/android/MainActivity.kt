package com.paradaya.android

import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.paradaya.android.data.model.BusArrival
import com.paradaya.android.data.model.BusStop
import com.paradaya.android.domain.GeoUtils
import com.paradaya.android.ui.StopsUiState
import com.paradaya.android.ui.StopsViewModel
import com.paradaya.android.ui.theme.ParadaYaTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      ParadaYaTheme {
        StopsScreen()
      }
    }
  }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun StopsScreen(
  viewModel: StopsViewModel = viewModel(),
) {
  val state by viewModel.uiState.collectAsStateWithLifecycle()
  val context = LocalContext.current

  val permissionLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.RequestMultiplePermissions(),
  ) { result ->
    if (result.values.any { it }) {
      viewModel.onLocationPermissionGranted()
    }
  }

  LaunchedEffect(Unit) {
    if (viewModel.hasLocationPermission()) {
      viewModel.onLocationPermissionGranted()
    }
  }

  val visibleStops = remember(state.allStops, state.query, state.userLocation) {
    buildVisibleStops(state)
  }

  val favoriteStops = remember(visibleStops, state.favoriteStopIds) {
    visibleStops.filter { stop -> state.favoriteStopIds.contains(stop.stopId) }
  }

  val regularStops = remember(visibleStops, state.favoriteStopIds, state.query) {
    val sorted = visibleStops.filterNot { stop -> state.favoriteStopIds.contains(stop.stopId) }
    if (state.query.isBlank()) sorted.take(80) else sorted.take(200)
  }

  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("ParadaYa Android") },
        actions = {
          TextButton(
            onClick = { viewModel.refreshNow() },
            enabled = !state.isRefreshing,
          ) {
            Text(if (state.isRefreshing) "Обновление..." else "Обновить")
          }
        },
      )
    },
  ) { innerPadding ->
    LazyColumn(
      modifier = Modifier
        .fillMaxSize()
        .padding(innerPadding),
      contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
      if (!hasLocationPermission(context)) {
        item {
          PermissionCard(
            onRequestPermission = {
              permissionLauncher.launch(
                arrayOf(
                  Manifest.permission.ACCESS_FINE_LOCATION,
                  Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
              )
            },
          )
        }
      }

      item {
        OutlinedTextField(
          modifier = Modifier.fillMaxWidth(),
          value = state.query,
          onValueChange = viewModel::onQueryChanged,
          singleLine = true,
          label = { Text("Поиск по названию / ID / ubica") },
        )
      }

      item {
        StatusCard(state = state)
      }

      if (state.error != null) {
        item {
          ElevatedCard(
            modifier = Modifier.fillMaxWidth(),
          ) {
            Text(
              text = "Ошибка: ${state.error}",
              modifier = Modifier.padding(12.dp),
              color = MaterialTheme.colorScheme.error,
            )
          }
        }
      }

      if (state.isLoading) {
        item {
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(vertical = 32.dp),
            horizontalArrangement = Arrangement.Center,
          ) {
            CircularProgressIndicator()
          }
        }
      } else {
        if (favoriteStops.isNotEmpty()) {
          item {
            Text(
              text = "Избранные остановки",
              style = MaterialTheme.typography.titleMedium,
              fontWeight = FontWeight.Bold,
            )
          }

          items(favoriteStops, key = { stop -> "fav-${stop.stopId}" }) { stop ->
            StopCard(
              stop = stop,
              isFavorite = true,
              userLocation = state.userLocation,
              arrivals = state.arrivalsByStop[stop.stopId].orEmpty(),
              onToggleFavorite = { viewModel.toggleFavorite(stop.stopId) },
            )
          }
        }

        item {
          Text(
            text = "Остановки",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
          )
        }

        if (regularStops.isEmpty() && favoriteStops.isEmpty()) {
          item {
            Text("Ничего не найдено")
          }
        }

        items(regularStops, key = { stop -> stop.stopId }) { stop ->
          StopCard(
            stop = stop,
            isFavorite = false,
            userLocation = state.userLocation,
            arrivals = emptyList(),
            onToggleFavorite = { viewModel.toggleFavorite(stop.stopId) },
          )
        }
      }
    }
  }
}

@Composable
private fun PermissionCard(
  onRequestPermission: () -> Unit,
) {
  ElevatedCard(modifier = Modifier.fillMaxWidth()) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      Text("Разреши геолокацию, чтобы считать расстояние до остановок.")
      TextButton(onClick = onRequestPermission) {
        Text("Разрешить")
      }
    }
  }
}

@Composable
private fun StatusCard(state: StopsUiState) {
  ElevatedCard(modifier = Modifier.fillMaxWidth()) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
      Text("Остановок загружено: ${state.allStops.size}")
      Text("Избранных: ${state.favoriteStopIds.size}")
      Text(formatUpdatedLabel(state.lastUpdatedAtMillis))
    }
  }
}

@Composable
private fun StopCard(
  stop: BusStop,
  isFavorite: Boolean,
  userLocation: Location?,
  arrivals: List<BusArrival>,
  onToggleFavorite: () -> Unit,
) {
  ElevatedCard(modifier = Modifier.fillMaxWidth()) {
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
      ) {
        Column(
          modifier = Modifier.weight(1f),
          verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
          Text(stop.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
          Text("#${stop.stopId} · ${stop.ubica}", style = MaterialTheme.typography.bodySmall)
        }
        TextButton(onClick = onToggleFavorite) {
          Text(if (isFavorite) "★ В избранном" else "☆ В избранное")
        }
      }

      Text(
        text = buildDistanceLabel(stop, userLocation),
        style = MaterialTheme.typography.bodySmall,
      )

      if (isFavorite) {
        if (arrivals.isEmpty()) {
          Text("ETA: Sin datos", style = MaterialTheme.typography.bodySmall)
        } else {
          val sorted = arrivals.sortedBy { arrival -> arrival.minutesValue ?: Int.MAX_VALUE }.take(3)
          sorted.forEach { arrival ->
            Text("L${arrival.line}: ${arrival.minutesRaw}", style = MaterialTheme.typography.bodySmall)
          }
        }
      }
    }
  }
}

private fun buildVisibleStops(state: StopsUiState): List<BusStop> {
  val query = state.query.trim().lowercase()

  val filtered = if (query.isBlank()) {
    state.allStops
  } else {
    state.allStops.filter { stop ->
      stop.name.lowercase().contains(query) ||
        stop.stopId.lowercase().contains(query) ||
        stop.ubica.lowercase().contains(query)
    }
  }

  val location = state.userLocation
  return if (location == null) {
    filtered.sortedBy { stop -> stop.name }
  } else {
    filtered.sortedBy { stop ->
      GeoUtils.distanceMeters(
        lat1 = location.latitude,
        lon1 = location.longitude,
        lat2 = stop.lat,
        lon2 = stop.lon,
      )
    }
  }
}

private fun buildDistanceLabel(stop: BusStop, location: Location?): String {
  if (location == null) return "Расстояние: нужен доступ к геолокации"

  val meters = GeoUtils.distanceMeters(
    lat1 = location.latitude,
    lon1 = location.longitude,
    lat2 = stop.lat,
    lon2 = stop.lon,
  )

  return if (meters < 1_000) {
    "Расстояние: ~${meters.toInt()} м"
  } else {
    "Расстояние: ~${"%.2f".format(Locale.US, meters / 1_000)} км"
  }
}

private fun formatUpdatedLabel(lastUpdatedAtMillis: Long?): String {
  if (lastUpdatedAtMillis == null) return "Последнее обновление: —"
  val formatter = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
  return "Последнее обновление: ${formatter.format(Date(lastUpdatedAtMillis))}"
}

private fun hasLocationPermission(context: android.content.Context): Boolean {
  val fineGranted = ContextCompat.checkSelfPermission(
    context,
    Manifest.permission.ACCESS_FINE_LOCATION,
  ) == PackageManager.PERMISSION_GRANTED

  val coarseGranted = ContextCompat.checkSelfPermission(
    context,
    Manifest.permission.ACCESS_COARSE_LOCATION,
  ) == PackageManager.PERMISSION_GRANTED

  return fineGranted || coarseGranted
}
