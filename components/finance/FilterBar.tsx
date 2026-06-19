import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

type Option<T extends string> = {
  label: string;
  value: T;
};

type FilterBarProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterBar<T extends string>({ options, value, onChange }: FilterBarProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`px-4 py-2 rounded-full mr-2 border ${
              selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'
            }`}
          >
            <Text className={`font-bold text-sm ${selected ? 'text-white' : 'text-slate-500'}`}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
