import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { BellRing, Check, RefreshCw, ShieldCheck, Smartphone, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/finance/EmptyState';
import { FilterBar } from '@/components/finance/FilterBar';
import { AlertConfig, CustomAlert } from '@/components/ui/CustomAlert';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useNotificationImports } from '@/hooks/useNotificationImports';
import { getSupportedNotificationApps, isNativeNotificationImportEnabled } from '@/services/notificationImports';
import { CurrencyCode, NotificationImport, TransactionEntry, TransactionType } from '@/type';
import { formatMoney } from '@/utils/finance';

const TYPE_OPTIONS = [
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' },
  { label: '轉帳', value: 'transfer' },
] as const;

const CURRENCY_OPTIONS = [
  { label: 'MYR', value: 'MYR' },
  { label: 'SGD', value: 'SGD' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
] as const;

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationImportsScreen() {
  const router = useRouter();
  const { financeData, saveEntry } = useFinanceData();
  const {
    pendingImports,
    permission,
    refreshFromDevice,
    createSample,
    ignoreImport,
    markConfirmed,
    openSettings,
  } = useNotificationImports();

  const data = financeData.data;
  const [selectedImport, setSelectedImport] = useState<NotificationImport | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('MYR');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const pending = pendingImports.data ?? [];
  const supportedApps = useMemo(() => getSupportedNotificationApps(), []);
  const nativeImportEnabled = isNativeNotificationImportEnabled();
  const categories = useMemo(
    () => data?.categories.filter((category) => category.type === type) ?? [],
    [data?.categories, type],
  );

  useEffect(() => {
    if (!selectedImport || !data) return;

    const nextType = selectedImport.parsed_type ?? 'expense';
    const typeCategories = data.categories.filter((category) => category.type === nextType);
    const merchant = selectedImport.parsed_merchant ?? selectedImport.source_app;
    setType(nextType);
    setAccountId(data.accounts[0]?.id ?? null);
    setToAccountId(data.accounts[1]?.id ?? null);
    setCategoryId(typeCategories[0]?.id ?? null);
    setCurrency(selectedImport.parsed_currency);
    setAmount(selectedImport.parsed_amount ? String(selectedImport.parsed_amount) : '');
    setNote(merchant ? `${merchant} · ${selectedImport.source_app}` : selectedImport.source_app);
    setDate(new Date(selectedImport.occurred_at));
  }, [data, selectedImport]);

  const showAlert = (config: Omit<AlertConfig, 'visible'>) =>
    setAlertConfig({ ...config, visible: true });

  const handleConfirm = async () => {
    if (!selectedImport) return;
    const parsedAmount = Number(amount);

    if (!data) {
      showAlert({ title: '資料尚未載入', message: '請稍後再試。', type: 'warning' });
      return;
    }
    if (!accountId) {
      showAlert({ title: '缺少帳戶', message: '請先選擇要記錄的帳戶。', type: 'warning' });
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      showAlert({ title: '金額錯誤', message: '請輸入有效金額。', type: 'warning' });
      return;
    }
    if (type !== 'transfer' && !categoryId) {
      showAlert({ title: '缺少類別', message: '請先選擇類別再確認入帳。', type: 'warning' });
      return;
    }
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      showAlert({ title: '轉帳帳戶錯誤', message: '請選擇不同的轉入帳戶。', type: 'warning' });
      return;
    }

    try {
      const entry = await saveEntry.mutateAsync({
        type,
        account_id: accountId,
        to_account_id: type === 'transfer' ? toAccountId : null,
        category_id: type === 'transfer' ? null : categoryId,
        currency,
        amount: parsedAmount,
        note,
        date: date.toISOString(),
      });
      await markConfirmed.mutateAsync({
        item: selectedImport,
        entry: entry as TransactionEntry,
      });
      setSelectedImport(null);
      showAlert({ title: '已確認入帳', message: '通知已轉成一筆正式流水。', type: 'success' });
    } catch (error) {
      showAlert({
        title: '入帳失敗',
        message: error instanceof Error ? error.message : '請稍後再試。',
        type: 'error',
      });
    }
  };

  const handleIgnore = async (item: NotificationImport) => {
    try {
      await ignoreImport.mutateAsync(item);
      showAlert({ title: '已忽略', message: '這筆通知不會入帳。', type: 'success' });
    } catch {
      showAlert({ title: '操作失敗', message: '請稍後再試。', type: 'error' });
    }
  };

  const isLoading = pendingImports.isLoading || financeData.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-1">
            <Text className="text-3xl font-black text-slate-900">通知輔助記帳</Text>
            <Text className="text-sm text-slate-400 mt-1">
              Android 讀取消費通知後，先建立待確認流水。
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <X size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center mr-3">
              <BellRing size={20} color="#4f46e5" />
            </View>
            <View className="flex-1">
              <Text className="font-black text-slate-900">通知讀取權限</Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                {Platform.OS !== 'android'
                  ? '此功能只支援 Android'
                  : !nativeImportEnabled
                    ? '此版本未包含 native listener；可用測試樣本或手動記帳'
                    : permission.data
                      ? '已啟用，可讀取 allowlist 金融通知'
                      : '尚未啟用，需要到 Android 設定授權'}
              </Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full ${
                nativeImportEnabled && permission.data ? 'bg-emerald-50' : 'bg-amber-50'
              }`}
            >
              <Text className={`text-xs font-black ${nativeImportEnabled && permission.data ? 'text-emerald-600' : 'text-amber-600'}`}>
                {nativeImportEnabled && permission.data ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={openSettings}
            disabled={!nativeImportEnabled}
            className={`rounded-2xl p-4 items-center ${
              nativeImportEnabled ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <Text className={nativeImportEnabled ? 'text-white font-black' : 'text-slate-500 font-black'}>
              {nativeImportEnabled ? '開啟 Android 通知存取設定' : '此版本未啟用通知讀取'}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
          <View className="flex-row items-start">
            <ShieldCheck size={20} color="#059669" />
            <View className="flex-1 ml-3">
              <Text className="font-black text-emerald-800">隱私保護規則</Text>
              <Text className="text-xs text-emerald-700 mt-1 leading-5">
                只處理支援清單內的金融 app；OTP、TAC、登入、安全驗證通知會直接忽略；通知只轉成片段預覽和解析結果。
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-3 mb-5">
          <TouchableOpacity
            onPress={() => refreshFromDevice.mutate()}
            disabled={!nativeImportEnabled}
            className={`flex-1 border border-slate-100 rounded-2xl p-4 ${
              nativeImportEnabled ? 'bg-white' : 'bg-slate-100'
            }`}
          >
            <RefreshCw size={20} color="#4f46e5" />
            <Text className="font-black text-slate-900 mt-3">同步通知</Text>
            <Text className="text-xs text-slate-400 mt-1">
              {nativeImportEnabled ? '從 Android listener 拉取新通知' : '內測 build 才會啟用'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => createSample.mutate()}
            className="flex-1 bg-white border border-slate-100 rounded-2xl p-4"
          >
            <Smartphone size={20} color="#0f766e" />
            <Text className="font-black text-slate-900 mt-3">測試樣本</Text>
            <Text className="text-xs text-slate-400 mt-1">建立一筆模擬扣款通知</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-black text-slate-900 mb-3">待確認交易</Text>
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#4f46e5" />
          </View>
        ) : pending.length === 0 ? (
          <EmptyState title="沒有待確認通知" message="收到銀行或錢包通知後，疑似交易會出現在這裡。" />
        ) : (
          pending.map((item) => (
            <View key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1 mr-3">
                  <Text className="font-black text-slate-900">{item.parsed_merchant || item.source_app}</Text>
                  <Text className="text-xs text-slate-400 mt-1">
                    {item.source_app} · {formatTime(item.occurred_at)}
                  </Text>
                </View>
                <Text
                  className={`text-lg font-black ${
                    item.parsed_type === 'income'
                      ? 'text-emerald-600'
                      : item.parsed_type === 'transfer'
                        ? 'text-indigo-600'
                        : 'text-rose-600'
                  }`}
                >
                  {item.parsed_amount ? formatMoney(item.parsed_amount, item.parsed_currency) : '待填金額'}
                </Text>
              </View>
              <Text className="text-sm text-slate-500 leading-5 mb-4">{item.notification_text_preview}</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setSelectedImport(item)}
                  className="flex-1 bg-indigo-600 rounded-xl p-3 flex-row items-center justify-center"
                >
                  <Check size={16} color="white" />
                  <Text className="text-white font-black ml-2">確認</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleIgnore(item)}
                  className="flex-1 bg-slate-100 rounded-xl p-3 items-center"
                >
                  <Text className="text-slate-500 font-black">忽略</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text className="text-lg font-black text-slate-900 mt-4 mb-3">支援來源</Text>
        <View className="bg-white border border-slate-100 rounded-2xl p-4">
          {supportedApps.map((app) => (
            <View key={app.packageName} className="flex-row justify-between py-2 border-b border-slate-50 last:border-b-0">
              <Text className="font-bold text-slate-700">{app.name}</Text>
              <Text className="text-xs text-slate-400">{app.packageName}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={Boolean(selectedImport)} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5 max-h-[88%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-black text-slate-900">確認通知入帳</Text>
              <TouchableOpacity onPress={() => setSelectedImport(null)} className="w-9 h-9 items-center justify-center">
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <FilterBar options={[...TYPE_OPTIONS]} value={type} onChange={(value) => setType(value)} />

              <Text className="text-sm font-bold text-slate-500 mb-2">帳戶</Text>
              <FilterBar
                options={(data?.accounts ?? []).map((account) => ({ label: account.name, value: account.id }))}
                value={accountId ?? data?.accounts[0]?.id ?? ''}
                onChange={setAccountId}
              />

              {type === 'transfer' && (
                <>
                  <Text className="text-sm font-bold text-slate-500 mb-2">轉入帳戶</Text>
                  <FilterBar
                    options={(data?.accounts ?? []).map((account) => ({ label: account.name, value: account.id }))}
                    value={toAccountId ?? data?.accounts[1]?.id ?? data?.accounts[0]?.id ?? ''}
                    onChange={setToAccountId}
                  />
                </>
              )}

              <Text className="text-sm font-bold text-slate-500 mb-2">幣別</Text>
              <FilterBar options={[...CURRENCY_OPTIONS]} value={currency} onChange={setCurrency} />

              <Text className="text-sm font-bold text-slate-500 mb-2">金額</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-2xl font-black text-slate-900 mb-4"
              />

              {type !== 'transfer' && (
                <>
                  <Text className="text-sm font-bold text-slate-500 mb-2">類別</Text>
                  {categories.length === 0 ? (
                    <EmptyState title="沒有可用類別" message="請先到預算頁建立收入/支出類別。" />
                  ) : (
                    <View className="flex-row flex-wrap gap-2 mb-4">
                      {categories.map((category) => {
                        const selected = categoryId === category.id;
                        return (
                          <TouchableOpacity
                            key={category.id}
                            onPress={() => setCategoryId(category.id)}
                            className={`px-4 py-3 rounded-2xl border ${
                              selected ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-200'
                            }`}
                          >
                            <Text className={`font-bold ${selected ? 'text-indigo-600' : 'text-slate-600'}`}>
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              <Text className="text-sm font-bold text-slate-500 mb-2">日期</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4"
              >
                <Text className="font-bold text-slate-700">{date.toLocaleDateString('zh-TW')}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selected) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (selected) setDate(selected);
                  }}
                />
              )}

              <Text className="text-sm font-bold text-slate-500 mb-2">備註</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="寫點備註..."
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 mb-5"
              />

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={saveEntry.isPending || markConfirmed.isPending}
                className="bg-indigo-600 rounded-2xl p-4 items-center"
              >
                <Text className="text-white font-black text-base">
                  {saveEntry.isPending || markConfirmed.isPending ? '入帳中...' : '確認入帳'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
