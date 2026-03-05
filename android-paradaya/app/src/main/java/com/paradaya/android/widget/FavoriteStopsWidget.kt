package com.paradaya.android.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.ImageProvider
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.dp
import androidx.glance.unit.sp
import com.paradaya.android.R
import com.paradaya.android.data.repository.WidgetSnapshotRepository
import com.paradaya.android.data.repository.WidgetStopSnapshot
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.flow.first

class FavoriteStopsWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val snapshots = WidgetSnapshotRepository(context).snapshotsFlow.first()
    provideContent {
      WidgetContent(snapshots)
    }
  }
}

@Composable
private fun WidgetContent(snapshots: List<WidgetStopSnapshot>) {
  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(ImageProvider(R.drawable.widget_background))
      .padding(12.dp),
  ) {
    Text(
      text = "ParadaYa · Favoritos",
      style = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold,
      ),
    )

    Spacer(modifier = GlanceModifier.height(8.dp))

    if (snapshots.isEmpty()) {
      Text(
        text = "Добавь остановки в избранное в приложении",
        style = TextStyle(fontSize = 12.sp),
      )
    } else {
      snapshots.take(6).forEach { snapshot ->
        Text(
          text = "${snapshot.stopName} (#${snapshot.stopId})",
          style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium),
        )

        val lineAndEta = snapshot.nextLine?.let { line -> "L$line · ${snapshot.etaLabel}" } ?: snapshot.etaLabel
        val distanceLabel = formatDistance(snapshot.distanceMeters)
        Text(
          text = "$lineAndEta · $distanceLabel",
          style = TextStyle(fontSize = 11.sp),
        )

        Spacer(modifier = GlanceModifier.height(6.dp))
      }

      val updatedAt = snapshots.maxOfOrNull { it.updatedAtMillis } ?: 0L
      if (updatedAt > 0) {
        val timestamp = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(updatedAt))
        Text(
          text = "Обновлено: $timestamp",
          style = TextStyle(fontSize = 10.sp),
        )
      }
    }
  }
}

private fun formatDistance(distanceMeters: Int?): String {
  if (distanceMeters == null) return "distance n/a"
  if (distanceMeters < 1_000) return "~${distanceMeters} m"
  val km = distanceMeters / 1_000.0
  return "~${"%.2f".format(Locale.US, km)} km"
}
