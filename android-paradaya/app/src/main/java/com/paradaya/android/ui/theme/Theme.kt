package com.paradaya.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
  primary = Color(0xFFB45309),
  onPrimary = Color.White,
  secondary = Color(0xFF9A3412),
  surface = Color(0xFFFFFBF5),
  background = Color(0xFFFFFBF5),
)

private val DarkColors = darkColorScheme(
  primary = Color(0xFFF59E0B),
  secondary = Color(0xFFFB923C),
)

@Composable
fun ParadaYaTheme(
  darkTheme: Boolean = false,
  content: @Composable () -> Unit,
) {
  MaterialTheme(
    colorScheme = if (darkTheme) DarkColors else LightColors,
    content = content,
  )
}
