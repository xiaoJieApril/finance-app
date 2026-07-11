package com.xiaojieapril.cashflowwidget

import android.content.Context

data class CashflowWidgetSnapshot(
  val amount: Double,
  val amountVisible: Boolean,
  val updatedAtMillis: Long
)

object CashflowWidgetStorage {
  private const val PREFS_NAME = "cashflow_widget"
  private const val KEY_READY = "ready"
  private const val KEY_AMOUNT = "amount"
  private const val KEY_AMOUNT_VISIBLE = "amount_visible"
  private const val KEY_UPDATED_AT = "updated_at"

  fun saveSnapshot(context: Context, amount: Double, amountVisible: Boolean, updatedAtMillis: Long) {
    prefs(context)
      .edit()
      .putBoolean(KEY_READY, true)
      .putString(KEY_AMOUNT, amount.coerceAtLeast(0.0).toString())
      .putBoolean(KEY_AMOUNT_VISIBLE, amountVisible)
      .putLong(KEY_UPDATED_AT, updatedAtMillis)
      .apply()
  }

  fun setAmountVisible(context: Context, amountVisible: Boolean) {
    prefs(context).edit().putBoolean(KEY_AMOUNT_VISIBLE, amountVisible).apply()
  }

  fun clearSnapshot(context: Context) {
    prefs(context).edit().remove(KEY_READY).remove(KEY_AMOUNT).remove(KEY_UPDATED_AT).apply()
  }

  fun readSnapshot(context: Context): CashflowWidgetSnapshot? {
    val prefs = prefs(context)
    if (!prefs.getBoolean(KEY_READY, false)) return null
    val amount = prefs.getString(KEY_AMOUNT, null)?.toDoubleOrNull() ?: return null
    val updatedAt = prefs.getLong(KEY_UPDATED_AT, 0L)
    if (updatedAt <= 0L) return null
    return CashflowWidgetSnapshot(
      amount = amount.coerceAtLeast(0.0),
      amountVisible = prefs.getBoolean(KEY_AMOUNT_VISIBLE, false),
      updatedAtMillis = updatedAt
    )
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
