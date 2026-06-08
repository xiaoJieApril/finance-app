import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Bell, Bot, ChevronRight, PieChart } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertConfig, CustomAlert } from '../../components/ui/CustomAlert';
import { CustomButton } from '../../components/ui/CustomButton';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut, isLoading: isSignOutLoading } = useAuth();
  const { settings, updateSettings } = useNotificationSettings();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const hideAlert = () => setAlertConfig((prev) => ({ ...prev, visible: false }));

  const reminderDate = new Date();
  reminderDate.setHours(settings.dailyReminderHour, settings.dailyReminderMinute, 0, 0);

  const formatTime = (hour: number, minute: number) =>
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const onTimeChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      updateSettings({
        dailyReminderHour: selected.getHours(),
        dailyReminderMinute: selected.getMinutes(),
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-4">
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight mb-8">
            個人設定
          </Text>

          {/* 通知設定 */}
          <View className="bg-white rounded-2xl mb-4 shadow-sm border border-slate-100 overflow-hidden">
            <View className="flex-row items-center px-4 pt-4 pb-2">
              <View className="w-10 h-10 bg-amber-50 rounded-full items-center justify-center mr-3">
                <Bell color="#f59e0b" size={20} />
              </View>
              <Text className="text-slate-800 font-bold text-lg">通知提醒</Text>
            </View>

            <View className="px-4 py-3 flex-row items-center justify-between border-t border-slate-50">
              <View className="flex-1 mr-4">
                <Text className="text-slate-700 font-medium">每日記帳提醒</Text>
                <Text className="text-slate-400 text-xs mt-0.5">每天固定時間提醒你記帳</Text>
              </View>
              <Switch
                value={settings.dailyReminderEnabled}
                onValueChange={(v) => updateSettings({ dailyReminderEnabled: v })}
                trackColor={{ false: '#e2e8f0', true: '#a5b4fc' }}
                thumbColor={settings.dailyReminderEnabled ? '#4f46e5' : '#f8fafc'}
              />
            </View>

            {settings.dailyReminderEnabled && (
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className="px-4 py-3 flex-row items-center justify-between border-t border-slate-50"
              >
                <Text className="text-slate-700 font-medium">提醒時間</Text>
                <Text className="text-indigo-600 font-bold">
                  {formatTime(settings.dailyReminderHour, settings.dailyReminderMinute)}
                </Text>
              </TouchableOpacity>
            )}

            <View className="px-4 py-3 flex-row items-center justify-between border-t border-slate-50">
              <View className="flex-1 mr-4">
                <Text className="text-slate-700 font-medium">類別預算提醒</Text>
                <Text className="text-slate-400 text-xs mt-0.5">
                  各類別達 80% / 90% / 100% 時通知
                </Text>
              </View>
              <Switch
                value={settings.budgetAlertEnabled}
                onValueChange={(v) => updateSettings({ budgetAlertEnabled: v })}
                trackColor={{ false: '#e2e8f0', true: '#a5b4fc' }}
                thumbColor={settings.budgetAlertEnabled ? '#4f46e5' : '#f8fafc'}
              />
            </View>
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={reminderDate}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          {/* AI 財務復盤 */}
          <TouchableOpacity
            onPress={() => router.push('../ai-agent')}
            className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100"
          >
            <View className="w-10 h-10 bg-violet-50 rounded-full items-center justify-center mr-4">
              <Bot color="#7c3aed" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 font-bold text-lg">AI 財務復盤</Text>
              <Text className="text-slate-400 text-xs mt-0.5">每週 / 每月智能復盤報告</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          {/* 數據統計與分析 */}
          <TouchableOpacity
            onPress={() => router.push('../analytics')}
            className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100"
          >
            <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center mr-4">
              <PieChart color="#4f46e5" size={20} />
            </View>
            <Text className="flex-1 text-slate-800 font-bold text-lg">數據統計與分析</Text>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <CustomButton
            title="登出帳號"
            variant="secondary"
            onPress={signOut}
            disabled={isSignOutLoading}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert config={alertConfig} hideAlert={hideAlert} />
    </SafeAreaView>
  );
}
