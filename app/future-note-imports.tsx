import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Check, NotebookTabs, X } from 'lucide-react-native';
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
import { useFutureNoteImports } from '@/hooks/useFutureNoteImports';
import { CurrencyCode, FutureNoteImport, TransactionEntry } from '@/type';
import { formatMoney } from '@/utils/finance';

const CURRENCY_OPTIONS = [
  { label: 'MYR', value: 'MYR' },
  { label: 'SGD', value: 'SGD' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function FutureNoteImportsScreen() {
  const router = useRouter();
  const { financeData, saveEntry } = useFinanceData();
  const { pendingImports, ignoreImport, markConfirmed } = useFutureNoteImports();
  const data = financeData.data;

  const [selectedImport, setSelectedImport] = useState<FutureNoteImport | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
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

  const categories = useMemo(
    () => data?.categories.filter((category) => category.type === 'expense') ?? [],
    [data?.categories],
  );

  useEffect(() => {
    if (!selectedImport || !data) return;

    const categoryByHint = selectedImport.category_hint
      ? categories.find((category) =>
          category.name.toLowerCase().includes(selectedImport.category_hint!.toLowerCase()),
        )
      : null;
    const accountByHint = selectedImport.account_hint
      ? data.accounts.find((account) =>
          account.name.toLowerCase().includes(selectedImport.account_hint!.toLowerCase()),
        )
      : null;

    setAccountId(accountByHint?.id ?? data.accounts[0]?.id ?? null);
    setCategoryId(categoryByHint?.id ?? categories[0]?.id ?? null);
    setCurrency(selectedImport.currency);
    setAmount(String(selectedImport.amount));
    setNote(selectedImport.note || selectedImport.title);
    setDate(new Date(selectedImport.due_date));
  }, [categories, data, selectedImport]);

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
      showAlert({ title: '缺少帳戶', message: '請先選擇帳戶。', type: 'warning' });
      return;
    }
    if (!categoryId) {
      showAlert({ title: '缺少類別', message: '請先選擇支出類別。', type: 'warning' });
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      showAlert({ title: '金額錯誤', message: '請輸入有效金額。', type: 'warning' });
      return;
    }

    try {
      const entry = await saveEntry.mutateAsync({
        type: 'expense',
        account_id: accountId,
        to_account_id: null,
        category_id: categoryId,
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
      showAlert({ title: '已加入流水', message: 'Future Note 未來消費已記錄到 finaTracker。', type: 'success' });
    } catch (error) {
      showAlert({
        title: '匯入失敗',
        message: error instanceof Error ? error.message : '請稍後再試。',
        type: 'error',
      });
    }
  };

  const handleIgnore = async (item: FutureNoteImport) => {
    try {
      await ignoreImport.mutateAsync(item);
      showAlert({ title: '已忽略', message: '這筆 Future Note 不會入帳。', type: 'success' });
    } catch {
      showAlert({ title: '操作失敗', message: '請稍後再試。', type: 'error' });
    }
  };

  const pending = pendingImports.data ?? [];
  const isLoading = pendingImports.isLoading || financeData.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-slate-100">
            <ArrowLeft size={20} color="#475569" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-900">Future Note 匯入</Text>
          <View className="w-10 h-10" />
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-5 mb-5">
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center mr-3">
              <NotebookTabs size={20} color="#4f46e5" />
            </View>
            <View className="flex-1">
              <Text className="font-black text-slate-900">Future Note 收件箱</Text>
              <Text className="text-xs text-slate-400 mt-1 leading-5">
                Future Note 傳來的未來消費會先停在這裡，確認後才會寫入 finaTracker 流水。
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#4f46e5" />
          </View>
        ) : pending.length === 0 ? (
          <EmptyState title="沒有待匯入項目" message="Future Note 傳入未來消費後，會出現在這裡。" />
        ) : (
          pending.map((item) => (
            <View key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1 mr-3">
                  <Text className="font-black text-slate-900">{item.title}</Text>
                  <Text className="text-xs text-slate-400 mt-1">
                    {formatDate(item.due_date)}
                    {item.category_hint ? ` · ${item.category_hint}` : ''}
                  </Text>
                </View>
                <Text className="text-lg font-black text-rose-600">
                  {formatMoney(item.amount, item.currency)}
                </Text>
              </View>
              {item.note ? <Text className="text-sm text-slate-500 mb-4">{item.note}</Text> : null}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setSelectedImport(item)}
                  className="flex-1 bg-indigo-600 rounded-xl p-3 flex-row items-center justify-center"
                >
                  <Check size={16} color="white" />
                  <Text className="text-white font-black ml-2">確認匯入</Text>
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
      </ScrollView>

      <Modal visible={Boolean(selectedImport)} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5 max-h-[88%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-black text-slate-900">確認 Future Note</Text>
              <TouchableOpacity onPress={() => setSelectedImport(null)} className="w-9 h-9 items-center justify-center">
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text className="text-sm font-bold text-slate-500 mb-2">帳戶</Text>
              <FilterBar
                options={(data?.accounts ?? []).map((account) => ({ label: account.name, value: account.id }))}
                value={accountId ?? data?.accounts[0]?.id ?? ''}
                onChange={setAccountId}
              />

              <Text className="text-sm font-bold text-slate-500 mb-2">類別</Text>
              {categories.length === 0 ? (
                <EmptyState title="沒有支出類別" message="請先到預算頁建立支出類別。" />
              ) : (
                <FilterBar
                  options={categories.map((category) => ({ label: category.name, value: category.id }))}
                  value={categoryId ?? categories[0]?.id}
                  onChange={setCategoryId}
                />
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

              <Text className="text-sm font-bold text-slate-500 mb-2">預計日期</Text>
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
                  {saveEntry.isPending || markConfirmed.isPending ? '匯入中...' : '確認加入流水'}
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
