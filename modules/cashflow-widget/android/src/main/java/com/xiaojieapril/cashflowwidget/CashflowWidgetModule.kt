package com.xiaojieapril.cashflowwidget

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CashflowWidgetModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CashflowWidget")

    AsyncFunction("saveSnapshot") { amount: Double, amountVisible: Boolean, updatedAtMillis: Double ->
      CashflowWidgetStorage.saveSnapshot(context, amount, amountVisible, updatedAtMillis.toLong())
      CashflowWidgetProvider.refreshWidgets(context)
    }

    AsyncFunction("setAmountVisible") { amountVisible: Boolean ->
      CashflowWidgetStorage.setAmountVisible(context, amountVisible)
      CashflowWidgetProvider.refreshWidgets(context)
    }

    AsyncFunction("clearSnapshot") {
      CashflowWidgetStorage.clearSnapshot(context)
      CashflowWidgetProvider.refreshWidgets(context)
    }
  }
}
