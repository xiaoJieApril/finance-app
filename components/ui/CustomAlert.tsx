import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react-native';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface CustomAlertProps {
  config: AlertConfig;
  hideAlert: () => void;
}

export const CustomAlert = ({ config, hideAlert }: CustomAlertProps) => {
  if (!config.visible) return null;

  // 根據不同類型顯示對應的顏色與圖示
  const getIcon = () => {
    switch (config.type) {
      case 'success': return <View className="bg-emerald-100 p-3 rounded-full mb-4"><CheckCircle2 size={36} color="#10b981" /></View>;
      case 'error': return <View className="bg-rose-100 p-3 rounded-full mb-4"><AlertCircle size={36} color="#f43f5e" /></View>;
      case 'warning': return <View className="bg-amber-100 p-3 rounded-full mb-4"><AlertTriangle size={36} color="#f59e0b" /></View>;
      default: return <View className="bg-indigo-100 p-3 rounded-full mb-4"><Info size={36} color="#4f46e5" /></View>;
    }
  };

  const handleConfirm = () => {
    if (config.onConfirm) config.onConfirm();
    hideAlert();
  };

  const handleCancel = () => {
    if (config.onCancel) config.onCancel();
    hideAlert();
  };

  // 決定按鈕顏色
  const btnColor = config.type === 'error' ? 'bg-rose-500' : config.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-600';

  return (
    <Modal visible={config.visible} transparent animationType="fade">
      <View className="flex-1 bg-black/40 justify-center items-center px-8">
        {/* 彈跳視窗本體 */}
        <View className="bg-white w-full rounded-[32px] p-8 items-center shadow-2xl">
          {getIcon()}
          <Text className="text-2xl font-bold text-slate-900 mb-3">{config.title}</Text>
          <Text className="text-slate-500 text-center mb-8 leading-relaxed text-base">{config.message}</Text>

          {/* 按鈕區塊 */}
          <View className="flex-row w-full gap-3">
            {config.showCancel && (
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-1 bg-slate-100 py-4 rounded-2xl items-center active:bg-slate-200"
              >
                <Text className="text-slate-600 font-bold text-base">{config.cancelText || '取消'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleConfirm}
              className={`flex-1 py-4 rounded-2xl items-center active:opacity-80 ${btnColor}`}
            >
              <Text className="text-white font-bold text-base">{config.confirmText || '確定'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};