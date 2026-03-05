package com.paradaya.android.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build

object WidgetUpdateScheduler {
  const val ACTION_WIDGET_REFRESH = "com.paradaya.android.action.WIDGET_REFRESH"

  private const val REQUEST_CODE = 2014
  private const val UPDATE_INTERVAL_MS = 60_000L

  fun scheduleNext(context: Context, immediate: Boolean = false) {
    if (!hasWidgetInstances(context)) return

    val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return
    val pendingIntent = refreshPendingIntent(context)
    val triggerAt = System.currentTimeMillis() + if (immediate) 1_000L else UPDATE_INTERVAL_MS

    alarmManager.cancel(pendingIntent)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
      return
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
    } else {
      alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
    }
  }

  fun ensureScheduledIfWidgetExists(context: Context) {
    if (hasWidgetInstances(context)) {
      scheduleNext(context, immediate = false)
    }
  }

  fun triggerImmediate(context: Context) {
    val intent = Intent(context, WidgetUpdateReceiver::class.java)
      .setAction(ACTION_WIDGET_REFRESH)
    context.sendBroadcast(intent)
  }

  fun cancel(context: Context) {
    val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return
    alarmManager.cancel(refreshPendingIntent(context))
  }

  fun hasWidgetInstances(context: Context): Boolean {
    val manager = AppWidgetManager.getInstance(context)
    val componentName = ComponentName(context, FavoriteStopsWidgetReceiver::class.java)
    return manager.getAppWidgetIds(componentName).isNotEmpty()
  }

  private fun refreshPendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, WidgetUpdateReceiver::class.java)
      .setAction(ACTION_WIDGET_REFRESH)

    return PendingIntent.getBroadcast(
      context,
      REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
