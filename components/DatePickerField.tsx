import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dateFromKey, monthDays, toDateKey } from '../services/dateUtils';

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

export function DatePickerField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(() => dateFromKey(value));
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const weeks = useMemo(() => monthDays(year, month), [year, month]);
  const selectedDate = dateFromKey(value);
  const todayKey = toDateKey(new Date());

  const moveMonth = (amount: number) => setDisplayedMonth(new Date(year, month + amount, 1, 12));

  return (
    <>
      <TouchableOpacity
        onPress={() => { setDisplayedMonth(dateFromKey(value)); setVisible(true); }}
        className="mb-7 flex-row items-center justify-between border-b border-[#DCE7E0] py-3"
        accessibilityRole="button"
        accessibilityLabel={`选择日期，当前为 ${value}`}
      >
        <Text className="text-base font-medium text-[#183C32]">{selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日</Text>
        <CalendarDays size={19} color="#477A60" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="rounded-t-[28px] bg-[#F4F7F4] px-5 pt-5">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-[#183C32]">选择日期</Text>
              <TouchableOpacity onPress={() => setVisible(false)} className="rounded-full bg-[#E7EEE9] px-4 py-2">
                <Text className="text-sm font-semibold text-[#477A60]">取消</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-4 flex-row items-center justify-between">
              <TouchableOpacity onPress={() => moveMonth(-1)} className="h-10 w-10 items-center justify-center rounded-full bg-[#E7EEE9]" accessibilityLabel="上个月">
                <ChevronLeft size={20} color="#183C32" />
              </TouchableOpacity>
              <Text className="text-base font-bold text-[#183C32]">{year}年{month + 1}月</Text>
              <TouchableOpacity onPress={() => moveMonth(1)} className="h-10 w-10 items-center justify-center rounded-full bg-[#E7EEE9]" accessibilityLabel="下个月">
                <ChevronRight size={20} color="#183C32" />
              </TouchableOpacity>
            </View>

            <View className="mb-2 flex-row">
              {weekdays.map((weekday) => <Text key={weekday} className="flex-1 py-2 text-center text-xs font-semibold text-[#5D6D63]">{weekday}</Text>)}
            </View>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} className="flex-row">
                {week.map((day, dayIndex) => {
                  if (!day) return <View key={`empty-${dayIndex}`} className="h-12 flex-1" />;
                  const key = toDateKey(new Date(year, month, day, 12));
                  const selected = key === value;
                  const today = key === todayKey;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => { onChange(key); setVisible(false); }}
                      className={`h-12 flex-1 items-center justify-center rounded-full ${selected ? 'bg-[#183C32]' : today ? 'bg-[#EAF1EC]' : ''}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${year}年${month + 1}月${day}日`}
                      accessibilityState={{ selected }}
                    >
                      <Text className={`text-sm font-semibold ${selected ? 'text-white' : today ? 'text-[#477A60]' : 'text-[#183C32]'}`}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity onPress={() => { onChange(todayKey); setDisplayedMonth(dateFromKey(todayKey)); setVisible(false); }} className="mt-4 items-center border-t border-[#DCE7E0] py-4">
              <Text className="font-semibold text-[#477A60]">回到今天</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
