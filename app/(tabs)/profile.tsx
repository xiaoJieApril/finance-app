import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../../components/ui/CustomButton';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { signOut, isLoading } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-white p-6 justify-center">
      <View className="items-center mb-10">
        <View className="w-24 h-24 bg-indigo-100 rounded-full items-center justify-center mb-4">
          <Text className="text-3xl font-bold text-indigo-600">T</Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900">Tan Jun Jie</Text>
        <Text className="text-slate-500">軟體開發實習生</Text>
      </View>

      <CustomButton 
        title="登出帳號" 
        variant="secondary" 
        onPress={signOut} 
        isLoading={isLoading} 
      />
    </SafeAreaView>
  );
}