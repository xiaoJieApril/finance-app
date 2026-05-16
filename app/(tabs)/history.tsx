import React, { useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, SectionList, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { LayoutGrid, Utensils, Heart, BookOpen, Car, Wallet, Gamepad2, ShoppingBag, Coffee, Plane, Monitor, MessageSquareText, Trash2 } from 'lucide-react-native';
import { Transaction } from '../../type';
import { CustomAlert, AlertConfig } from '../../components/ui/CustomAlert';

const renderCategoryIcon = (iconId: string, size = 20, color = '#64748b') => {
  switch (iconId) {
    case 'utensils': return <Utensils size={size} color={color} />;
    case 'heart': return <Heart size={size} color={color} />;
    case 'book': return <BookOpen size={size} color={color} />;
    case 'car': return <Car size={size} color={color} />;
    case 'wallet': return <Wallet size={size} color={color} />;
    case 'gamepad': return <Gamepad2 size={size} color={color} />;
    case 'shopping': return <ShoppingBag size={size} color={color} />;
    case 'coffee': return <Coffee size={size} color={color} />;
    case 'plane': return <Plane size={size} color={color} />;
    case 'monitor': return <Monitor size={size} color={color} />;
    default: return <LayoutGrid size={size} color={color} />;
  }
};

export default function HistoryScreen() {
  const { fetchTransactions, deleteTransaction } = useTransactions();
  const { data: transactions, isLoading } = fetchTransactions;

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ visible: false, title: '', message: '', type: 'info' });

  const groupedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const monthKey = `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(tx);
    });
    return Object.keys(groups).map(key => ({ title: key, data: groups[key] }));
  }, [transactions]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-5 pt-4">
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">歷史流水</Text>
        {groupedTransactions.length === 0 ? (
          <View className="flex-1 justify-center items-center pb-20">
            <Text className="text-slate-400 font-medium">目前還沒有任何記帳流水紀錄喔！</Text>
          </View>
        ) : (
          <SectionList
            sections={groupedTransactions}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderSectionHeader={({ section: { title } }) => (
              <View className="bg-slate-50 py-2 mb-2 mt-2">
                <Text className="text-xs font-bold text-slate-400 px-1">{title}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setSelectedTx(item); setOptionsModalVisible(true); }} className="flex-row items-center bg-white p-4 rounded-2xl mb-2.5 shadow-sm border border-slate-100 active:bg-slate-50">
                <View className={`p-3 rounded-full mr-3 ${item.category?.type === 'income' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                  {renderCategoryIcon(item.category?.icon || '', 20, item.category?.type === 'income' ? '#10b981' : '#64748b')}
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-base font-bold text-slate-800">{item.category?.name}</Text>
                  <View className="flex-row items-center mt-0.5">
                    <MessageSquareText size={12} color="#94a3b8" />
                    <Text className="text-xs text-slate-400 ml-1" numberOfLines={1}>{item.note || '無備註'}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className={`text-base font-black ${item.category?.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.category?.type === 'income' ? '+' : '-'}RM {item.amount.toFixed(2)}
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">{new Date(item.date).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <Modal visible={optionsModalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <View className="bg-white rounded-t-[32px] p-6 pb-10">
            <View className="items-center mb-4"><View className="w-12 h-1.5 bg-slate-200 rounded-full" /></View>
            <Text className="text-xl font-bold text-slate-900 mb-1">流水操作</Text>
            <Text className="text-slate-500 mb-6 font-medium">{selectedTx?.category?.name} • RM {selectedTx?.amount.toFixed(2)}</Text>
            <TouchableOpacity className="flex-row items-center bg-rose-50 p-4 rounded-2xl mb-3 active:bg-rose-100" onPress={() => { setOptionsModalVisible(false); setTimeout(() => { setAlertConfig({ visible: true, title: '確認刪除', message: '您確定要刪除這筆交易記錄嗎？', type: 'warning', showCancel: true, confirmText: '確認刪除', onConfirm: () => { if (selectedTx) deleteTransaction.mutate(selectedTx.id); } }); }, 300); }}>
              <Trash2 size={22} color="#f43f5e" /><Text className="text-rose-600 font-bold text-lg ml-3">刪除這筆流水記錄</Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-4 items-center mt-2" onPress={() => setOptionsModalVisible(false)}><Text className="text-slate-400 font-bold text-lg">取消</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}