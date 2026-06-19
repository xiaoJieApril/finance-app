import { Plus, Trash2, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../../components/ui/CustomButton';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, renderCategoryIcon } from '../../constants/categoryIcons';
import { useTransactions } from '../../hooks/useTransactions';

export default function CategoriesScreen() {
  // 💡 假設你的 useTransactions 包含 updateCategory 和 deleteCategory
  // 如果名稱不同，請根據你實際的 hook 修改
  const { fetchCategories, addCategory, updateCategory, deleteCategory } = useTransactions();
  const { data: categories } = fetchCategories;

  const [viewType, setViewType] = useState<'expense' | 'income'>('expense');

  // 控制 Modal 狀態
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null); // 紀錄目前是否在編輯狀態
  const [catName, setCatName] = useState('');
  const [catBudget, setCatBudget] = useState(''); 
  const [selectedIcon, setSelectedIcon] = useState('utensils');

  const filteredCategories = useMemo(() => {
    return (categories || []).filter(c => c.type === viewType);
  }, [categories, viewType]);

  // 開啟「建立新類別」的 Modal
  const openAddModal = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatBudget('');
    setSelectedIcon(DEFAULT_CATEGORY_ICON);
    setModalVisible(true);
  };

  // 開啟「編輯類別」的 Modal
  const openEditModal = (category: any) => {
    setEditingCategoryId(category.id);
    setCatName(category.name);
    setCatBudget(category.budget_limit ? category.budget_limit.toString() : '');
    setSelectedIcon(category.icon || DEFAULT_CATEGORY_ICON);
    setModalVisible(true);
  };

  // 儲存（新增或更新）
  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      Alert.alert('提示', '請輸入類別名稱！');
      return;
    }

    try {
      if (editingCategoryId) {
        // 💡 編輯模式
        await updateCategory.mutateAsync({
          id: editingCategoryId,
          name: catName.trim(),
          type: viewType,
          icon: selectedIcon,
          budget_limit: viewType === 'expense' && catBudget ? parseFloat(catBudget) : 0,
        });
        Alert.alert('成功', '類別已更新');
      } else {
        // 💡 新增模式
        await addCategory.mutateAsync({
          name: catName.trim(),
          type: viewType, 
          icon: selectedIcon,
          budget_limit: viewType === 'expense' && catBudget ? parseFloat(catBudget) : 0, 
        });
        Alert.alert('成功', `已建立類別：${catName}`);
      }
      
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('錯誤', '儲存類別失敗。');
    }
  };

  // 刪除類別
  const handleDeleteCategory = () => {
    if (!editingCategoryId) return;

    Alert.alert(
      '確認刪除',
      `您確定要刪除「${catName}」類別嗎？刪除後可能影響相關交易的分類。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory.mutateAsync(editingCategoryId);
              Alert.alert('成功', '類別已刪除');
              setModalVisible(false);
            } catch (error) {
              console.error(error);
              Alert.alert('錯誤', '刪除類別失敗。');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-5 pt-4">
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">交易類別</Text>
        
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
              <TouchableOpacity 
                key={cat.id} 
                onPress={() => openEditModal(cat)}
                className="w-[48%] bg-white p-5 rounded-3xl mb-4 shadow-sm border border-slate-100 active:opacity-70"
              >
                <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${viewType === 'expense' ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                  {renderCategoryIcon(cat.icon, 22, viewType === 'expense' ? '#f43f5e' : '#10b981')}
                </View>
                
                <Text className="text-lg font-bold text-slate-800" numberOfLines={1}>{cat.name}</Text>
                
                {cat.type === 'expense' && (
                  <Text className="text-xs font-semibold text-indigo-500 mt-2">
                    {(cat.budget_limit ?? 0) > 0 ? `限額: RM ${cat.budget_limit}` : '未設預算'}
                  </Text>
                )}
                {cat.type === 'income' && <Text className="text-xs text-slate-400 mt-2">收入項目</Text>}
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              onPress={openAddModal}
              className="w-[48%] bg-slate-50 border-2 border-dashed border-slate-300 p-5 rounded-3xl mb-4 items-center justify-center active:bg-slate-100 min-h-[140px]"
            >
              <Plus size={28} color="#64748b" />
              <Text className="text-slate-500 font-bold text-sm mt-2">建立新類別</Text>
            </TouchableOpacity>
            
          </View>
        </ScrollView>
      </View>

      {/* 🌟 核心修復：全面優化 Modal 內的 KeyboardAvoidingView 結構 */}
      <Modal 
        visible={isModalVisible} 
        animationType="slide" 
        transparent={true} 
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* 點擊半透明背景可以關閉 Modal */}
          <TouchableOpacity 
            className="flex-1 bg-black/40 justify-end" 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)}
          >
            {/* 阻止點擊表單本體觸發關閉 */}
            <TouchableOpacity 
              activeOpacity={1} 
              className="bg-white rounded-t-[32px] max-h-[85%]" 
            >
              {/* 🌟 核心修復：表單內部套入 ScrollView，當鍵盤彈起時，可以往上滾動，防止下方 UI 或儲存按鈕被完全遮擋 */}
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 30 }}
              >
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-2xl font-bold text-slate-900">
                    {editingCategoryId ? '編輯' : '建立'}{viewType === 'expense' ? '支出' : '收入'}類別
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-slate-100 p-2 rounded-full">
                    <X size={24} color="#64748b" />
                  </TouchableOpacity>
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
                <View className="flex-row flex-wrap gap-3 mb-6">
                  {CATEGORY_ICONS.map((item) => {
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

                {/* 按鈕區域 */}
                <View className="gap-3 mt-2">
                  <CustomButton title={editingCategoryId ? "儲存修改" : "儲存類別"} onPress={handleSaveCategory} />
                  
                  {/* 🌟 優化點：如果是編輯模式，加一個紅色的刪除按鈕 */}
                  {editingCategoryId && (
                    <TouchableOpacity 
                      onPress={handleDeleteCategory}
                      className="flex-row justify-center items-center py-4 bg-rose-50 border border-rose-200 rounded-xl active:bg-rose-100"
                    >
                      <Trash2 size={20} color="#f43f5e" className="mr-2" />
                      <Text className="text-rose-600 font-bold text-lg">刪除此類別</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
