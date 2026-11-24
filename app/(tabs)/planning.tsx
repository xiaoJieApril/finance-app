import { ChevronLeft, ChevronRight, Plus, TrendingUp, Wallet, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncIndicator } from '../../components/ledger';
import { useTransactions } from '../../hooks/useTransactions';
import { FinancialGoal, PlannedExpense, PlannedExpenseLink } from '../../services/planningStore';
import { Category, Transaction } from '../../type';

const money = (value: number) => `RM ${value.toFixed(2)}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
const NO_PLANS: PlannedExpense[] = [];
const NO_LINKS: PlannedExpenseLink[] = [];
const NO_TRANSACTIONS: Transaction[] = [];

export default function PlanningScreen() {
  const { userId, fetchPlanning, fetchTransactions, fetchCategories, savePlan, removePlan, linkPlanTransaction, unlinkPlanTransaction, updateGoal } = useTransactions();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [planModal, setPlanModal] = useState(false);
  const [editing, setEditing] = useState<PlannedExpense | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [linkPlanId, setLinkPlanId] = useState<string | null>(null);
  const [goalKind, setGoalKind] = useState<FinancialGoal['kind'] | null>(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const plans = fetchPlanning.data?.plans ?? NO_PLANS;
  const links = fetchPlanning.data?.links ?? NO_LINKS;
  const goals = fetchPlanning.data?.goals ?? [];
  const transactions = fetchTransactions.data ?? NO_TRANSACTIONS;
  const categories = (fetchCategories.data ?? []).filter((item) => item.type === 'expense' && !item.archived_at);
  const currentMonthKey = monthKey(month);
  const monthlyPlans = useMemo(() => plans.filter((item) => item.month.slice(0, 7) === currentMonthKey.slice(0, 7)).sort((a, b) => a.title.localeCompare(b.title)), [plans, currentMonthKey]);
  const linkedByPlan = useMemo(() => {
    const byId = new Map<string, Transaction[]>();
    for (const link of links) {
      const transaction = transactions.find((item) => item.id === link.transaction_id && !item.deleted_at && item.category?.type === 'expense');
      if (transaction) byId.set(link.planned_expense_id, [...(byId.get(link.planned_expense_id) ?? []), transaction]);
    }
    return byId;
  }, [links, transactions]);
  const spentTotal = monthlyPlans.reduce((sum, item) => sum + (linkedByPlan.get(item.id) ?? []).reduce((subtotal, transaction) => subtotal + transaction.amount, 0), 0);
  const plannedTotal = monthlyPlans.reduce((sum, item) => sum + item.amount, 0);

  const openCreate = () => { setEditing(null); setTitle(''); setAmount(''); setCategoryId(categories[0]?.id ?? ''); setPlanModal(true); };
  const openEdit = (plan: PlannedExpense) => { setEditing(plan); setTitle(plan.title); setAmount(String(plan.amount)); setCategoryId(plan.category_id); setPlanModal(true); };
  const save = async () => {
    const parsed = Number(amount.replace(',', '.'));
    if (!title.trim() || !Number.isFinite(parsed) || parsed <= 0 || !categoryId) { Alert.alert('检查计划内容', '请填写用途、有效金额，并选择支出类别。'); return; }
    try { await savePlan.mutateAsync({ id: editing?.id, month: currentMonthKey, title: title.trim(), amount: parsed, category_id: categoryId }); setPlanModal(false); }
    catch (error) { Alert.alert('无法保存计划', error instanceof Error ? error.message : '请稍后重试。'); }
  };
  const confirmDelete = (plan: PlannedExpense) => Alert.alert('删除计划项？', '已关联的交易不会删除，只会解除关联。', [
    { text: '取消', style: 'cancel' },
    { text: '删除', style: 'destructive', onPress: async () => { try { await removePlan.mutateAsync(plan.id); } catch { Alert.alert('无法删除计划', '请稍后重试。'); } } },
  ]);
  const openGoal = (kind: FinancialGoal['kind']) => { const goal = goals.find((item) => item.kind === kind); setGoalKind(kind); setBalanceInput(goal ? String(goal.balance) : '0'); setTargetInput(goal?.target == null ? '' : String(goal.target)); };
  const saveGoal = async () => {
    if (!goalKind) return;
    const balance = Number(balanceInput.replace(',', '.'));
    const target = targetInput.trim() ? Number(targetInput.replace(',', '.')) : null;
    if (!Number.isFinite(balance) || balance < 0 || (target !== null && (!Number.isFinite(target) || target <= 0))) { Alert.alert('检查金额', '当前金额需为零或正数，目标金额需大于零。'); return; }
    try { await updateGoal.mutateAsync({ kind: goalKind, balance, target }); setGoalKind(null); }
    catch (error) { Alert.alert('无法保存金额', error instanceof Error ? error.message : '请稍后重试。'); }
  };
  const changeLink = async (transactionId: string, existingLinkId?: string) => {
    try {
      if (existingLinkId) await unlinkPlanTransaction.mutateAsync(existingLinkId);
      else if (linkPlanId) await linkPlanTransaction.mutateAsync({ planId: linkPlanId, transactionId });
    } catch (error) { Alert.alert('无法更新关联', error instanceof Error ? error.message : '请稍后重试。'); }
  };
  const goalCard = (kind: FinancialGoal['kind']) => {
    const goal = goals.find((item) => item.kind === kind) ?? { user_id: userId ?? '', kind, balance: 0, target: null, updated_at: '' };
    const titleText = kind === 'investment' ? '投资' : '紧急储蓄';
    const progress = goal.target ? Math.min(goal.balance / goal.target, 1) : 0;
    return <TouchableOpacity key={kind} onPress={() => openGoal(kind)} className="mb-3 rounded-[22px] border border-[#DCE7E0] bg-white p-4">
      <View className="flex-row items-center"><View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF1EC]">{kind === 'investment' ? <TrendingUp size={19} color="#477A60" /> : <Wallet size={19} color="#477A60" />}</View><View className="flex-1"><Text className="text-sm font-bold text-[#183C32]">{titleText}</Text><Text className="mt-1 text-[11px] text-[#5D6D63]">当前金额 · 点此更新</Text></View><Text className="text-base font-bold text-[#183C32]">{money(goal.balance)}</Text></View>
      {goal.target !== null && <View className="mt-4"><View className="mb-2 flex-row justify-between"><Text className="text-xs text-[#5D6D63]">目标 {money(goal.target)}</Text><Text className="text-xs font-semibold text-[#477A60]">{Math.floor(progress * 100)}%</Text></View><View className="h-2 overflow-hidden rounded-full bg-[#EAF1EC]"><View style={{ width: `${progress * 100}%` }} className="h-full rounded-full bg-[#8CAE73]" /></View></View>}
    </TouchableOpacity>;
  };

  if (!userId || fetchPlanning.isLoading || fetchTransactions.isLoading || fetchCategories.isLoading) return <View className="flex-1 items-center justify-center bg-[#F4F7F4]"><ActivityIndicator color="#477A60" /></View>;
  return <SafeAreaView className="flex-1 bg-[#F4F7F4]" edges={['top']}>
    <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      <View className="pt-4"><Text className="text-3xl font-bold tracking-tight text-[#183C32]">计划</Text><View className="mt-2"><SyncIndicator /></View></View>
      <View className="mt-5 rounded-[24px] bg-[#183C32] p-5">
        <View className="flex-row items-center justify-between"><TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} className="h-9 w-9 items-center justify-center rounded-full bg-white/10"><ChevronLeft size={19} color="white" /></TouchableOpacity><View className="items-center"><Text className="text-base font-bold text-white">{month.getFullYear()}年{month.getMonth() + 1}月计划</Text>{currentMonthKey.slice(0, 7) !== monthKey(new Date()).slice(0, 7) && <TouchableOpacity onPress={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12))}><Text className="mt-1 text-[11px] font-semibold text-[#D7E979]">回到本月</Text></TouchableOpacity>}</View><TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} className="h-9 w-9 items-center justify-center rounded-full bg-white/10"><ChevronRight size={19} color="white" /></TouchableOpacity></View>
        <View className="mt-5 flex-row"><View className="flex-1"><Text className="text-[11px] text-white/65">计划金额</Text><Text className="mt-1 text-lg font-bold text-white">{money(plannedTotal)}</Text></View><View className="flex-1"><Text className="text-[11px] text-white/65">已关联支出</Text><Text className="mt-1 text-lg font-bold text-[#D7E979]">{money(spentTotal)}</Text></View><View className="flex-1"><Text className="text-[11px] text-white/65">计划剩余</Text><Text className="mt-1 text-lg font-bold text-white">{money(plannedTotal - spentTotal)}</Text></View></View>
      </View>
      <View className="mb-3 mt-7 flex-row items-center justify-between"><View><Text className="text-lg font-bold text-[#183C32]">预期支出</Text><Text className="mt-1 text-xs text-[#5D6D63]">记录这个月可能会花的钱</Text></View><TouchableOpacity onPress={openCreate} className="flex-row items-center rounded-full bg-[#D7E979] px-3.5 py-2.5"><Plus size={16} color="#183C32"/><Text className="ml-1 text-xs font-bold text-[#183C32]">新增计划</Text></TouchableOpacity></View>
      {monthlyPlans.length ? monthlyPlans.map((plan) => {
        const category = categories.find((item) => item.id === plan.category_id) ?? (fetchCategories.data ?? []).find((item) => item.id === plan.category_id);
        const linked = linkedByPlan.get(plan.id) ?? []; const spent = linked.reduce((sum, item) => sum + item.amount, 0); const remaining = plan.amount - spent;
        return <View key={plan.id} className="mb-3 rounded-[22px] border border-[#DCE7E0] bg-white p-4">
          <View className="flex-row items-start"><View className="flex-1"><Text className="text-base font-bold text-[#183C32]">{plan.title}</Text><Text className="mt-1 text-xs text-[#5D6D63]">{category?.name ?? '已归档类别'} · 预估 {money(plan.amount)}</Text></View><Text className="text-base font-bold text-[#183C32]">{money(remaining)}</Text></View>
          <View className="mt-3 flex-row items-center justify-between border-t border-[#EDF1EE] pt-3"><Text className="text-xs text-[#5D6D63]">已花 {money(spent)} · 剩余</Text><View className="flex-row items-center"><TouchableOpacity onPress={() => { setLinkPlanId(plan.id); }} className="mr-2 rounded-full bg-[#EAF1EC] px-3 py-2"><Text className="text-[11px] font-semibold text-[#477A60]">关联交易{linked.length ? ` (${linked.length})` : ''}</Text></TouchableOpacity><TouchableOpacity onPress={() => openEdit(plan)} className="px-2 py-2"><Text className="text-[11px] font-semibold text-[#477A60]">编辑</Text></TouchableOpacity><TouchableOpacity onPress={() => confirmDelete(plan)} className="px-2 py-2"><Text className="text-[11px] font-semibold text-[#B65C51]">删除</Text></TouchableOpacity></View></View>
        </View>;
      }) : <View className="mb-3 rounded-[20px] border border-dashed border-[#C8D6CD] px-4 py-6"><Text className="text-center text-sm font-semibold text-[#183C32]">这个月还没有预期支出</Text><Text className="mt-1 text-center text-xs text-[#5D6D63]">添加一项计划，之后可关联实际支出。</Text></View>}
      <View className="mb-3 mt-5"><Text className="text-lg font-bold text-[#183C32]">资金目标</Text><Text className="mt-1 text-xs text-[#5D6D63]">手动更新金额，不会计入收支</Text></View>
      {goalCard('investment')}{goalCard('emergency_fund')}
    </ScrollView>

    <Modal visible={planModal} transparent animationType="slide" onRequestClose={() => setPlanModal(false)}><View className="flex-1 justify-end bg-black/35"><View className="max-h-[85%] rounded-t-[28px] bg-[#F4F7F4] px-5 pb-10 pt-5"><View className="mb-5 flex-row items-center justify-between"><Text className="text-xl font-bold text-[#183C32]">{editing ? '编辑预期支出' : '新增预期支出'}</Text><TouchableOpacity onPress={() => setPlanModal(false)} className="h-9 w-9 items-center justify-center rounded-full bg-[#E7EEE9]"><X size={19} color="#183C32" /></TouchableOpacity></View><Text className="mb-1 text-xs font-semibold text-[#5D6D63]">用途</Text><TextInput value={title} onChangeText={setTitle} placeholder="例如：周末短途旅行" placeholderTextColor="#87958D" maxLength={60} className="mb-4 border-b border-[#B8C9BE] py-3 text-base text-[#183C32]"/><Text className="mb-1 text-xs font-semibold text-[#5D6D63]">预估金额（RM）</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#87958D" className="mb-5 border-b border-[#B8C9BE] py-3 text-base text-[#183C32]"/><Text className="mb-2 text-xs font-semibold text-[#5D6D63]">支出类别</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6"><View className="flex-row gap-2">{categories.map((category: Category) => <TouchableOpacity key={category.id} onPress={() => setCategoryId(category.id)} className={`rounded-full border px-3.5 py-2.5 ${categoryId === category.id ? 'border-[#183C32] bg-[#183C32]' : 'border-[#DCE7E0] bg-white'}`}><Text className={`text-xs font-semibold ${categoryId === category.id ? 'text-white' : 'text-[#5D6D63]'}`}>{category.name}</Text></TouchableOpacity>)}</View></ScrollView><TouchableOpacity onPress={save} disabled={savePlan.isPending || categories.length === 0} className="items-center rounded-full bg-[#183C32] py-4"><Text className="font-bold text-white">保存计划</Text></TouchableOpacity></View></View></Modal>

    <Modal visible={Boolean(linkPlanId)} transparent animationType="slide" onRequestClose={() => setLinkPlanId(null)}><View className="flex-1 justify-end bg-black/35"><View className="max-h-[78%] rounded-t-[28px] bg-[#F4F7F4] px-5 pb-10 pt-5"><View className="mb-4 flex-row items-center justify-between"><View><Text className="text-xl font-bold text-[#183C32]">关联实际支出</Text><Text className="mt-1 text-xs text-[#5D6D63]">选择一笔支出加入这个计划</Text></View><TouchableOpacity onPress={() => setLinkPlanId(null)} className="h-9 w-9 items-center justify-center rounded-full bg-[#E7EEE9]"><X size={19} color="#183C32" /></TouchableOpacity></View><ScrollView>{transactions.filter((transaction) => !transaction.deleted_at && transaction.category?.type === 'expense').sort((a,b) => b.date.localeCompare(a.date)).map((transaction) => { const relation = links.find((item) => item.transaction_id === transaction.id); const isLinkedHere = relation?.planned_expense_id === linkPlanId; const plan = plans.find((item) => item.id === relation?.planned_expense_id); return <TouchableOpacity key={transaction.id} onPress={() => void changeLink(transaction.id, isLinkedHere ? relation?.id : undefined)} className="flex-row items-center border-b border-[#DCE7E0] py-3.5"><View className="flex-1"><Text className="text-sm font-semibold text-[#183C32]">{transaction.note || transaction.category?.name || '支出'}</Text><Text className="mt-1 text-xs text-[#5D6D63]">{transaction.date.slice(0,10)}{relation && !isLinkedHere ? ` · 已关联${plan ? `「${plan.title}」` : '其他计划'}，点此转移` : ''}</Text></View><Text className={`font-bold ${isLinkedHere ? 'text-[#477A60]' : 'text-[#183C32]'}`}>{isLinkedHere ? '已关联 · ' : ''}{money(transaction.amount)}</Text></TouchableOpacity>; })}{transactions.filter((transaction) => !transaction.deleted_at && transaction.category?.type === 'expense').length === 0 && <Text className="py-8 text-center text-sm text-[#5D6D63]">还没有可关联的支出交易。</Text>}</ScrollView></View></View></Modal>

    <Modal visible={Boolean(goalKind)} transparent animationType="slide" onRequestClose={() => setGoalKind(null)}><View className="flex-1 justify-end bg-black/35"><View className="rounded-t-[28px] bg-[#F4F7F4] px-5 pb-10 pt-5"><View className="mb-5 flex-row items-center justify-between"><Text className="text-xl font-bold text-[#183C32]">更新{goalKind === 'investment' ? '投资' : '紧急储蓄'}</Text><TouchableOpacity onPress={() => setGoalKind(null)} className="h-9 w-9 items-center justify-center rounded-full bg-[#E7EEE9]"><X size={19} color="#183C32" /></TouchableOpacity></View><Text className="mb-1 text-xs font-semibold text-[#5D6D63]">当前金额（RM）</Text><TextInput value={balanceInput} onChangeText={setBalanceInput} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#87958D" className="mb-5 border-b border-[#B8C9BE] py-3 text-base text-[#183C32]"/><Text className="mb-1 text-xs font-semibold text-[#5D6D63]">目标金额（RM，可留空）</Text><TextInput value={targetInput} onChangeText={setTargetInput} keyboardType="decimal-pad" placeholder="未设置目标" placeholderTextColor="#87958D" className="mb-6 border-b border-[#B8C9BE] py-3 text-base text-[#183C32]"/><TouchableOpacity onPress={saveGoal} disabled={updateGoal.isPending} className="items-center rounded-full bg-[#183C32] py-4"><Text className="font-bold text-white">保存金额</Text></TouchableOpacity></View></View></Modal>
  </SafeAreaView>;
}
