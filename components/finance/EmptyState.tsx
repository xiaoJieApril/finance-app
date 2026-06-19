import React from 'react';
import { Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  message?: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View className="bg-white border border-dashed border-slate-200 rounded-2xl px-5 py-8 items-center">
      <Text className="text-slate-600 font-bold">{title}</Text>
      {message && <Text className="text-slate-400 text-sm mt-2 text-center">{message}</Text>}
    </View>
  );
}
