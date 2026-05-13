import { Tabs } from 'expo-router';
import { History, Home, LayoutGrid, Plus, UserCircle } from 'lucide-react-native';
import React from 'react';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5', // 點擊時的紫色
        tabBarInactiveTintColor: '#94a3b8', // 未點擊的灰色
        tabBarStyle: {
          height: Platform.OS === 'web' ? 70 : 85, // Web 版微調高度避免裁切
          paddingBottom: Platform.OS === 'web' ? 0 : 25,
          paddingTop: 10,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#f8fafc',
          elevation: 0, // 移除 Android 預設陰影
        },
        headerShown: false,
      }}
    >
      {/* 1. 主頁 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '主頁',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />

      {/* 2. 歷史記錄 */}
      <Tabs.Screen
        name="history"
        options={{
          title: '記錄',
          tabBarIcon: ({ color }) => <History size={24} color={color} />,
        }}
      />

      {/* 3. 🌟 核心：中間的凸起加號按鈕 */}
      <Tabs.Screen
        name="add_transaction"
        options={{
          title: '', // 不顯示文字
          tabBarIcon: () => (
            <View className="bg-indigo-600 w-14 h-14 rounded-full justify-center items-center -mt-7 shadow-lg shadow-indigo-300">
              <Plus size={32} color="white" strokeWidth={3} />
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault(); // 阻止跳轉到空殼頁面
            // 觸發首頁的 useEffect 來打開彈跳視窗
            navigation.navigate('index', { openModal: Date.now().toString() }); 
          },
        })}
      />

      {/* 4. 類別 */}
      <Tabs.Screen
        name="categories"
        options={{
          title: '類別',
          tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
        }}
      />
      
      {/* 5. 個人 */}
      <Tabs.Screen
        name="profile"
        options={{
          title: '個人',
          tabBarIcon: ({ color }) => <UserCircle size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}