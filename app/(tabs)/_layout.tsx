import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { BookOpenText, FolderOpen, Home, Plus, WalletCards } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <LedgerTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: '账本', tabBarIcon: ({ color }) => <Home size={21} color={color} strokeWidth={1.8} /> }} />
      <Tabs.Screen name="history" options={{ title: '历史', tabBarIcon: ({ color }) => <BookOpenText size={21} color={color} strokeWidth={1.8} /> }} />
      <Tabs.Screen name="add_transaction" options={{ title: '记账', href: null }} />
      <Tabs.Screen name="categories" options={{ title: '类别', tabBarIcon: ({ color }) => <FolderOpen size={21} color={color} strokeWidth={1.8} /> }} />
      <Tabs.Screen name="planning" options={{ title: '计划', tabBarIcon: ({ color }) => <WalletCards size={21} color={color} strokeWidth={1.8} /> }} />
    </Tabs>
  );
}

function LedgerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index];
  if (currentRoute?.name === 'add_transaction') return null;
  const routes = state.routes.filter((route) => ['index', 'history', 'categories', 'planning'].includes(route.name));
  const leftRoutes = routes.filter((route) => ['index', 'history'].includes(route.name));
  const rightRoutes = routes.filter((route) => ['categories', 'planning'].includes(route.name));

  const renderRoute = (route: typeof routes[number]) => {
    const options = descriptors[route.key].options;
    const focused = currentRoute?.key === route.key;
    const color = focused ? '#183C32' : '#87958D';
    const icon = options.tabBarIcon?.({ focused, color, size: 21 });
    const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        className="flex-1 items-center justify-center"
      >
        {icon}
        <Text className={`mt-1 text-[11px] font-semibold ${focused ? 'text-[#183C32]' : 'text-[#87958D]'}`}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ height: 68 + insets.bottom, paddingBottom: insets.bottom }} className="flex-row items-stretch border-t border-[#DCE7E0] bg-[#F4F7F4]">
      <View className="flex-1 flex-row">{leftRoutes.map(renderRoute)}</View>
      <Pressable onPress={() => router.push('/add_transaction')} accessibilityRole="button" accessibilityLabel="新增记账" className="w-16 items-center justify-center">
        <View className="-mt-5 h-12 w-12 items-center justify-center rounded-full bg-[#D7E979]">
          <Plus size={25} color="#183C32" strokeWidth={2.2} />
        </View>
      </Pressable>
      <View className="flex-1 flex-row">{rightRoutes.map(renderRoute)}</View>
    </View>
  );
}
