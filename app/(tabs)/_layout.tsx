import { Tabs } from 'expo-router';
import { BarChart3, ClipboardList, History, Home, Target } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          height: Platform.OS === 'web' ? 68 : 86,
          paddingBottom: Platform.OS === 'web' ? 8 : 24,
          paddingTop: 10,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '總覽',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '流水',
          tabBarIcon: ({ color }) => <History size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: '預算',
          tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: '目標',
          tabBarIcon: ({ color }) => <Target size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: '洞察',
          tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} />,
        }}
      />

      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="savings" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
