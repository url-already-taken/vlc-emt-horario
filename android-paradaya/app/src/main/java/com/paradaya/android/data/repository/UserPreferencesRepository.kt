package com.paradaya.android.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import com.paradaya.android.data.store.paradaYaDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class UserPreferencesRepository(
  private val context: Context,
) {
  val favoriteStopIds: Flow<Set<String>> = context.paradaYaDataStore.data.map { prefs ->
    prefs[FAVORITES_KEY] ?: emptySet()
  }

  suspend fun toggleFavorite(stopId: String) {
    context.paradaYaDataStore.edit { prefs ->
      val current = prefs[FAVORITES_KEY] ?: emptySet()
      prefs[FAVORITES_KEY] = if (current.contains(stopId)) {
        current - stopId
      } else {
        current + stopId
      }
    }
  }

  companion object {
    private val FAVORITES_KEY = stringSetPreferencesKey("favorite_stop_ids")
  }
}
