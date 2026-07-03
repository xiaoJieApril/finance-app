import { LogIn, UserPlus, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CustomButton } from '@/shared/ui/CustomButton';
import { CustomInput } from '@/shared/ui/CustomInput';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { developerText } from '@/shared/config/appVariant';

type AuthPanelMode = 'login' | 'register' | 'upgradeGuest';

type AuthPanelProps = {
  initialMode?: AuthPanelMode;
  showGuestAction?: boolean;
  onSuccess?: () => void;
};

export function AuthPanel({ initialMode = 'login', showGuestAction = true, onSuccess }: AuthPanelProps) {
  const { signInWithEmail, signUpWithEmail, signInAsGuest, upgradeAnonymousUser, isLoading } = useAuth();
  const [mode, setMode] = useState<AuthPanelMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isLoginMode = mode === 'login';
  const isUpgradeMode = mode === 'upgradeGuest';

  const handleSubmit = async () => {
    const result = isUpgradeMode
      ? await upgradeAnonymousUser(email, password)
      : isLoginMode
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);

    if (!result?.error) onSuccess?.();
  };

  const handleGuestLogin = async () => {
    const result = await signInAsGuest();
    if (!result?.error) onSuccess?.();
  };

  return (
    <View className="bg-white rounded-3xl p-6 border border-slate-100">
      <View className="items-center mb-6">
        <View className="bg-indigo-100 p-4 rounded-full mb-4">
          <Wallet size={42} color="#4f46e5" />
        </View>
        <Text className="text-2xl font-extrabold text-slate-900">
          {isUpgradeMode ? '註冊正式帳號' : isLoginMode ? '歡迎回來' : '建立新帳號'}
        </Text>
        <Text className="text-slate-500 mt-2 text-center leading-5">
          {isUpgradeMode
            ? '把目前訪客資料保留到你的 Email 帳號。'
            : isLoginMode
              ? '登入後同步你的財務資料。'
              : '建立帳號後開始追蹤現金流。'}
        </Text>
      </View>

      <CustomInput
        label="電子郵件"
        placeholder="your@email.com"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <CustomInput
        label="密碼"
        placeholder="請輸入至少 6 位數密碼"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <CustomButton
        title={isUpgradeMode ? '保留資料並註冊' : isLoginMode ? '登入' : '註冊'}
        onPress={handleSubmit}
        isLoading={isLoading}
      />

      {!isUpgradeMode && (
        <CustomButton
          title={isLoginMode ? '還沒有帳號？點此註冊' : '已有帳號？點此登入'}
          variant="secondary"
          className="mt-3"
          onPress={() => setMode(isLoginMode ? 'register' : 'login')}
          disabled={isLoading}
        />
      )}

      {showGuestAction && !isUpgradeMode && (
        <TouchableOpacity
          onPress={handleGuestLogin}
          className="mt-4 py-3 items-center border border-slate-300 rounded-2xl active:bg-slate-50"
          disabled={isLoading}
        >
          <Text className="font-bold text-slate-600">以訪客身份進入測試</Text>
        </TouchableOpacity>
      )}

      <View className="mt-6 bg-slate-50 border border-slate-100 rounded-2xl p-4">
        <View className="flex-row items-center mb-2">
          {isLoginMode ? <LogIn size={16} color="#4f46e5" /> : <UserPlus size={16} color="#4f46e5" />}
          <Text className="text-slate-700 font-black ml-2">
            {isUpgradeMode ? '保留訪客資料' : isLoginMode ? '已有帳號' : '第一次使用'}
          </Text>
        </View>
        <Text className="text-slate-500 text-xs leading-5">
          {isUpgradeMode
            ? '這會為目前訪客帳號加入 Email 和密碼，不會建立新的空帳號。'
            : isLoginMode
              ? '使用註冊時的 Email 和密碼登入。若只是測試，可使用訪客身份進入。'
              : developerText('註冊後會使用 Supabase Auth 建立帳號，之後可在不同裝置同步資料。', '註冊後會建立同步帳號，之後可在不同裝置使用資料。')}
        </Text>
      </View>
    </View>
  );
}
