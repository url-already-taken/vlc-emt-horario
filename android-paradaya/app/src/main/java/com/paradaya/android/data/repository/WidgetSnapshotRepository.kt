package com.paradaya.android.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.paradaya.android.data.store.paradaYaDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

data class WidgetStopSnapshot(
  val stopId: String,
  val stopName: String,
  val nextLine: String?,
  val etaLabel: String,
  val distanceMeters: Int?,
  val updatedAtMillis: Long,
)

class WidgetSnapshotRepository(
  private val context: Context,
) {
  val snapshotsFlow: Flow<List<WidgetStopSnapshot>> = context.paradaYaDataStore.data.map { prefs ->
    decodeSnapshots(prefs[WIDGET_SNAPSHOTS_KEY])
  }

  suspend fun saveSnapshots(snapshots: List<WidgetStopSnapshot>) {
    context.paradaYaDataStore.edit { prefs ->
      prefs[WIDGET_SNAPSHOTS_KEY] = encodeSnapshots(snapshots)
    }
  }

  private fun encodeSnapshots(snapshots: List<WidgetStopSnapshot>): String {
    val array = JSONArray()
    snapshots.forEach { snapshot ->
      val item = JSONObject()
        .put("stopId", snapshot.stopId)
        .put("stopName", snapshot.stopName)
        .put("nextLine", snapshot.nextLine)
        .put("etaLabel", snapshot.etaLabel)
        .put("distanceMeters", snapshot.distanceMeters)
        .put("updatedAtMillis", snapshot.updatedAtMillis)
      array.put(item)
    }
    return array.toString()
  }

  private fun decodeSnapshots(raw: String?): List<WidgetStopSnapshot> {
    if (raw.isNullOrBlank()) return emptyList()

    return runCatching {
      val parsed = JSONArray(raw)
      buildList {
        for (i in 0 until parsed.length()) {
          val item = parsed.optJSONObject(i) ?: continue
          add(
            WidgetStopSnapshot(
              stopId = item.optString("stopId", ""),
              stopName = item.optString("stopName", ""),
              nextLine = if (item.has("nextLine") && !item.isNull("nextLine")) {
                item.optString("nextLine")
              } else {
                null
              },
              etaLabel = item.optString("etaLabel", "Sin datos"),
              distanceMeters = if (item.has("distanceMeters") && !item.isNull("distanceMeters")) {
                item.optInt("distanceMeters")
              } else {
                null
              },
              updatedAtMillis = item.optLong("updatedAtMillis", 0L),
            ),
          )
        }
      }
    }.getOrElse { emptyList() }
  }

  companion object {
    private val WIDGET_SNAPSHOTS_KEY = stringPreferencesKey("widget_snapshots")
  }
}
