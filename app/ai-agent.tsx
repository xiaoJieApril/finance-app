import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Bot, Calendar, Send, Sparkles, Trash2 } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBudget } from '../hooks/useBudget';
import { useTransactions } from '../hooks/useTransactions';
import { ChatMessage, sendChatMessage } from '../services/aiAgent';
import {
  buildFinanceContext,
  getRecapPrompt,
  RECAP_PROMPTS,
  ReviewPeriod,
} from './utils/financeContext';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AIAgentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const { fetchTransactions, fetchCategories } = useTransactions();
  const { totalBudget } = useBudget();
  const { data: transactions = [] } = fetchTransactions;
  const { data: categories = [] } = fetchCategories;

  const [period, setPeriod] = useState<ReviewPeriod>('month');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const financeContext = buildFinanceContext(transactions, categories, totalBudget, period);

  const handleSend = useCallback(
    async (text?: string) => {
      const userText = (text ?? input).trim();
      if (!userText || isLoading) return;

      setInput('');
      setError(null);

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: userText };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const reply = await sendChatMessage({
          userMessage: userText,
          financeContext,
          history: messages,
          period,
        });

        const assistantMsg: ChatMessage = { id: generateId(), role: 'assistant', content: reply };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        setError(err.message ?? '發送失敗，請稍後再試');
      } finally {
        setIsLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [input, isLoading, financeContext, messages, period],
  );

  const handleQuickRecap = () => handleSend(getRecapPrompt(period));

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View className={`mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
        <View className="flex-row items-end gap-2 max-w-[85%]">
          {!isUser && (
            <View className="w-8 h-8 bg-indigo-100 rounded-full items-center justify-center mb-1">
              <Bot size={16} color="#4f46e5" />
            </View>
          )}
          <View
            className={`px-4 py-3 rounded-2xl ${
              isUser
                ? 'bg-indigo-600 rounded-br-sm'
                : 'bg-white border border-slate-100 rounded-bl-sm shadow-sm'
            }`}
          >
            <Text className={`text-[15px] leading-6 ${isUser ? 'text-white' : 'text-slate-700'}`}>
              {item.content}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const showSuggestions = messages.length === 0 && !isLoading;
  const prompts = RECAP_PROMPTS[period];

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center"
        >
          <ArrowLeft size={20} color="#475569" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-lg font-bold text-slate-800">金庫小助手</Text>
          <Text className="text-xs text-slate-400">AI 財務復盤</Text>
        </View>
        <TouchableOpacity
          onPress={handleClear}
          disabled={messages.length === 0}
          className={`w-10 h-10 rounded-full items-center justify-center ${messages.length > 0 ? 'bg-slate-50' : ''}`}
        >
          {messages.length > 0 && <Trash2 size={18} color="#94a3b8" />}
        </TouchableOpacity>
      </View>

      {/* Period toggle */}
      <View className="flex-row mx-4 mt-3 bg-white rounded-xl p-1 border border-slate-100">
        {(['week', 'month'] as ReviewPeriod[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            className={`flex-1 py-2.5 rounded-lg items-center ${period === p ? 'bg-indigo-600' : ''}`}
          >
            <Text className={`font-bold text-sm ${period === p ? 'text-white' : 'text-slate-500'}`}>
              {p === 'week' ? '本週復盤' : '本月復盤'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {showSuggestions && (
          <>
            <View className="mx-4 mt-4 bg-indigo-600 rounded-2xl p-5">
              <View className="flex-row items-center gap-2 mb-2">
                <Sparkles size={18} color="#c7d2fe" />
                <Text className="text-indigo-100 font-bold text-sm">
                  {period === 'week' ? '本週財務復盤' : '本月財務復盤'}
                </Text>
              </View>
              <Text className="text-indigo-200 text-sm leading-5 mb-4">
                我已讀取你{period === 'week' ? '近 7 天' : '本月'}的收支數據，點擊下方按鈕即可生成完整復盤報告。
              </Text>
              <TouchableOpacity
                onPress={handleQuickRecap}
                className="bg-white py-3 rounded-xl flex-row items-center justify-center gap-2"
              >
                <Calendar size={18} color="#4f46e5" />
                <Text className="text-indigo-600 font-bold">
                  {period === 'week' ? '生成本週復盤報告' : '生成本月復盤報告'}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="px-4 mt-4 flex-row flex-wrap gap-2">
              {prompts.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  onPress={() => handleSend(prompt)}
                  className="bg-white border border-indigo-100 px-4 py-2.5 rounded-full"
                >
                  <Text className="text-indigo-600 text-sm font-medium">{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            isLoading ? (
              <View className="flex-row items-center gap-2 mb-4 ml-2">
                <View className="w-8 h-8 bg-indigo-100 rounded-full items-center justify-center">
                  <Bot size={16} color="#4f46e5" />
                </View>
                <View className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <ActivityIndicator size="small" color="#4f46e5" />
                </View>
              </View>
            ) : null
          }
        />

        {error && (
          <View className="mx-4 mb-2 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}

        <View
          className="flex-row items-end gap-2 px-4 pt-2 bg-white border-t border-slate-100"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <TextInput
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-[15px] max-h-28"
            placeholder="追問復盤細節..."
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            multiline
            editable={!isLoading}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={`w-12 h-12 rounded-full items-center justify-center mb-0.5 ${
              input.trim() && !isLoading ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <Send size={20} color={input.trim() && !isLoading ? 'white' : '#94a3b8'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
