package com.paradaya.android.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class FavoriteStopsWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = FavoriteStopsWidget()

  override fun onEnabled(context: Context) {
    super.onEnabled(context)
    WidgetUpdateScheduler.scheduleNext(context, immediate = true)
  }

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    super.onUpdate(context, appWidgetManager, appWidgetIds)
    WidgetUpdateScheduler.scheduleNext(context, immediate = true)
  }

  override fun onDisabled(context: Context) {
    super.onDisabled(context)
    WidgetUpdateScheduler.cancel(context)
  }
}
