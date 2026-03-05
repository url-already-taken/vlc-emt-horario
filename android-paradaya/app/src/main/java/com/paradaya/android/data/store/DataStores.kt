package com.paradaya.android.data.store

import android.content.Context
import androidx.datastore.preferences.preferencesDataStore

val Context.paradaYaDataStore by preferencesDataStore(name = "paradaya_preferences")
