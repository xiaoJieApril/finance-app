import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-base font-black text-slate-900">{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} className="px-2 py-1">
          <Text className="text-sm font-bold text-indigo-600">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
