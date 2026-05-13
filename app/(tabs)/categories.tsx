import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../../components/ui/CustomButton';
import { useTransactions } from '../../hooks/useTransactions';
import { supabase } from '../../services/supabase';

export default function CategoriesScreen() {
  const { fetchCategories } = useTransactions();
  const { data: categories, refetch } = fetchCategories;

  // 一鍵初始化類別的函數
  const seedCategories = async () => {
    const defaultCategories = [
      { name: '餐飲 (211飲食)', icon: 'utensils', type: 'expense' },
      { name: '愛好 (Hololive)', icon: 'heart', type: 'expense' },
      { name: '教育 (JLPT N2)', icon: 'book', type: 'expense' },
      { name: '交通', icon: 'car', type: 'expense' },
      { name: '薪資', icon: 'wallet', type: 'income' },
    ];

    const { error } = await supabase.from('categories').insert(defaultCategories);
    
    if (error) {
      Alert.alert('失敗', error.message);
    } else {
      Alert.alert('成功', '預設類別已初始化！');
      refetch(); // 刷新清單
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 p-5">
      <Text className="text-3xl font-extrabold text-slate-900 mb-6">交易類別</Text>
      
      {(!categories || categories.length === 0) ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-400 mb-4 text-center">目前還沒有任何類別哦！</Text>
          <CustomButton title="初始化預設類別" onPress={seedCategories} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between">
            {categories.map((cat) => (
              <View key={cat.id} className="w-[48%] bg-white p-5 rounded-3xl mb-4 items-center shadow-sm">
                <Text className="text-lg font-bold text-slate-800">{cat.name}</Text>
                <Text className="text-xs text-slate-400 mt-1">{cat.type === 'expense' ? '支出' : '收入'}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}