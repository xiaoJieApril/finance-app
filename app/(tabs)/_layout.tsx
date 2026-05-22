import { Tabs } from 'expo-router';
import { BarChart3, History, Home, LayoutGrid, Plus } from 'lucide-react-native';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5', // 點擊時的高級紫色
        tabBarInactiveTintColor: '#94a3b8', // 未點擊的洗鍊灰
        tabBarStyle: {
          height: Platform.OS === 'web' ? 70 : 88, 
          paddingBottom: Platform.OS === 'web' ? 0 : 28,
          paddingTop: 12,
          backgroundColor: 'white',
          borderTopWidth: 0, // 徹底移除死板的邊框黑線
          // 加上極具洗鍊感的無邊框懸浮微陰影
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.03,
          shadowRadius: 16,
          elevation: 10, 
        },
        headerShown: false,
      }}
    >
      {/* 1. 最左側：錢包主頁 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '主頁',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />

      {/* 2. 左二：全歷史記錄流水 */}
      <Tabs.Screen
        name="history"
        options={{
          title: '歷史記錄',
          tabBarIcon: ({ color }) => <History size={22} color={color} />,
        }}
      />

      {/* 3. 🌟 正中間：凸起立體加號按鈕 */}
      <Tabs.Screen
        name="add_transaction"
        options={{
          title: '', 
          tabBarIcon: () => (
            <View className="bg-indigo-600 w-14 h-14 rounded-full justify-center items-center -mt-8 shadow-xl shadow-indigo-300 border-4 border-white">
              <Plus size={28} color="white" strokeWidth={3} />
            </View>
          ),
        }}
        // 🌟 這裡原本的 listeners 區塊已經被我們徹底刪除了！
      />

      {/* 4. 右二：交易類別控管 */}
      <Tabs.Screen
        name="categories"
        options={{
          title: '交易類別',
          tabBarIcon: ({ color }) => <LayoutGrid size={22} color={color} />,
        }}
      />

      {/* 5. 最右側：儲蓄計畫 ＋ 本月分析圖表 (雙效合一) */}
      <Tabs.Screen
        name="savings"
        options={{
          title: '儲蓄分析',
          tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} />,
        }}
      />

      {/* 隱藏 profile 的多餘分頁連結路徑，確保路由不衝突 */}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}