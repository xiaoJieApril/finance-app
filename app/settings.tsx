import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncIndicator } from '../components/ledger';
import { useTransactions } from '../hooks/useTransactions';

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, fetchZeroSpendSettings, toggleZeroSpend } = useTransactions();
  const enabled = fetchZeroSpendSettings.data?.enabled ?? false;

  if (!userId || fetchZeroSpendSettings.isLoading) {
    return <View className="flex-1 items-center justify-center bg-[#F4F7F4]"><ActivityIndicator color="#477A60" /></View>;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F4]" edges={['top']}>
      <View className="flex-row items-center px-5 pb-3 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF1EC]" accessibilityLabel="返回">
          <ChevronLeft size={22} color="#183C32" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-bold text-[#183C32]">设置</Text>
          <View className="mt-1"><SyncIndicator /></View>
        </View>
      </View>

      <View className="mx-5 mt-5 rounded-[24px] border border-[#DCE7E0] bg-white p-5">
        <View className="flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#EAF1EC]"><ShieldCheck size={21} color="#477A60" /></View>
          <View className="flex-1 pr-2">
            <Text className="text-base font-bold text-[#183C32]">自动记录零消费日</Text>
            <Text className="mt-1 text-xs leading-5 text-[#5D6D63]">一整天没有任何收支时，自动标记为零消费日。</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(value) => toggleZeroSpend.mutate(value)}
            disabled={toggleZeroSpend.isPending}
            trackColor={{ false: '#DCE7E0', true: '#A7C7AE' }}
            thumbColor={enabled ? '#477A60' : '#FFFFFF'}
            accessibilityLabel="自动记录零消费日"
          />
        </View>
        <View className="mt-4 border-t border-[#E7EEE9] pt-4">
          <Text className="text-xs leading-5 text-[#5D6D63]">系统会在跨日后检查，并在下次打开应用时补齐漏掉的日期。后台执行时间由手机系统决定，不保证恰好在午夜。</Text>
        </View>
      </View>
      {toggleZeroSpend.isError && <Text className="mx-5 mt-3 text-sm text-[#B65C51]">设置暂未保存，请检查网络后重试。</Text>}
    </SafeAreaView>
  );
}
