import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  clearCashflowWidgetSnapshot,
  saveCashflowWidgetSnapshot,
  setCashflowWidgetAmountVisible,
} from '@/modules/cashflow-widget/src/CashflowWidget';

const AMOUNT_VISIBLE_KEY = '@cashflow_widget_amount_visible';

export function useCashflowWidget(amount: number | null | undefined, shouldClearSnapshot = false) {
  const [isAmountVisible, setIsAmountVisible] = useState(false);
  const [isPreferenceLoaded, setIsPreferenceLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(AMOUNT_VISIBLE_KEY)
      .then((value) => {
        if (mounted && value != null) {
          setIsAmountVisible(value === 'true');
        }
      })
      .finally(() => {
        if (mounted) setIsPreferenceLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (shouldClearSnapshot) {
      clearCashflowWidgetSnapshot().catch(() => {});
      return;
    }
    if (!isPreferenceLoaded || amount == null) return;
    saveCashflowWidgetSnapshot({
      amount,
      amountVisible: isAmountVisible,
    }).catch(() => {});
  }, [amount, isAmountVisible, isPreferenceLoaded, shouldClearSnapshot]);

  const toggleAmountVisible = useCallback(async () => {
    const nextValue = !isAmountVisible;
    setIsAmountVisible(nextValue);
    await AsyncStorage.setItem(AMOUNT_VISIBLE_KEY, String(nextValue));
    await setCashflowWidgetAmountVisible(nextValue);
  }, [isAmountVisible]);

  return {
    isAmountVisible,
    toggleAmountVisible,
  };
}
