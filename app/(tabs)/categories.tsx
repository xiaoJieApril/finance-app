import { Archive, LogOut, Plus, Settings, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncIndicator } from '../../components/ledger';
import { useTransactions } from '../../hooks/useTransactions';
import { supabase } from '../../services/supabase';
import { Category } from '../../type';

export default function CategoriesScreen() {
  const router = useRouter();
  const { userId, fetchCategories, addCategory, updateCategory, archiveCategory } = useTransactions();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<Category['type']>('expense');
  const [menuVisible, setMenuVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const activeCategories = (fetchCategories.data ?? []).filter((category) => !category.archived_at);
  const archivedCategories = (fetchCategories.data ?? []).filter((category) => Boolean(category.archived_at));

  const openCreate = (categoryType: Category['type']) => {
    setEditing(null);
    setName('');
    setType(categoryType);
    setModalVisible(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setType(category.type);
    setModalVisible(true);
  };

  const saveCategory = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('填写类别名称', '类别名称不能为空。');
      return;
    }
    try {
      if (editing) await updateCategory.mutateAsync({ id: editing.id, name: trimmedName });
      else await addCategory.mutateAsync({ name: trimmedName, type });
      setModalVisible(false);
    } catch (error) {
      Alert.alert('无法保存类别', error instanceof Error ? error.message : '请稍后重试。');
    }
  };

  const confirmArchive = (category: Category) => {
    Alert.alert('归档这个类别？', '归档后不能用于新记录，已有交易仍会保留这个类别。', [
      { text: '取消', style: 'cancel' },
      { text: '归档类别', style: 'destructive', onPress: async () => {
        try {
          await archiveCategory.mutateAsync(category.id);
        } catch (error) {
          Alert.alert('无法归档', error instanceof Error ? error.message : '请稍后重试。');
        }
      } },
    ]);
  };

  const confirmSignOut = () => {
    setMenuVisible(false);
    Alert.alert('退出登录？', '本机记录会保留在当前账号下。', [
      { text: '取消', style: 'cancel' },
      { text: '退出登录', style: 'destructive', onPress: async () => {
        setSigningOut(true);
        try {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert('无法退出登录', error.message);
        } catch {
          Alert.alert('无法退出登录', '当前无法连接服务，请稍后重试。');
        } finally {
          setSigningOut(false);
        }
      } },
    ]);
  };

  if (!userId || fetchCategories.isLoading) {
    return <View className="flex-1 items-center justify-center bg-[#F4F7F4]"><ActivityIndicator color="#477A60" /></View>;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F4]" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-5">
        <View>
          <Text className="text-3xl font-bold tracking-tight text-[#183C32]">类别</Text>
          <View className="mt-2"><SyncIndicator /></View>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} className="h-10 w-10 items-center justify-center rounded-full bg-[#EAF1EC]" accessibilityLabel="账户菜单">
          <LogOut size={19} color="#183C32" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <CategoryGroup title="支出类别" type="expense" categories={activeCategories} onAdd={openCreate} onEdit={openEdit} onArchive={confirmArchive} />
        <CategoryGroup title="收入类别" type="income" categories={activeCategories} onAdd={openCreate} onEdit={openEdit} onArchive={confirmArchive} />
        {archivedCategories.length > 0 && (
          <View className="mt-8">
            <Text className="mb-3 text-base font-bold text-[#5D6D63]">已归档</Text>
            {archivedCategories.map((category) => (
              <View key={category.id} className="flex-row items-center border-b border-[#DCE7E0] py-3">
                <Text className="flex-1 text-sm text-[#5D6D63]">{category.name}</Text>
                <Text className="text-xs text-[#5D6D63]">{category.type === 'expense' ? '支出' : '收入'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <View className="rounded-t-[28px] bg-[#F4F7F4] px-5 pb-10 pt-5">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-[#183C32]">{editing ? '修改类别名称' : '新增类别'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="h-9 w-9 items-center justify-center rounded-full bg-[#E7EEE9]"><X size={19} color="#183C32" /></TouchableOpacity>
            </View>
            {!editing && (
              <View className="mb-5 flex-row rounded-full bg-[#E7EEE9] p-1">
                {(['expense', 'income'] as const).map((entryType) => (
                  <TouchableOpacity key={entryType} onPress={() => setType(entryType)} className={`flex-1 items-center rounded-full py-2.5 ${type === entryType ? 'bg-[#183C32]' : ''}`}>
                    <Text className={`font-semibold ${type === entryType ? 'text-white' : 'text-[#5D6D63]'}`}>{entryType === 'expense' ? '支出' : '收入'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput
              className="mb-6 border-b border-[#B8C9BE] py-3 text-base text-[#183C32]"
              value={name}
              onChangeText={setName}
              placeholder="例如：餐饮"
              placeholderTextColor="#75847C"
              autoFocus
              maxLength={32}
              returnKeyType="done"
              onSubmitEditing={saveCategory}
            />
            <TouchableOpacity onPress={saveCategory} disabled={addCategory.isPending || updateCategory.isPending} className="items-center rounded-full bg-[#183C32] py-4">
              <Text className="font-bold text-white">保存类别</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setMenuVisible(false)} className="flex-1 justify-end bg-black/35">
          <View className="rounded-t-[28px] bg-[#F4F7F4] p-5 pb-9">
            <Text className="mb-4 text-lg font-bold text-[#183C32]">账户</Text>
            <TouchableOpacity onPress={() => { setMenuVisible(false); router.push('/settings'); }} className="mb-3 flex-row items-center rounded-2xl bg-[#EAF1EC] p-4">
              <Settings size={19} color="#183C32" />
              <Text className="ml-3 font-semibold text-[#183C32]">设置</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmSignOut} disabled={signingOut} className="flex-row items-center rounded-2xl bg-[#F6E9E6] p-4">
              <LogOut size={19} color="#B65C51" />
              <Text className="ml-3 font-semibold text-[#B65C51]">{signingOut ? '正在退出' : '退出登录'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function CategoryGroup({ title, type, categories, onAdd, onEdit, onArchive }: {
  title: string;
  type: Category['type'];
  categories: Category[];
  onAdd: (type: Category['type']) => void;
  onEdit: (category: Category) => void;
  onArchive: (category: Category) => void;
}) {
  const rows = categories.filter((category) => category.type === type);
  return (
    <View className="mt-7">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#183C32]">{title}</Text>
        <TouchableOpacity onPress={() => onAdd(type)} className="flex-row items-center">
          <Plus size={16} color="#477A60" />
          <Text className="ml-1 text-sm font-semibold text-[#477A60]">新增</Text>
        </TouchableOpacity>
      </View>
      {rows.length === 0 ? (
        <Text className="border-y border-[#DCE7E0] py-4 text-sm text-[#5D6D63]">还没有类别</Text>
      ) : rows.map((category) => (
        <View key={category.id} className="flex-row items-center border-b border-[#DCE7E0] py-3">
          <TouchableOpacity onPress={() => onEdit(category)} className="flex-1 py-1" accessibilityLabel={`修改${category.name}`}>
            <Text className="text-[15px] font-medium text-[#183C32]">{category.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(category)} className="px-3 py-2">
            <Text className="text-xs font-semibold text-[#477A60]">编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onArchive(category)} className="px-2 py-2" accessibilityLabel={`归档${category.name}`}>
            <Archive size={17} color="#5D6D63" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
