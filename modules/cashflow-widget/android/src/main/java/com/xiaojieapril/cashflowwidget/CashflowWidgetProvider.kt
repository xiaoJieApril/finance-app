package com.xiaojieapril.cashflowwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CashflowWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      updateWidget(context, appWidgetManager, appWidgetId)
    }
  }

  companion object {
    fun refreshWidgets(context: Context) {
      val appWidgetManager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, CashflowWidgetProvider::class.java)
      val ids = appWidgetManager.getAppWidgetIds(component)
      ids.forEach { id -> updateWidget(context, appWidgetManager, id) }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
      val snapshot = CashflowWidgetStorage.readSnapshot(context)
      val views = RemoteViews(context.packageName, R.layout.cashflow_widget)

      val amountText = when {
        snapshot == null -> "RM ****"
        !snapshot.amountVisible -> "RM ****"
        else -> String.format(Locale.US, "RM %.2f", snapshot.amount)
      }
      val subtitle = if (snapshot == null) {
        "需要開啟 App 更新"
      } else {
        "不包括存款 · 最後更新 ${formatTime(snapshot.updatedAtMillis)}"
      }

      views.setTextViewText(R.id.cashflow_widget_amount, amountText)
      views.setTextViewText(R.id.cashflow_widget_subtitle, subtitle)
      views.setOnClickPendingIntent(R.id.cashflow_widget_root, openAppIntent(context, null))
      views.setOnClickPendingIntent(R.id.cashflow_widget_new_entry, openAppIntent(context, "new-entry"))

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun formatTime(updatedAtMillis: Long): String {
      return SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(updatedAtMillis))
    }

    private fun openAppIntent(context: Context, action: String?): PendingIntent {
      val uri = if (action == null) {
        Uri.parse("financeapp:///")
      } else {
        Uri.parse("financeapp:///?action=$action")
      }
      val intent = Intent(Intent.ACTION_VIEW, uri).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      val requestCode = if (action == null) 1001 else 1002
      return PendingIntent.getActivity(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
  }
}
