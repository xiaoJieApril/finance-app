import { BookOpen, Car, Coffee, Gamepad2, Heart, LayoutGrid, Monitor, Plane, Plus, ShoppingBag, Utensils, Wallet, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../../components/ui/CustomButton';
import { useTransactions } from '../../hooks/useTransactions';

// 使用 Component Reference，避免 React.cloneElement 的物件鎖定問題
const AVAILABLE_ICONS = [
  { id: 'utensils', component: Utensils },
  { id: 'heart', component: Heart },
  { id: 'book', component: BookOpen },
  { id: 'car', component: Car },
  { id: 'wallet', component: Wallet },
  { id: 'gamepad', component: Gamepad2 },
  { id: 'shopping', component: ShoppingBag },
  { id: 'coffee', component: Coffee },
  { id: 'plane', component: Plane },
  { id: 'monitor', component: Monitor },
];

const renderCategoryIcon = (iconId: string, size = 22, color = '#64748b') => {
  const target = AVAILABLE_ICONS.find(item => item.id === iconId);
  const IconComponent = target ? target.component : LayoutGrid; 
  return <IconComponent size={size} color={color} />;
};

export default function CategoriesScreen() {
  const { fetchCategories, addCategory } = useTransactions();
  const { data: categories, refetch } = fetchCategories;

  const [viewType, setViewType] = useState<'expense' | 'income'>('expense');

  const [isModalVisible, setModalVisible] = useState(false);
  const [catName, setCatName] = useState('');
  const [catBudget, setCatBudget] = useState(''); 
  const [selectedIcon, setSelectedIcon] = useState('utensils');

  const filteredCategories = useMemo(() => {
    return (categories || []).filter(c => c.type === viewType);
  }, [categories, viewType]);

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      Alert.alert('提示', '請輸入類別名稱！');
      return;
    }

    try {
      await addCategory.mutateAsync({
        name: catName.trim(),
        type: viewType, 
        icon: selectedIcon,
        budget_limit: viewType === 'expense' && catBudget ? parseFloat(catBudget) : 0, 
      });
      
      Alert.alert('成功', `已建立類別：${catName}`);
      setCatName('');
      setCatBudget('');
      setSelectedIcon('utensils');
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('錯誤', '新增類別失敗。');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-5 pt-4">
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">交易類別</Text>
        
        {/* 🌟 核心修復：移除了 shadow-sm，改用 border，徹底解決 Android 切換閃退問題 */}
        <View className="flex-row bg-slate-200/60 rounded-2xl p-1 mb-6">
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-xl items-center ${viewType === 'expense' ? 'bg-white border border-slate-200' : ''}`}
            onPress={() => setViewType('expense')}
          >
            <Text className={`font-bold text-base ${viewType === 'expense' ? 'text-rose-500' : 'text-slate-500'}`}>支出類別</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-xl items-center ${viewType === 'income' ? 'bg-white border border-slate-200' : ''}`}
            onPress={() => setViewType('income')}
          >
            <Text className={`font-bold text-base ${viewType === 'income' ? 'text-emerald-500' : 'text-slate-500'}`}>收入類別</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="flex-row flex-wrap justify-between">
            
            {filteredCategories.map((cat) => (
              <View key={cat.id} className="w-[48%] bg-white p-5 rounded-3xl mb-4 shadow-sm border border-slate-100">
                <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${viewType === 'expense' ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                  {renderCategoryIcon(cat.icon, 22, viewType === 'expense' ? '#f43f5e' : '#10b981')}
                </View>
                
                <Text className="text-lg font-bold text-slate-800" numberOfLines={1}>{cat.name}</Text>
                
                {cat.type === 'expense' && (
                  <Text className="text-xs font-semibold text-indigo-500 mt-2">
                    {cat.budget_limit > 0 ? `限額: RM ${cat.budget_limit}` : '未設預算'}
                  </Text>
                )}
                {cat.type === 'income' && <Text className="text-xs text-slate-400 mt-2">收入項目</Text>}
              </View>
            ))}

            <TouchableOpacity 
              onPress={() => setModalVisible(true)}
              className="w-[48%] bg-slate-50 border-2 border-dashed border-slate-300 p-5 rounded-3xl mb-4 items-center justify-center active:bg-slate-100 min-h-[140px]"
            >
              <Plus size={28} color="#64748b" />
              <Text className="text-slate-500 font-bold text-sm mt-2">建立新類別</Text>
            </TouchableOpacity>
            
          </View>
        </ScrollView>
      </View>

      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity className="flex-1 bg-black/40 justify-end" activeOpacity={1} onPress={() => setModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-[32px] p-6 pb-10">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-slate-900">建立{viewType === 'expense' ? '支出' : '收入'}類別</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-slate-100 p-2 rounded-full"><X size={24} color="#64748b" /></TouchableOpacity>
              </View>

              <Text className="text-sm font-semibold text-slate-500 mb-2">類別名稱</Text>
              <TextInput 
                className="bg-slate-50 p-4 rounded-xl text-slate-800 font-bold text-lg mb-4 border border-slate-200"
                placeholder="輸入名稱..." placeholderTextColor="#94a3b8" value={catName} onChangeText={setCatName} 
              />

              {viewType === 'expense' && (
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-slate-500 mb-2">每月預算限額 (RM, 選填)</Text>
                  <TextInput 
                    className="bg-slate-50 p-4 rounded-xl text-slate-800 font-bold text-lg border border-slate-200"
                    placeholder="不設定請填 0 或留空" placeholderTextColor="#94a3b8" keyboardType="numeric" value={catBudget} onChangeText={setCatBudget} 
                  />
                </View>
              )}

              <Text className="text-sm font-semibold text-slate-500 mb-3">選擇圖示</Text>
              <View className="flex-row flex-wrap gap-3 mb-8">
                {AVAILABLE_ICONS.map((item) => {
                  const IconComponent = item.component;
                  const isSelected = selectedIcon === item.id;
                  return (
                    <TouchableOpacity 
                      key={item.id} 
                      onPress={() => setSelectedIcon(item.id)} 
                      className={`p-3 rounded-2xl border ${isSelected ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-200'}`}
                    >
                      <IconComponent size={24} color={isSelected ? '#4f46e5' : '#64748b'} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <CustomButton title="儲存類別" onPress={handleSaveCategory} />
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}