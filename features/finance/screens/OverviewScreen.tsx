import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { AlertTriangle, Bell, CalendarDays, Coffee, PiggyBank, Plus, RefreshCw, ShieldCheck, SlidersHorizontal, Target, Utensils, User, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthPanel } from '@/features/auth/components/AuthPanel';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { AccountBalanceCard } from '@/features/finance/components/AccountBalanceCard';
import { BudgetProgressRow } from '@/features/finance/components/BudgetProgressRow';
import { EmptyState } from '@/features/finance/components/EmptyState';
import { FilterBar } from '@/features/finance/components/FilterBar';
import { SectionHeader } from '@/features/finance/components/SectionHeader';
import { SummaryMetric } from '@/features/finance/components/SummaryMetric';
import { TransactionRow } from '@/features/finance/components/TransactionRow';
import { CustomAlert, AlertConfig } from '@/shared/ui/CustomAlert';
import { useFinanceOverview } from '@/features/finance/hooks/useFinanceOverview';
import { CurrencyCode, TransactionEntry, TransactionType } from '@/features/finance/types';
import { developerText } from '@/shared/config/appVariant';
import {
  buildCashflowTimeline,
  calculateSafeToSpend,
  formatMoney,
  simulateCashflowScenario,
} from '@/features/finance/utils/finance';

/**
 * Main cashflow dashboard route.
 *
 * Composes finance overview data with quick transaction creation and shortcuts
 * into deeper finance workflows.
 */
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

const QUICK_TEMPLATES = [
  { label: '早餐', amount: '8', note: '早餐', icon: Coffee },
  { label: '午餐', amount: '15', note: '午餐', icon: Utensils },
  { label: '交通', amount: '6', note: '交通' },
  { label: '咖啡', amount: '12', note: '咖啡', icon: Coffee },
];

