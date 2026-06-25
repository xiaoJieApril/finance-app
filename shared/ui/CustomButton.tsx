import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface CustomButtonProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
}

export const CustomButton = ({ title, isLoading, variant = 'primary', className, ...props }: CustomButtonProps) => {
  const isPrimary = variant === 'primary';
  
  return (
    <TouchableOpacity
      className={`py-4 rounded-2xl items-center justify-center flex-row ${
        isPrimary ? 'bg-indigo-600' : 'bg-slate-100'
      } ${props.disabled ? 'opacity-50' : 'opacity-100'} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? 'white' : '#4f46e5'} />
      ) : (
        <Text className={`font-bold text-lg ${isPrimary ? 'text-white' : 'text-indigo-600'}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};