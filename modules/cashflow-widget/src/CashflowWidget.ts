import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type CashflowWidgetNativeModule = {
  saveSnapshot(amount: number, amountVisible: boolean, updatedAtMillis: number): Promise<void>;
  setAmountVisible(amountVisible: boolean): Promise<void>;
  clearSnapshot(): Promise<void>;
};

const NativeCashflowWidget = requireOptionalNativeModule<CashflowWidgetNativeModule>('CashflowWidget');

function isAvailable() {
  return Platform.OS === 'android' && Boolean(NativeCashflowWidget);
}

export async function saveCashflowWidgetSnapshot(params: {
  amount: number;
  amountVisible: boolean;
  updatedAtMillis?: number;
}) {
  if (!isAvailable()) return;
  await NativeCashflowWidget?.saveSnapshot(
    Math.max(params.amount, 0),
    params.amountVisible,
    params.updatedAtMillis ?? Date.now(),
  );
}

export async function setCashflowWidgetAmountVisible(amountVisible: boolean) {
  if (!isAvailable()) return;
  await NativeCashflowWidget?.setAmountVisible(amountVisible);
}

export async function clearCashflowWidgetSnapshot() {
  if (!isAvailable()) return;
  await NativeCashflowWidget?.clearSnapshot();
}
