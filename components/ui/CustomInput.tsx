import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface CustomInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export const CustomInput = ({ label, error, ...props }: CustomInputProps) => {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-slate-500 mb-2">{label}</Text>
      <TextInput
        className={`bg-slate-50 border ${
          error ? 'border-red-500' : 'border-slate-200'
        } p-4 rounded-xl text-slate-800 focus:border-indigo-500 focus:bg-white`}
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        {...props}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
};