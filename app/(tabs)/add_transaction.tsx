import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePickerField } from '../../components/DatePickerField';
import { SyncIndicator } from '../../components/ledger';
import { useTransactions } from '../../hooks/useTransactions';
import { toDateKey } from '../../services/dateUtils';
import { Category } from '../../type';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { userId, fetchTransactions, fetchCategories, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toDateKey(new Date()));
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<Category['type']>('expense');
  const editing = Boolean(id);
  const currentTransaction = useMemo(() => fetchTransactions.data?.find((item) => item.id === id), [fetchTransactions.data, id]);
  const categories = (fetchCategories.data ?? []).filter((category) => !category.archived_at && category.type === type);
  const isSaving = addTransaction.isPending || updateTransaction.isPending || deleteTransaction.isPending;

  useEffect(() => {
    if (!currentTransaction) return;
    setAmount(String(currentTransaction.amount));
    setNote(currentTransaction.note ?? '');
    setDate(toDateKey(new Date(currentTransaction.date)));
    setCategoryId(currentTransaction.category ? currentTransaction.category_id : '');
    setType(currentTransaction.category?.type ?? 'expense');
  }, [currentTransaction]);

  const save = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('金额不正确', '请输入大于 0 的金额。');
      return;
    }
    if (!isValidDate(date)) {
      Alert.alert('日期不正确', '请使用 YYYY-MM-DD 格式填写日期。');
      return;
    }
    if (!categoryId) {
      Alert.alert('选择类别', '请先选择一个类别。');
      return;
    }
    try {
      if (editing && id) {
        await updateTransaction.mutateAsync({ id, amount: numericAmount, note: note.trim(), date: dateToIso(date), category_id: categoryId });
      } else {
        await addTransaction.mutateAsync({ amount: numericAmount, note: note.trim(), date: dateToIso(date), category_id: categoryId });
      }
      router.back();
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '本机保存失败，请稍后重试。');
    }
  };

  const confirmDelete = () => {
    if (!id) return;
    Alert.alert('删除这笔记录？', '删除后会从历史中移除，并在联网时同步。', [
      { text: '取消', style: 'cancel' },
      { text: '删除记录', style: 'destructive', onPress: async () => {
        try {
          await deleteTransaction.mutateAsync(id);
          router.back();
        } catch (error) {
          Alert.alert('无法删除', error instanceof Error ? error.message : '请稍后重试。');
        }
      } },
    ]);
  };

  if (!userId || (editing && fetchTransactions.isLoading) || fetchCategories.isLoading) {
    return <View className="flex-1 items-center justify-center bg-[#F4F7F4]"><ActivityIndicator color="#477A60" /></View>;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F4]" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between py-4">
            <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-[#EAF1EC]" accessibilityLabel="返回">
              <ChevronLeft size={22} color="#183C32" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-[#183C32]">{editing ? '修改记录' : '记一笔'}</Text>
            {editing ? (
              <TouchableOpacity onPress={confirmDelete} disabled={isSaving} className="h-10 w-10 items-center justify-center rounded-full bg-[#F6E9E6]" accessibilityLabel="删除记录">
                <Trash2 size={18} color="#B65C51" />
              </TouchableOpacity>
            ) : <View className="w-10" />}
          </View>
          <View className="mb-7"><SyncIndicator /></View>

          <View className="mb-8 flex-row rounded-full bg-[#E7EEE9] p-1">
            {(['expense', 'income'] as const).map((entryType) => {
              const selected = type === entryType;
              return (
                <TouchableOpacity key={entryType} onPress={() => { setType(entryType); setCategoryId(''); }} className={`flex-1 items-center rounded-full py-3 ${selected ? 'bg-[#183C32]' : ''}`}>
                  <Text className={`font-semibold ${selected ? 'text-white' : 'text-[#5D6D63]'}`}>{entryType === 'expense' ? '支出' : '收入'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="mb-2 text-sm font-semibold text-[#5D6D63]">金额</Text>
          <View className="mb-7 flex-row items-center border-b-2 border-[#477A60] pb-3">
            <Text className="mr-3 text-lg font-semibold text-[#477A60]">RM</Text>
            <TextInput
              className="flex-1 py-1 text-4xl font-bold text-[#183C32]"
              placeholder="0.00"
              placeholderTextColor="#75847C"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus={!editing}
            />
          </View>

          <Text className="mb-2 text-sm font-semibold text-[#183C32]">日期</Text>
          <DatePickerField value={date} onChange={setDate} />

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-[#183C32]">选择类别</Text>
            <TouchableOpacity onPress={() => router.push('/categories')}>
              <Text className="text-sm font-semibold text-[#477A60]">管理类别</Text>
            </TouchableOpacity>
          </View>
          {categories.length === 0 ? (
            <TouchableOpacity onPress={() => router.push('/categories')} className="mb-7 border border-dashed border-[#B8C9BE] px-4 py-5">
              <Text className="text-sm text-[#5D6D63]">还没有{type === 'expense' ? '支出' : '收入'}类别，先去新增一个。</Text>
            </TouchableOpacity>
          ) : (
            <View className="mb-7 flex-row flex-wrap gap-2">
              {categories.map((category) => (
                <TouchableOpacity key={category.id} onPress={() => setCategoryId(category.id)} className={`rounded-full border px-4 py-2.5 ${categoryId === category.id ? 'border-[#183C32] bg-[#183C32]' : 'border-[#DCE7E0] bg-white'}`}>
                  <Text className={`font-medium ${categoryId === category.id ? 'text-white' : 'text-[#477A60]'}`}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text className="mb-2 text-sm font-semibold text-[#183C32]">备注（选填）</Text>
          <TextInput
            className="mb-8 border-b border-[#DCE7E0] py-3 text-base text-[#183C32]"
            placeholder="例如：午餐"
            placeholderTextColor="#75847C"
            value={note}
            onChangeText={setNote}
            returnKeyType="done"
          />

          <TouchableOpacity onPress={save} disabled={isSaving || !categoryId} className={`items-center rounded-full py-4 ${isSaving || !categoryId ? 'bg-[#75847C]' : 'bg-[#183C32]'}`}>
            <Text className="text-base font-bold text-white">{isSaving ? '正在保存' : editing ? '保存修改' : '保存记录'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function dateToIso(value: string) {
  return new Date(`${value}T12:00:00`).toISOString();
}
