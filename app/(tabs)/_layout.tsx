import { Tabs } from 'expo-router';
import { History, Home, LayoutGrid, PlusCircle, UserCircle } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5', // Indigo 600
        tabBarInactiveTintColor: '#94a3b8', // Slate 400
        tabBarStyle: {
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          backgroundColor: 'white',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '主頁',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '記錄',
          tabBarIcon: ({ color }) => <History size={24} color={color} />,
        }}
      />
      {/* 中間的加號按鈕：我們讓它點擊時在 index 頁面彈出 Modal */}
      <Tabs.Screen
        name="add_trigger"
        options={{
          title: '新增',
          tabBarIcon: ({ color }) => (
            <View className="bg-indigo-600 p-2 rounded-full -mt-5 shadow-lg shadow-indigo-300">
              <PlusCircle size={32} color="white" />
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // 這裡發送一個事件或直接跳轉到 index 並開啟 modal
            navigation.navigate('index', { openModal: true });
          },
        })}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: '類別',
          tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
        }}
      />
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