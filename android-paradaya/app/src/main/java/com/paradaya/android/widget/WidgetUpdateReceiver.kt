package com.paradaya.android.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class WidgetUpdateReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != WidgetUpdateScheduler.ACTION_WIDGET_REFRESH) return

    if (!WidgetUpdateScheduler.hasWidgetInstances(context)) {
      WidgetUpdateScheduler.cancel(context)
      return
    }

    val pendingResult = goAsync()
    CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
      try {
        WidgetRefreshCoordinator(context).refresh()
      } finally {
        WidgetUpdateScheduler.scheduleNext(context.applicationContext)
        pendingResult.finish()
      }
    }
  }
}
