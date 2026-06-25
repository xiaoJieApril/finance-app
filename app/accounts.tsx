import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, Landmark, Plus, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountBalanceCard } from '@/components/finance/AccountBalanceCard';
import { EmptyState } from '@/components/finance/EmptyState';
import { FilterBar } from '@/components/finance/FilterBar';
import { AlertConfig, CustomAlert } from '@/components/ui/CustomAlert';
import { useFinanceOverview } from '@/hooks/useFinanceOverview';
import { AccountType, CurrencyCode, FinanceAccount } from '@/type';
import { formatMoney } from '@/utils/finance';

const ACCOUNT_TYPES = [
  { label: '現金', value: 'cash' },
  { label: '銀行', value: 'bank' },
  { label: '電子錢包', value: 'ewallet' },
  { label: '信用卡', value: 'credit_card' },
] as const;

const CURRENCIES = [
  { label: 'MYR', value: 'MYR' },
  { label: 'SGD', value: 'SGD' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
] as const;

function iconForType(type: AccountType) {
  if (type === 'bank') return <Landmark size={20} color="#4f46e5" />;
  if (type === 'credit_card') return <CreditCard size={20} color="#4f46e5" />;
  return <Wallet size={20} color="#4f46e5" />;
}

export default function AccountsScreen() {
  const router = useRouter();
  const { overview, financeData, saveAccount, removeAccount, isLoading } = useFinanceOverview();
  const data = financeData.data;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [currency, setCurrency] = useState<CurrencyCode>('MYR');
  const [initialBalance, setInitialBalance] = useState('');
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });

  const openModal = (account?: FinanceAccount) => {
    setEditingAccount(account ?? null);
    setName(account?.name ?? '');
    setType(account?.type ?? 'cash');
    setCurrency(account?.currency ?? 'MYR');
    setInitialBalance(String(account?.initial_balance ?? ''));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setAlertConfig({ visible: true, title: '缺少名稱', message: '請輸入帳戶名稱。', type: 'warning' });
      return;
    }

    try {
      await saveAccount.mutateAsync({
        id: editingAccount?.id,
        name: name.trim(),
        type,
        currency,
        initial_balance: Number(initialBalance) || 0,
      });
      setModalVisible(false);
      setAlertConfig({ visible: true, title: '已儲存', message: '帳戶資料已更新。', type: 'success' });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: '儲存失敗',
        message: data?.source === 'legacy' ? '請先套用 v2 Supabase migration 後再新增帳戶。' : error instanceof Error ? error.message : '請稍後再試。',
        type: 'error',
      });
    }
  };

  const handleArchive = () => {
    if (!editingAccount) return;

    Alert.alert('確認刪除', `確定要刪除「${editingAccount.name}」帳戶嗎？歷史流水仍會保留原帳戶資訊。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeAccount.mutateAsync(editingAccount.id);
            setModalVisible(false);
            setAlertConfig({ visible: true, title: '已刪除', message: '帳戶已從列表移除。', type: 'success' });
          } catch (error) {
            setAlertConfig({
              visible: true,
              title: '刪除失敗',
              message: error instanceof Error ? error.message : '請稍後再試。',
              type: 'error',
            });
          }
        },
      },
    ]);
  };

  if (isLoading || !overview || !data) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-slate-100">
            <ArrowLeft size={20} color="#475569" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-900">帳戶管理</Text>
          <TouchableOpacity onPress={() => openModal()} className="w-10 h-10 bg-indigo-600 rounded-2xl items-center justify-center">
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-5">
          <Text className="text-xs font-bold text-slate-400 mb-1">總餘額</Text>
          <Text className="text-3xl font-black text-slate-900">{formatMoney(overview.totalNetWorth)}</Text>
          <Text className="text-xs text-slate-400 mt-2">依目前帳戶初始餘額與流水推算。</Text>
        </View>

        {overview.accounts.length === 0 ? (
          <EmptyState title="尚未建立帳戶" message="新增現金、銀行或電子錢包來追蹤資金位置。" />
        ) : (
          overview.accounts.map((account) => (
            <TouchableOpacity key={account.id} onPress={() => openModal(account)}>
              <AccountBalanceCard account={account} />
              <View className="h-3" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-5">
            <View className="items-center mb-4">{iconForType(type)}</View>
            <Text className="text-xl font-black text-slate-900 mb-4">{editingAccount ? '編輯帳戶' : '新增帳戶'}</Text>
            <Text className="text-sm font-bold text-slate-500 mb-2">帳戶名稱</Text>
            <TextInput value={name} onChangeText={setName} placeholder="例如：Maybank、Touch n Go" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4" />
            <Text className="text-sm font-bold text-slate-500 mb-2">帳戶類型</Text>
            <FilterBar options={[...ACCOUNT_TYPES]} value={type} onChange={setType} />
            <Text className="text-sm font-bold text-slate-500 mb-2">幣別</Text>
            <FilterBar options={[...CURRENCIES]} value={currency} onChange={setCurrency} />
            <Text className="text-sm font-bold text-slate-500 mb-2">初始餘額</Text>
            <TextInput value={initialBalance} onChangeText={setInitialBalance} keyboardType="numeric" placeholder="0.00" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5" />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 bg-slate-100 rounded-2xl p-4 items-center">
                <Text className="font-black text-slate-600">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} className="flex-1 bg-indigo-600 rounded-2xl p-4 items-center">
                <Text className="font-black text-white">儲存</Text>
              </TouchableOpacity>
            </View>
            {editingAccount && (
              <TouchableOpacity
                onPress={handleArchive}
                disabled={removeAccount.isPending}
                className="bg-rose-50 border border-rose-100 rounded-2xl p-4 items-center mt-3"
              >
                <Text className="font-black text-rose-600">
                  {removeAccount.isPending ? '刪除中...' : '刪除此帳戶'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig((prev) => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
