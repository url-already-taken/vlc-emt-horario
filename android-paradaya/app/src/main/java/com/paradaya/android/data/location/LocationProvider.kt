package com.paradaya.android.data.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import androidx.core.content.ContextCompat

class LocationProvider(
  private val context: Context,
) {
  fun hasLocationPermission(): Boolean {
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

  @SuppressLint("MissingPermission")
  fun getLastKnownLocationOrNull(): Location? {
    if (!hasLocationPermission()) return null

    val manager = context.getSystemService(LocationManager::class.java) ?: return null
    val providers = manager.getProviders(true)

    return providers
      .asSequence()
      .mapNotNull { provider -> runCatching { manager.getLastKnownLocation(provider) }.getOrNull() }
      .maxByOrNull { location -> location.time }
  }
}