export default function OverviewScreen() {
  const router = useRouter();
  const { session, isInitialized } = useAuthSession();
  const { overview, financeData, saveEntry, deleteEntry, saveSavingPlan, isLoading, error } = useFinanceOverview();
  const data = financeData.data;

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TransactionEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<TransactionEntry | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('MYR');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSavings, setIsSavings] = useState(false);
  const [scenarioAmount, setScenarioAmount] = useState('');
  const [scenarioType, setScenarioType] = useState<'expense' | 'income'>('expense');
  const [savingPlanModalVisible, setSavingPlanModalVisible] = useState(false);
  const [savingPlanMode, setSavingPlanMode] = useState<'rate' | 'amount'>('rate');
  const [targetRate, setTargetRate] = useState('20');
  const [targetAmount, setTargetAmount] = useState('300');
  const [bufferAmount, setBufferAmount] = useState('300');
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const categories = useMemo(
    () => data?.categories.filter((category) => category.type === type) ?? [],
    [data?.categories, type],
  );

  const latestEntries = useMemo(() => data?.entries.slice(0, 4) ?? [], [data?.entries]);
  const safeToSpend = useMemo(
    () => (overview ? calculateSafeToSpend(overview.totalNetWorth, data?.recurringItems ?? []) : null),
    [data?.recurringItems, overview],
  );
  const timeline = useMemo(
    () =>
      overview
        ? buildCashflowTimeline(overview.totalNetWorth, data?.recurringItems ?? [])
        : [],
    [data?.recurringItems, overview],
  );
  const scenario = useMemo(
    () => simulateCashflowScenario(overview?.totalNetWorth ?? 0, Number(scenarioAmount) || 0, scenarioType),
    [overview?.totalNetWorth, scenarioAmount, scenarioType],
  );

  useEffect(() => {
    if (session && data && !data.savingPlan) {
      setSavingPlanModalVisible(true);
    }
  }, [data, session]);

  useEffect(() => {
    if (!data?.savingPlan) return;
    setSavingPlanMode(data.savingPlan.mode);
    setTargetRate(String(Math.round(data.savingPlan.target_rate * 100)));
    setTargetAmount(String(data.savingPlan.target_amount));
    setBufferAmount(String(data.savingPlan.buffer_amount));
  }, [data?.savingPlan]);

  const openNewEntry = () => {
    const firstAccount = data?.accounts[0]?.id ?? null;
    const firstExpenseCategory = data?.categories.find((category) => category.type === 'expense')?.id ?? null;
    setEditingEntry(null);
    setType('expense');
    setAccountId(firstAccount);
    setToAccountId(data?.accounts[1]?.id ?? firstAccount);
    setCategoryId(firstExpenseCategory);
    setCurrency('MYR');
    setAmount('');
    setNote('');
    setDate(new Date());
    setIsSavings(false);
    setModalVisible(true);
  };

  const openEditEntry = (entry: TransactionEntry) => {
    const nextType = entry.type;
    const firstAccount = data?.accounts[0]?.id ?? null;
    const typeCategories = data?.categories.filter((category) => category.type === nextType) ?? [];
    setSelectedEntry(null);
    setEditingEntry(entry);
    setType(nextType);
    setAccountId(entry.account_id ?? firstAccount);
    setToAccountId(entry.to_account_id ?? data?.accounts.find((account) => account.id !== entry.account_id)?.id ?? null);
    setCategoryId(nextType === 'transfer' ? null : entry.category_id ?? typeCategories[0]?.id ?? null);
    setCurrency(entry.currency ?? 'MYR');
    setAmount(String(entry.amount));
    setNote(entry.note ?? '');
    setDate(new Date(entry.date));
    setIsSavings(Boolean(entry.is_savings));
    setModalVisible(true);
  };

  const applyTemplate = (template: (typeof QUICK_TEMPLATES)[number]) => {
    const firstAccount = data?.accounts[0]?.id ?? null;
    setType('expense');
    setAccountId((current) => current ?? firstAccount);
    setToAccountId(data?.accounts.find((account) => account.id !== firstAccount)?.id ?? firstAccount);
    setAmount(template.amount);
    setNote(template.note);
    const expenseCategories = data?.categories.filter((category) => category.type === 'expense') ?? [];
    const matched = expenseCategories.find((category) => template.note.includes(category.name) || category.name.includes(template.note));
    setCategoryId(matched?.id ?? expenseCategories[0]?.id ?? null);
    setModalVisible(true);
  };

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    if (nextType === 'transfer') {
      setCategoryId(null);
      setToAccountId((current) => {
        if (current && current !== accountId) return current;
        return data?.accounts.find((account) => account.id !== accountId)?.id ?? null;
      });
      return;
    }

    const nextCategory = data?.categories.find((category) => category.type === nextType)?.id ?? null;
    setCategoryId(nextCategory);
    setToAccountId(null);
  };

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setAlertConfig({ visible: true, title: '金額錯誤', message: '請輸入有效金額。', type: 'warning' });
      return;
    }
    if (!accountId) {
      setAlertConfig({ visible: true, title: '缺少帳戶', message: '請先選擇帳戶。', type: 'warning' });
      return;
    }
    if (type !== 'transfer' && !categoryId) {
      setAlertConfig({ visible: true, title: '缺少類別', message: '請選擇交易類別。', type: 'warning' });
      return;
    }
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      setAlertConfig({ visible: true, title: '轉帳帳戶錯誤', message: '請選擇不同的轉入帳戶。', type: 'warning' });
      return;
    }

    try {
      await saveEntry.mutateAsync({
        id: editingEntry?.id,
        type,
        account_id: accountId,
        to_account_id: type === 'transfer' ? toAccountId : null,
        category_id: type === 'transfer' ? null : categoryId,
        currency,
        amount: parsedAmount,
        note,
        date: date.toISOString(),
        is_savings: type === 'income' ? isSavings : false,
      });
      setModalVisible(false);
      setEditingEntry(null);
      setAlertConfig({
        visible: true,
        title: editingEntry ? '已更新' : '已儲存',
        message: overview?.spendAllowance.status === 'danger'
          ? '交易已儲存。本月安全可花額已偏低，接下來先停一下非必要支出。'
          : overview?.spendAllowance.status === 'tight'
            ? '交易已儲存。本月現金流偏緊，今天先按可花額走。'
            : editingEntry ? '交易已儲存修改。' : '交易已加入流水。',
        type: 'success',
      });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '儲存失敗',
        message: error instanceof Error ? error.message : '請稍後再試。',
        type: 'error',
      });
    }
  };

  const handleDeleteSelectedEntry = async () => {
    if (!selectedEntry) return;

    try {
      await deleteEntry.mutateAsync(selectedEntry);
      setSelectedEntry(null);
      setAlertConfig({ visible: true, title: '已刪除', message: '流水已刪除。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '刪除失敗',
        message: developerText(error instanceof Error ? error.message : '請重新整理後再試。', '刪除失敗，請重新整理後再試。'),
        type: 'error',
      });
    }
  };

  const loadErrorMessage = error instanceof Error ? error.message : '請確認登入狀態與資料庫連線後再重試。';

  const handleSaveSavingPlan = async () => {
    const parsedRate = Math.max(Number(targetRate) || 20, 0) / 100;
    const parsedAmount = Math.max(Number(targetAmount) || 300, 0);
    const parsedBuffer = Math.max(Number(bufferAmount) || 300, 0);

    try {
      await saveSavingPlan.mutateAsync({
        id: data?.savingPlan?.id,
        mode: savingPlanMode,
        target_rate: parsedRate,
        target_amount: parsedAmount,
        buffer_amount: parsedBuffer,
        is_active: true,
      });
      setSavingPlanModalVisible(false);
      setAlertConfig({ visible: true, title: '存錢計劃已啟用', message: '我會用這個目標計算每日可花額。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '儲存失敗',
        message: developerText(error instanceof Error ? error.message : '請稍後再試。', '存錢計劃暫時無法儲存，請稍後再試。'),
        type: 'error',
      });
    }
  };

  if (!isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 bg-slate-50 px-5 pt-12">
        <View className="mb-8">
          <Text className="text-sm font-semibold text-slate-400">Finance Tracker</Text>
          <Text className="text-3xl font-black text-slate-900 mt-1">一眼掌握現金流</Text>
          <Text className="text-slate-500 mt-3 leading-6">
            登入、註冊，或用訪客身份先試用。你的資料會在登入後自動同步。
          </Text>
        </View>
        <Modal visible transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/35">
            <View className="px-5 pb-6">
              <AuthPanel />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  if (isLoading || !overview || !data) {
    if (error && !isLoading) {
      return (
        <View className="flex-1 justify-center bg-slate-50 px-6">
          <View className="bg-white border border-rose-100 rounded-2xl p-5">
            <View className="w-11 h-11 rounded-xl bg-rose-50 items-center justify-center mb-4">
              <AlertTriangle size={22} color="#e11d48" />
            </View>
            <Text className="text-xl font-black text-slate-900 mb-2">
              {developerText('財務資料載入失敗', '資料同步暫時失敗')}
            </Text>
            <Text className="text-sm text-slate-500 leading-6 mb-5">
              {developerText(loadErrorMessage, '請重新載入。如果問題持續發生，請稍後再試。')}
            </Text>
            <TouchableOpacity
              onPress={() => financeData.refetch()}
              className="bg-indigo-600 rounded-2xl p-4 flex-row items-center justify-center"
            >
              <RefreshCw size={18} color="white" />
              <Text className="text-white font-black ml-2">重新載入</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5 pt-12" contentContainerStyle={{ paddingBottom: 110 }}>
        <View className="flex-row items-center justify-between mb-5">
          <View>
            <Text className="text-sm font-semibold text-slate-400">本月財務總覽</Text>
            <Text className="text-3xl font-black text-slate-900 mt-1">一眼掌握現金流</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            className="w-11 h-11 rounded-2xl bg-white border border-slate-100 items-center justify-center"
          >
            <User size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        {data.source === 'legacy' && (
          <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
            <Text className="text-amber-700 font-bold">{developerText('目前使用 legacy 相容模式', '資料同步相容模式')}</Text>
            <Text className="text-amber-600 text-xs mt-1">
              {developerText('套用 v2 Supabase migration 後即可啟用帳戶、轉帳、多幣快取與固定帳單。', '部分進階功能暫時無法使用，資料同步恢復後會自動更新。')}
            </Text>
          </View>
        )}

        <View className={`border rounded-2xl p-5 mb-5 ${
          overview.spendAllowance.status === 'danger'
            ? 'bg-rose-50 border-rose-100'
            : overview.spendAllowance.status === 'tight'
              ? 'bg-amber-50 border-amber-100'
              : 'bg-emerald-50 border-emerald-100'
        }`}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-white/70 items-center justify-center mr-3">
                <PiggyBank
                  size={20}
                  color={overview.spendAllowance.status === 'danger' ? '#e11d48' : overview.spendAllowance.status === 'tight' ? '#d97706' : '#059669'}
                />
              </View>
              <View>
                <Text className="font-black text-slate-900">今天安全可花</Text>
                <Text className="text-xs text-slate-500">
                  {overview.savingPlan.estimated ? '收入不足，先用估算目標' : '已扣除固定帳單、緩衝與本月應存'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSavingPlanModalVisible(true)} className="bg-white/80 px-3 py-2 rounded-xl">
              <Text className="text-xs font-black text-indigo-600">調整</Text>
            </TouchableOpacity>
          </View>
          <Text className={`text-4xl font-black ${
            overview.spendAllowance.status === 'danger'
              ? 'text-rose-600'
              : overview.spendAllowance.status === 'tight'
                ? 'text-amber-600'
                : 'text-emerald-600'
          }`}>
            {formatMoney(overview.spendAllowance.dailyAllowance)}
          </Text>
          <View className="flex-row gap-3 mt-4">
            <View className="flex-1 bg-white/70 rounded-xl p-3">
              <Text className="text-[11px] font-bold text-slate-400">本週可花</Text>
              <Text className="font-black text-slate-800 mt-1">{formatMoney(overview.spendAllowance.weeklyAllowance)}</Text>
            </View>
            <View className="flex-1 bg-white/70 rounded-xl p-3">
              <Text className="text-[11px] font-bold text-slate-400">本月剩餘可花</Text>
              <Text className="font-black text-slate-800 mt-1">{formatMoney(overview.spendAllowance.monthlyRemaining)}</Text>
            </View>
          </View>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center mr-3">
                <Target size={20} color="#4f46e5" />
              </View>
              <View>
                <Text className="font-black text-slate-900">本月存錢進度</Text>
                <Text className="text-xs text-slate-400">目標和每日可花額會連動</Text>
              </View>
            </View>
            <Text className="font-black text-indigo-600">
              {Math.round(overview.savingPlan.targetRate * 100)}%
            </Text>
          </View>
          <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <View
              className="h-full bg-indigo-600 rounded-full"
              style={{ width: `${Math.min((overview.savingPlan.markedSavings / Math.max(overview.savingPlan.requiredSavings, 1)) * 100, 100)}%` }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-slate-500">
              應存 {formatMoney(overview.savingPlan.requiredSavings)}
            </Text>
            <Text className="text-xs text-slate-500">
              還差 {formatMoney(overview.savingPlan.shortfall)}
            </Text>
          </View>
          {overview.goals.length > 0 && (
            <View className="bg-indigo-50 rounded-xl p-3 mt-3">
              <Text className="text-[11px] font-bold text-indigo-500 mb-1">主要目標</Text>
              <Text className="text-indigo-900 font-black">
                {(overview.goals.find((goal) => goal.is_primary) ?? overview.goals[0]).name}
              </Text>
            </View>
          )}
        </View>

        <View className="bg-slate-900 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center mr-3">
              <ShieldCheck size={18} color="#a7f3d0" />
            </View>
            <View>
              <Text className="text-white font-black">存錢教練</Text>
              <Text className="text-slate-400 text-xs">嚴格但不羞辱，只給今天能做的事</Text>
            </View>
          </View>
          {overview.savingCoachSignals.map((signal, index) => (
            <View key={`${signal.text}-${index}`} className="flex-row py-2 border-t border-white/10">
              <View className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                signal.tone === 'danger' ? 'bg-rose-400' : signal.tone === 'tight' ? 'bg-amber-300' : 'bg-emerald-300'
              }`} />
              <Text className="flex-1 text-slate-200 text-sm leading-6">{signal.text}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row gap-3 mb-3">
          <SummaryMetric label="收入" value={formatMoney(overview.cashFlow.income)} tone="income" />
          <SummaryMetric label="支出" value={formatMoney(overview.cashFlow.expense)} tone="expense" />
        </View>
        <View className="flex-row gap-3 mb-5">
          <SummaryMetric label="結餘" value={formatMoney(overview.cashFlow.balance)} />
          <SummaryMetric label="淨資產" value={formatMoney(overview.totalNetWorth)} />
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="font-bold text-slate-800">預算使用率</Text>
            <Text className="font-black text-indigo-600">{Math.round(overview.budgetUsage * 100)}%</Text>
          </View>
          <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <View
              className={`h-full rounded-full ${overview.budgetUsage > 1 ? 'bg-rose-500' : 'bg-indigo-600'}`}
              style={{ width: `${Math.min(overview.budgetUsage * 100, 100)}%` }}
            />
          </View>
          <Text className="text-xs text-slate-400">
            {formatMoney(overview.totalBudgetSpent)} / {formatMoney(overview.totalBudget)}
          </Text>
        </View>

        {safeToSpend && (
          <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold text-slate-800">未來 {safeToSpend.days} 天安全可花</Text>
              <Text className="text-xs font-bold text-emerald-600">含安全緩衝</Text>
            </View>
            <Text className="text-3xl font-black text-emerald-600 mb-2">
              {formatMoney(safeToSpend.safeAmount)}
            </Text>
            <Text className="text-xs text-slate-400">
              約每天 {formatMoney(safeToSpend.dailySafeAmount)}；已預留帳單 {formatMoney(safeToSpend.upcomingExpense)}
              與緩衝 {formatMoney(safeToSpend.safetyBuffer)}。
            </Text>
          </View>
        )}

        <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center mr-3">
              <CalendarDays size={20} color="#4f46e5" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-800">現金流時間線</Text>
              <Text className="text-xs text-slate-400">固定收入與固定支出的未來變化</Text>
            </View>
          </View>
          {timeline.length === 0 ? (
            <Text className="text-sm text-slate-400">未來 30 天沒有已知固定收支。</Text>
          ) : (
            timeline.slice(0, 5).map((item) => (
              <View key={item.id} className="flex-row items-center py-2 border-t border-slate-50">
                <View className={`w-2.5 h-2.5 rounded-full mr-3 ${
                  item.status === 'danger' ? 'bg-rose-500' : item.status === 'tight' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-700">{item.label}</Text>
                  <Text className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString('zh-TW')}</Text>
                </View>
                <View className="items-end">
                  <Text className={item.amount >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                    {item.amount >= 0 ? '+' : '-'}{formatMoney(Math.abs(item.amount))}
                  </Text>
                  <Text className="text-[11px] text-slate-400">餘額 {formatMoney(item.balanceAfter)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-xl bg-violet-50 items-center justify-center mr-3">
              <SlidersHorizontal size={20} color="#7c3aed" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-800">情境模擬</Text>
              <Text className="text-xs text-slate-400">快速試算一筆未來收支是否安全</Text>
            </View>
          </View>
          <FilterBar
            options={[
              { label: '支出', value: 'expense' },
              { label: '收入', value: 'income' },
            ]}
            value={scenarioType}
            onChange={setScenarioType}
          />
          <TextInput
            value={scenarioAmount}
            onChangeText={setScenarioAmount}
            keyboardType="numeric"
            placeholder="輸入金額，例如 200"
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-3"
          />
          <Text
            className={`font-black ${
              scenario.status === 'danger'
                ? 'text-rose-600'
                : scenario.status === 'tight'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
            }`}
          >
            模擬後餘額 {formatMoney(scenario.projectedBalance)}
          </Text>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-bold text-slate-800">月底現金流預測</Text>
            <Text
              className={`font-black ${
                overview.forecast.status === 'danger'
                  ? 'text-rose-600'
                  : overview.forecast.status === 'tight'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
            >
              {overview.forecast.status === 'danger'
                ? '可能透支'
                : overview.forecast.status === 'tight'
                  ? '偏緊'
                  : '安全'}
            </Text>
          </View>
          <Text className="text-3xl font-black text-slate-900 mb-2">
            {formatMoney(overview.forecast.projectedBalance)}
          </Text>
          <Text className="text-xs text-slate-400">
            剩餘固定收入 {formatMoney(overview.forecast.recurringIncome)}，固定支出 {formatMoney(overview.forecast.recurringExpense)}
          </Text>
        </View>

        <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center mr-3">
              <ShieldCheck size={20} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-800">財務健康分數</Text>
              <Text className="text-xs text-slate-400">依預算、儲蓄率、帳單壓力與現金流估算</Text>
            </View>
            <Text
              className={`text-2xl font-black ${
                overview.health.status === 'healthy'
                  ? 'text-emerald-600'
                  : overview.health.status === 'watch'
                    ? 'text-amber-600'
                    : 'text-rose-600'
              }`}
            >
              {overview.health.score}
            </Text>
          </View>
          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${overview.health.score}%` }} />
          </View>
        </View>

        <SectionHeader title="快速記帳" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {QUICK_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <TouchableOpacity
                key={template.label}
                onPress={() => applyTemplate(template)}
                className="bg-white border border-slate-100 rounded-2xl p-4 mr-3 min-w-[105px]"
              >
                {Icon && (
                  <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center mb-3">
                    <Icon size={18} color="#4f46e5" />
                  </View>
                )}
                <Text className="font-black text-slate-800">{template.label}</Text>
                <Text className="text-xs text-slate-400 mt-1">RM {template.amount}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <SectionHeader title="帳戶餘額" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {overview.accounts.map((account) => (
            <AccountBalanceCard key={account.id} account={account} />
          ))}
        </ScrollView>

        <SectionHeader title="即將到期" />
        {overview.upcomingRecurringItems.length === 0 ? (
          <EmptyState title="暫無即將到期項目" message="新增固定帳單後，這裡會顯示未來 14 天待辦。" />
        ) : (
          <View className="mb-5">
            {overview.upcomingRecurringItems.slice(0, 3).map((item) => (
              <View key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mr-3">
                  <Bell size={18} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-slate-800">{item.name}</Text>
                  <Text className="text-xs text-slate-400">{new Date(item.next_due_date).toLocaleDateString()}</Text>
                </View>
                <Text className={item.type === 'income' ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                  {formatMoney(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <SectionHeader title="預算風險" actionLabel="查看全部" onAction={() => router.push('./budget')} />
        {overview.budgets.length === 0 ? (
          <EmptyState title="尚未設定預算" message="到預算頁為主要支出類別設定月限額。" />
        ) : (
          overview.budgets
            .slice()
            .sort((a, b) => b.usage - a.usage)
            .slice(0, 3)
            .map((budget) => (
              <BudgetProgressRow
                key={budget.id}
                category={budget.category}
                spent={budget.spent}
                limit={budget.monthly_limit}
              />
            ))
        )}

        <SectionHeader title="最近流水" actionLabel="全部流水" onAction={() => router.push('/history')} />
        {latestEntries.length === 0 ? (
          <EmptyState title="還沒有交易紀錄" message="點擊右下角 + 開始記第一筆。" />
        ) : (
          latestEntries.map((entry) => (
            <TransactionRow key={entry.id} entry={entry} onPress={() => setSelectedEntry(entry)} />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={openNewEntry}
        className="absolute bottom-6 right-5 w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center shadow-lg"
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5 max-h-[88%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-black text-slate-900">{editingEntry ? '修改交易' : '新增交易'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setEditingEntry(null);
                }}
                className="w-9 h-9 items-center justify-center"
              >
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <FilterBar options={[...TYPE_OPTIONS]} value={type} onChange={handleTypeChange} />
              <Text className="text-sm font-bold text-slate-500 mb-2">帳戶</Text>
              <FilterBar
                options={data.accounts.map((account) => ({ label: account.name, value: account.id }))}
                value={accountId ?? data.accounts[0]?.id}
                onChange={setAccountId}
              />

              {type === 'transfer' && (
                <>
                  <Text className="text-sm font-bold text-slate-500 mb-2">轉入帳戶</Text>
                  <FilterBar
                    options={data.accounts.map((account) => ({ label: account.name, value: account.id }))}
                    value={toAccountId ?? data.accounts[0]?.id}
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

              {type === 'income' && (
                <TouchableOpacity
                  onPress={() => setIsSavings((prev) => !prev)}
                  className={`border rounded-2xl p-4 mb-4 ${isSavings ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}
                >
                  <Text className={`font-bold ${isSavings ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {isSavings ? '已標記為儲蓄收入' : '標記為儲蓄收入'}
                  </Text>
                </TouchableOpacity>
              )}

              <Text className="text-sm font-bold text-slate-500 mb-2">備註</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="寫點備註..."
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 mb-5"
              />

              <TouchableOpacity
                onPress={handleSave}
                disabled={saveEntry.isPending}
                className="bg-indigo-600 rounded-2xl p-4 items-center"
              >
                <Text className="text-white font-black text-base">
                  {saveEntry.isPending ? '儲存中...' : editingEntry ? '儲存修改' : '儲存交易'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(selectedEntry)} transparent animationType="fade" onRequestClose={() => setSelectedEntry(null)}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setSelectedEntry(null)}>
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-black text-slate-900 mb-1">流水操作</Text>
            <Text className="text-slate-400 mb-5">{selectedEntry?.note || selectedEntry?.category?.name || '未分類'}</Text>
            <TouchableOpacity
              className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 items-center mb-3 flex-row justify-center"
              onPress={() => selectedEntry && openEditEntry(selectedEntry)}
            >
              <RefreshCw size={18} color="#4f46e5" />
              <Text className="text-indigo-600 font-black ml-2">修改流水</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-rose-50 border border-rose-100 rounded-2xl p-4 items-center mb-3"
              disabled={deleteEntry.isPending}
              onPress={() =>
                Alert.alert('確認刪除', '確定要刪除這筆流水嗎？', [
                  { text: '取消', style: 'cancel' },
                  { text: '刪除', style: 'destructive', onPress: handleDeleteSelectedEntry },
                ])
              }
            >
              <Text className="text-rose-600 font-black">
                {deleteEntry.isPending ? '刪除中...' : '刪除流水'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="p-4 items-center" onPress={() => setSelectedEntry(null)}>
              <Text className="text-slate-400 font-bold">取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={savingPlanModalVisible} transparent animationType="slide" onRequestClose={() => setSavingPlanModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-xl font-black text-slate-900">設定本月存錢計劃</Text>
                <Text className="text-xs text-slate-400 mt-1">先把該存的留住，再決定能花多少。</Text>
              </View>
              <TouchableOpacity onPress={() => setSavingPlanModalVisible(false)} className="w-9 h-9 items-center justify-center">
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <FilterBar
              options={[
                { label: '按收入比例', value: 'rate' },
                { label: '固定金額', value: 'amount' },
              ]}
              value={savingPlanMode}
              onChange={setSavingPlanMode}
            />

            {savingPlanMode === 'rate' ? (
              <>
                <Text className="text-sm font-bold text-slate-500 mb-2">每月存收入百分比 (%)</Text>
                <TextInput
                  value={targetRate}
                  onChangeText={setTargetRate}
                  keyboardType="numeric"
                  placeholder="20"
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4"
                />
              </>
            ) : (
              <>
                <Text className="text-sm font-bold text-slate-500 mb-2">每月固定存下 (RM)</Text>
                <TextInput
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="numeric"
                  placeholder="300"
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4"
                />
              </>
            )}

            <Text className="text-sm font-bold text-slate-500 mb-2">最低安全緩衝 (RM)</Text>
            <TextInput
              value={bufferAmount}
              onChangeText={setBufferAmount}
              keyboardType="numeric"
              placeholder="300"
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4"
            />

            <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4">
              <Text className="text-indigo-800 font-black mb-1">建議預設</Text>
              <Text className="text-indigo-600 text-xs leading-5">
                先用收入 20% 或 RM 300 起步。現金流穩定後，再把目標逐步提高。
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveSavingPlan}
              disabled={saveSavingPlan.isPending}
              className="bg-indigo-600 rounded-2xl p-4 items-center"
            >
              <Text className="text-white font-black">
                {saveSavingPlan.isPending ? '儲存中...' : '啟用存錢計劃'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} />
    </View>
  );
}
