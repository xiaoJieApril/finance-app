import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Bell, Coffee, NotebookTabs, Plus, ShieldCheck, Utensils, User, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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
import { AccountBalanceCard } from '@/components/finance/AccountBalanceCard';
import { BudgetProgressRow } from '@/components/finance/BudgetProgressRow';
import { EmptyState } from '@/components/finance/EmptyState';
import { FilterBar } from '@/components/finance/FilterBar';
import { SectionHeader } from '@/components/finance/SectionHeader';
import { SummaryMetric } from '@/components/finance/SummaryMetric';
import { TransactionRow } from '@/components/finance/TransactionRow';
import { CustomAlert, AlertConfig } from '@/components/ui/CustomAlert';
import { useFinanceOverview } from '@/hooks/useFinanceOverview';
import { useFutureNoteImports } from '@/hooks/useFutureNoteImports';
import { CurrencyCode, TransactionType } from '@/type';
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

const QUICK_TEMPLATES = [
  { label: '早餐', amount: '8', note: '早餐', icon: Coffee },
  { label: '午餐', amount: '15', note: '午餐', icon: Utensils },
  { label: '交通', amount: '6', note: '交通' },
  { label: '咖啡', amount: '12', note: '咖啡', icon: Coffee },
];

export default function OverviewScreen() {
  const router = useRouter();
  const { overview, financeData, saveEntry, isLoading } = useFinanceOverview();
  const { pendingImports: pendingFutureNoteImports } = useFutureNoteImports();
  const data = financeData.data;

  const [modalVisible, setModalVisible] = useState(false);
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

  const openNewEntry = () => {
    const firstAccount = data?.accounts[0]?.id ?? null;
    setType('expense');
    setAccountId(firstAccount);
    setToAccountId(data?.accounts[1]?.id ?? firstAccount);
    setCategoryId(null);
    setCurrency('MYR');
    setAmount('');
    setNote('');
    setDate(new Date());
    setIsSavings(false);
    setModalVisible(true);
  };

  const applyTemplate = (template: (typeof QUICK_TEMPLATES)[number]) => {
    setType('expense');
    setAmount(template.amount);
    setNote(template.note);
    const expenseCategories = data?.categories.filter((category) => category.type === 'expense') ?? [];
    const matched = expenseCategories.find((category) => template.note.includes(category.name) || category.name.includes(template.note));
    setCategoryId(matched?.id ?? expenseCategories[0]?.id ?? null);
    setModalVisible(true);
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
      setAlertConfig({ visible: true, title: '已儲存', message: '交易已加入流水。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '儲存失敗',
        message: error instanceof Error ? error.message : '請稍後再試。',
        type: 'error',
      });
    }
  };

  if (isLoading || !overview || !data) {
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
            <Text className="text-amber-700 font-bold">目前使用 legacy 相容模式</Text>
            <Text className="text-amber-600 text-xs mt-1">
              套用 v2 Supabase migration 後即可啟用帳戶、轉帳、多幣快取與固定帳單。
            </Text>
          </View>
        )}

        {Boolean(pendingFutureNoteImports.data?.length) && (
          <TouchableOpacity
            onPress={() => router.push('../future-note-imports')}
            className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-4 flex-row items-center"
          >
            <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-3">
              <NotebookTabs size={18} color="#7c3aed" />
            </View>
            <View className="flex-1">
              <Text className="font-black text-violet-900">
                有 {pendingFutureNoteImports.data?.length} 筆 Future Note 待匯入
              </Text>
              <Text className="text-xs text-violet-700 mt-1">確認後會成為未來日期的支出流水。</Text>
            </View>
          </TouchableOpacity>
        )}

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
          latestEntries.map((entry) => <TransactionRow key={entry.id} entry={entry} />)
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
              <Text className="text-xl font-black text-slate-900">新增交易</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="w-9 h-9 items-center justify-center">
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <FilterBar options={[...TYPE_OPTIONS]} value={type} onChange={(value) => setType(value)} />
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
                  {saveEntry.isPending ? '儲存中...' : '儲存交易'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} />
    </View>
  );
}
