import React from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthPanel } from '@/features/auth/components/AuthPanel';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 px-6 justify-center"
        style={{ paddingBottom: insets.bottom }}
      >
        <AuthPanel onSuccess={() => router.replace('/(tabs)')} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
