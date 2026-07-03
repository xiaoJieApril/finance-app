import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Bell, CalendarClock, ChevronRight, Code2, Database, LayoutGrid, Shield, Sparkles, UserPlus, WalletCards, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthPanel } from '@/features/auth/components/AuthPanel';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { AlertConfig, CustomAlert } from '@/shared/ui/CustomAlert';
import { CustomButton } from '@/shared/ui/CustomButton';
import { useNotificationSettings } from '@/shared/hooks/useNotificationSettings';
import { useFinanceOverview } from '@/features/finance/hooks/useFinanceOverview';
import { isSupabaseConfigured } from '@/infrastructure/supabase/client';
import { appBuildInfo, appVariant, developerText, showDeveloperTools } from '@/shared/config/appVariant';

function DiagnosticRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'ok' | 'warn' }) {
  const valueClass = tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-700';

  return (
    <View className="flex-row items-center justify-between py-2 border-t border-slate-50">
      <Text className="text-slate-500 text-sm font-bold">{label}</Text>
      <Text className={`${valueClass} text-sm font-black`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut, isLoading: isSignOutLoading } = useAuth();
  const { isAnonymous, user } = useAuthSession();
  const { settings, updateSettings } = useNotificationSettings();
  const { financeData } = useFinanceOverview();
  const dataSource = financeData.data?.source ?? (financeData.isLoading ? 'loading' : 'unknown');
  const isAiConfigured = Boolean(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
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

          {isAnonymous && (
            <TouchableOpacity
              onPress={() => setUpgradeModalVisible(true)}
              className="bg-indigo-600 rounded-2xl p-4 mb-4 shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-white/15 rounded-full items-center justify-center mr-4">
                  <UserPlus color="white" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-black text-lg">註冊正式帳號</Text>
                  <Text className="text-indigo-100 text-xs mt-0.5">
                    保留目前訪客資料，綁定 Email 和密碼。
                  </Text>
                </View>
                <ChevronRight color="#c7d2fe" size={20} />
              </View>
            </TouchableOpacity>
          )}

          {showDeveloperTools && (
            <View className="bg-slate-900 rounded-2xl mb-4 shadow-sm overflow-hidden">
              <View className="flex-row items-center px-4 pt-4 pb-3">
                <View className="w-10 h-10 bg-indigo-500/20 rounded-full items-center justify-center mr-3">
                  <Code2 color="#c7d2fe" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-black text-lg">開發者工具</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">Developer Build diagnostics</Text>
                </View>
                <View className="bg-indigo-500 rounded-full px-3 py-1">
                  <Text className="text-white text-[11px] font-black">Developer</Text>
                </View>
              </View>

              <View className="bg-white px-4 pb-2">
                <DiagnosticRow label="App variant" value={appVariant} tone="ok" />
                <DiagnosticRow label="App version" value={appBuildInfo.appVersion} />
                <DiagnosticRow label="Runtime" value={appBuildInfo.runtimeVersion} />
                <DiagnosticRow label="Build channel" value={appBuildInfo.channel} />
                <DiagnosticRow
                  label="Supabase"
                  value={isSupabaseConfigured ? 'configured' : 'missing'}
                  tone={isSupabaseConfigured ? 'ok' : 'warn'}
                />
                <DiagnosticRow
                  label="Gemini AI"
                  value={isAiConfigured ? 'configured' : 'missing'}
                  tone={isAiConfigured ? 'ok' : 'warn'}
                />
                <DiagnosticRow label="Data source" value={dataSource} tone={dataSource === 'v2' ? 'ok' : 'warn'} />
              </View>
            </View>
          )}

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

          <TouchableOpacity
            onPress={() => router.push('../accounts')}
            className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100"
          >
            <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center mr-4">
              <WalletCards color="#4f46e5" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 font-bold text-lg">帳戶管理</Text>
              <Text className="text-slate-400 text-xs mt-0.5">現金、銀行、電子錢包與信用卡</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('../recurring')}
            className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100"
          >
            <View className="w-10 h-10 bg-amber-50 rounded-full items-center justify-center mr-4">
              <CalendarClock color="#d97706" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 font-bold text-lg">固定帳單與訂閱</Text>
              <Text className="text-slate-400 text-xs mt-0.5">管理房租、薪水、訂閱與到期提醒</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('../categories')}
            className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100"
          >
            <View className="w-10 h-10 bg-violet-50 rounded-full items-center justify-center mr-4">
              <LayoutGrid color="#7c3aed" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 font-bold text-lg">類別管理</Text>
              <Text className="text-slate-400 text-xs mt-0.5">新增、編輯或刪除收入與支出類別</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <View className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100">
            <View className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center mr-4">
              <Shield color="#059669" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 font-bold text-lg">隱私保護</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                {developerText('.env 已從 Git 追蹤移除並加入 ignore', '你的資料會透過安全連線同步。')}
              </Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </View>

          {showDeveloperTools && (
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <Database color="#4f46e5" size={20} />
                <Text className="text-slate-800 font-black mt-3">Schema</Text>
                <Text className="text-slate-400 text-xs mt-1">Baseline migration only</Text>
              </View>
              <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <Sparkles color="#7c3aed" size={20} />
                <Text className="text-slate-800 font-black mt-3">AI</Text>
                <Text className="text-slate-400 text-xs mt-1">
                  {isAiConfigured ? 'Ready for assistant testing' : 'Missing Gemini key'}
                </Text>
              </View>
            </View>
          )}

          <CustomButton
            title={user ? '登出帳號' : '尚未登入'}
            variant="secondary"
            onPress={signOut}
            disabled={isSignOutLoading || !user}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={upgradeModalVisible} transparent animationType="slide" onRequestClose={() => setUpgradeModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <View className="px-5 pb-5">
            <View className="items-end mb-3">
              <TouchableOpacity
                onPress={() => setUpgradeModalVisible(false)}
                className="w-10 h-10 rounded-full bg-white items-center justify-center"
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            <AuthPanel
              initialMode="upgradeGuest"
              showGuestAction={false}
              onSuccess={() => setUpgradeModalVisible(false)}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert config={alertConfig} hideAlert={hideAlert} />
    </SafeAreaView>
  );
}
