import { Plus, Trash2, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/finance/EmptyState';
import { FilterBar } from '@/components/finance/FilterBar';
import { CustomButton } from '@/components/ui/CustomButton';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, renderCategoryIcon } from '@/constants/categoryIcons';
import { useFinanceOverview } from '@/hooks/useFinanceOverview';
import { CategoryType, FinanceCategory } from '@/type';

const CATEGORY_TYPE_OPTIONS = [
  { label: '支出類別', value: 'expense' },
  { label: '收入類別', value: 'income' },
] as const;

export default function CategoriesScreen() {
  const { financeData, saveCategory, removeCategory, isLoading } = useFinanceOverview();
  const data = financeData.data;

  const [viewType, setViewType] = useState<CategoryType>('expense');
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catBudget, setCatBudget] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_CATEGORY_ICON);

  const filteredCategories = useMemo(
    () => (data?.categories ?? []).filter((category) => category.type === viewType),
    [data?.categories, viewType],
  );
  const isLegacy = data?.source === 'legacy';

  const closeModal = () => setModalVisible(false);

  const openAddModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatBudget('');
    setSelectedIcon(DEFAULT_CATEGORY_ICON);
    setModalVisible(true);
  };

  const openEditModal = (category: FinanceCategory) => {
    setEditingCategory(category);
    setCatName(category.name);
    setCatBudget(category.budget_limit ? String(category.budget_limit) : '');
    setSelectedIcon(category.icon || DEFAULT_CATEGORY_ICON);
    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    const name = catName.trim();
    if (!name) {
      Alert.alert('提示', '請輸入類別名稱。');
      return;
    }

    try {
      await saveCategory.mutateAsync({
        id: isLegacy && editingCategory?.legacy_category_id ? undefined : editingCategory?.id,
        name,
        type: viewType,
        icon: selectedIcon,
        budget_limit: viewType === 'expense' && catBudget ? Number(catBudget) || 0 : 0,
        legacy_category_id: isLegacy ? editingCategory?.legacy_category_id : undefined,
      });
      closeModal();
      Alert.alert('成功', editingCategory ? '類別已更新。' : `已建立類別：${name}`);
    } catch (error) {
      Alert.alert('錯誤', error instanceof Error ? error.message : '儲存類別失敗。');
    }
  };

  const handleDeleteCategory = () => {
    if (!editingCategory) return;

    Alert.alert('確認刪除', `確定要刪除「${catName}」類別嗎？相關流水會保留並變成未分類。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeCategory.mutateAsync(editingCategory);
            closeModal();
            Alert.alert('成功', '類別已刪除。');
          } catch (error) {
            Alert.alert('錯誤', error instanceof Error ? error.message : '刪除類別失敗。');
          }
        },
      },
    ]);
  };

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
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1 pr-4">
            <Text className="text-3xl font-black text-slate-900">交易類別</Text>
            <Text className="text-sm text-slate-400 mt-1">
              管理收入、支出分類與每月預算限額。
            </Text>
          </View>
          <TouchableOpacity onPress={openAddModal} className="w-11 h-11 bg-indigo-600 rounded-2xl items-center justify-center">
            <Plus size={22} color="white" />
          </TouchableOpacity>
        </View>

        {isLegacy && (
          <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
            <Text className="font-black text-amber-800">兼容模式</Text>
            <Text className="text-xs text-amber-700 mt-1 leading-5">
              目前正在使用舊資料表。套用 v2 migration 後，類別會寫入 finance_categories 並和新流水同步。
            </Text>
          </View>
        )}

        <FilterBar options={[...CATEGORY_TYPE_OPTIONS]} value={viewType} onChange={setViewType} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {filteredCategories.length === 0 ? (
            <EmptyState title="還沒有類別" message="建立常用類別後，記帳和分析會更清楚。" />
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => openEditModal(category)}
                  className="w-[48%] bg-white p-5 rounded-2xl mb-4 border border-slate-100 active:bg-slate-50"
                >
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mb-3 ${viewType === 'expense' ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                    {renderCategoryIcon(category.icon, 22, viewType === 'expense' ? '#f43f5e' : '#10b981')}
                  </View>
                  <Text className="text-lg font-black text-slate-800" numberOfLines={1}>
                    {category.name}
                  </Text>
                  {category.type === 'expense' ? (
                    <Text className="text-xs font-bold text-indigo-500 mt-2">
                      {(category.budget_limit ?? 0) > 0 ? `限額 RM ${category.budget_limit}` : '未設預算'}
                    </Text>
                  ) : (
                    <Text className="text-xs text-slate-400 mt-2">收入項目</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl max-h-[88%]">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 34 }}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-black text-slate-900">
                  {editingCategory ? '編輯' : '建立'}{viewType === 'expense' ? '支出' : '收入'}類別
                </Text>
                <TouchableOpacity onPress={closeModal} className="w-9 h-9 bg-slate-100 rounded-full items-center justify-center">
                  <X size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text className="text-sm font-bold text-slate-500 mb-2">類別名稱</Text>
              <TextInput
                className="bg-slate-50 p-4 rounded-2xl text-slate-800 font-bold text-lg mb-4 border border-slate-200"
                placeholder="輸入名稱..."
                placeholderTextColor="#94a3b8"
                value={catName}
                onChangeText={setCatName}
              />

              {viewType === 'expense' && (
                <View className="mb-4">
                  <Text className="text-sm font-bold text-slate-500 mb-2">每月預算限額 (RM)</Text>
                  <TextInput
                    className="bg-slate-50 p-4 rounded-2xl text-slate-800 font-bold text-lg border border-slate-200"
                    placeholder="不設定請填 0 或留空"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={catBudget}
                    onChangeText={setCatBudget}
                  />
                </View>
              )}

              <Text className="text-sm font-bold text-slate-500 mb-3">選擇圖示</Text>
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

              <View className="gap-3">
                <CustomButton
                  title={saveCategory.isPending ? '儲存中...' : editingCategory ? '儲存修改' : '儲存類別'}
                  onPress={handleSaveCategory}
                  disabled={saveCategory.isPending}
                />
                {editingCategory && (
                  <TouchableOpacity
                    onPress={handleDeleteCategory}
                    disabled={removeCategory.isPending}
                    className="flex-row justify-center items-center py-4 bg-rose-50 border border-rose-200 rounded-2xl active:bg-rose-100"
                  >
                    <Trash2 size={20} color="#f43f5e" />
                    <Text className="text-rose-600 font-black text-base ml-2">
                      {removeCategory.isPending ? '刪除中...' : '刪除此類別'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
