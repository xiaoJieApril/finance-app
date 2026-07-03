import { AlertTriangle, CheckCircle2, PiggyBank, SlidersHorizontal, Target } from 'lucide-react-native';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { BudgetPlanningReport } from '@/features/assistant/services/aiAgent';
import { useFinanceOverview } from '@/features/finance/hooks/useFinanceOverview';

type Props = {
  report: BudgetPlanningReport;
};

type ApplyableBudgetChange = {
  category: string;
  recommendedBudget: number;
  rulePeriod?: 'day' | 'week' | 'month';
  ruleLimitAmount?: number;
};

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-2 mt-3">
      {icon}
      <Text className="text-slate-800 font-bold text-sm">{title}</Text>
    </View>
  );
}

function BulletList({ items, color = 'text-slate-600' }: { items: string[]; color?: string }) {
  if (!items.length) return null;

  return (
    <View className="gap-1.5">
      {items.map((item, index) => (
        <Text key={`${item}-${index}`} className={`text-[14px] leading-5 ${color}`}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export function BudgetPlanningReportView({ report }: Props) {
  const { financeData, saveBudget, saveSavingPlan, saveSpendingRule } = useFinanceOverview();
  const data = financeData.data;

  const handleApplyPlan = () => {
    if (!data) return;

    Alert.alert('套用 AI 預算方案', '我會把建議寫入存錢計劃、類別預算和支出規則。你可以之後再手動修改。', [
      { text: '取消', style: 'cancel' },
      {
        text: '套用',
        onPress: async () => {
          try {
            const savingRecommendation = report.savingPlanRecommendation;
            if (savingRecommendation) {
              await saveSavingPlan.mutateAsync({
                id: data.savingPlan?.id,
                mode: savingRecommendation.mode,
                target_rate: (savingRecommendation.targetRatePercent ?? 20) / 100,
                target_amount: savingRecommendation.targetAmount,
                buffer_amount: savingRecommendation.bufferAmount,
                is_active: true,
              });
            }

            const changes: ApplyableBudgetChange[] = report.applyableBudgetChanges?.length
              ? report.applyableBudgetChanges
              : report.categoryBudgets.map((item) => ({
                  category: item.category,
                  recommendedBudget: item.recommendedBudget,
                }));

            for (const change of changes) {
              const category = data.categories.find((item) => item.name === change.category && item.type === 'expense');
              if (!category) continue;

              await saveBudget.mutateAsync({
                category_id: category.id,
                monthly_limit: change.recommendedBudget,
              });

              if (change.rulePeriod && change.ruleLimitAmount) {
                await saveSpendingRule.mutateAsync({
                  name: `${category.name}${change.rulePeriod === 'day' ? '每日' : change.rulePeriod === 'week' ? '每週' : '每月'}上限`,
                  category_id: category.id,
                  period: change.rulePeriod,
                  limit_amount: change.ruleLimitAmount,
                  is_active: true,
                });
              }
            }

            Alert.alert('已套用', 'AI 預算方案已寫入你的存錢計劃和預算。');
          } catch (error) {
            Alert.alert('套用失敗', error instanceof Error ? error.message : '請稍後再試。');
          }
        },
      },
    ]);
  };

  if (report.status === 'insufficient_data') {
    return (
      <View className="gap-1">
        <Text className="text-amber-700 font-bold text-sm">資料不足</Text>
        <Text className="text-slate-600 text-[14px] leading-5">
          {report.message ?? '目前資料不足，建議持續記帳後再建立預算規劃。'}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-1">
      <SectionTitle icon={<PiggyBank size={14} color="#4f46e5" />} title="月度預算方案" />
      <View className="bg-indigo-50 rounded-xl p-3 gap-1">
        <Text className="text-indigo-900 font-black text-base">{report.planningPeriod}</Text>
        <Text className="text-slate-700 text-[14px] leading-5">{report.recommendation.summary}</Text>
        <Text className="text-indigo-700 text-[14px] font-bold">
          建議總預算 RM {report.recommendation.recommendedTotalBudget.toFixed(2)}
        </Text>
        {report.recommendation.expectedSavingsAmount != null && (
          <Text className="text-indigo-700 text-[14px]">
            預期可保留 RM {report.recommendation.expectedSavingsAmount.toFixed(2)}
            {report.recommendation.expectedSavingsRatePercent != null
              ? `（儲蓄率 ${report.recommendation.expectedSavingsRatePercent.toFixed(0)}%）`
              : ''}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={handleApplyPlan}
        disabled={!data || saveBudget.isPending || saveSavingPlan.isPending || saveSpendingRule.isPending}
        className="bg-indigo-600 rounded-xl p-3 items-center mt-2"
      >
        <Text className="text-white font-black">
          {saveBudget.isPending || saveSavingPlan.isPending || saveSpendingRule.isPending ? '套用中...' : '套用此方案'}
        </Text>
      </TouchableOpacity>

      {report.scenarioPlans && report.scenarioPlans.length > 0 && (
        <>
          <SectionTitle icon={<SlidersHorizontal size={14} color="#4f46e5" />} title="三種預算情境" />
          <View className="gap-2">
            {report.scenarioPlans.map((scenario) => (
              <View key={scenario.name} className="bg-white border border-indigo-100 rounded-xl p-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-800 font-black text-[14px]">{scenario.name}</Text>
                  <Text className="text-indigo-600 font-black text-[14px]">
                    RM {scenario.recommendedTotalBudget.toFixed(2)}
                  </Text>
                </View>
                {scenario.expectedSavingsAmount != null && (
                  <Text className="text-emerald-700 text-[13px] mb-1">
                    預期保留 RM {scenario.expectedSavingsAmount.toFixed(2)}
                    {scenario.expectedSavingsRatePercent != null
                      ? `（${scenario.expectedSavingsRatePercent.toFixed(0)}%）`
                      : ''}
                  </Text>
                )}
                <Text className="text-slate-500 text-[13px] leading-5">{scenario.explanation}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <SectionTitle icon={<Target size={14} color="#4f46e5" />} title="基準數據" />
      <View className="bg-slate-50 rounded-xl p-3 gap-1">
        <Text className="text-slate-700 text-[14px]">
          收入 RM {report.baseline.income.toFixed(2)} · 支出 RM {report.baseline.currentExpense.toFixed(2)}
        </Text>
        <Text className="text-slate-700 text-[14px]">
          淨現金流 RM {report.baseline.netCashFlow.toFixed(2)}
        </Text>
        {report.baseline.currentBudget != null && (
          <Text className="text-slate-700 text-[14px]">
            目前總預算 RM {report.baseline.currentBudget.toFixed(2)}
          </Text>
        )}
      </View>

      {report.categoryBudgets.length > 0 && (
        <>
          <SectionTitle icon={<SlidersHorizontal size={14} color="#4f46e5" />} title="目前 vs AI 建議" />
          <View className="gap-2">
            {report.categoryBudgets.map((item) => (
              <View key={item.category} className="bg-white border border-slate-100 rounded-xl p-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-800 font-bold text-[14px]">{item.category}</Text>
                  <Text className="text-indigo-600 font-black text-[14px]">
                    RM {item.recommendedBudget.toFixed(2)}
                  </Text>
                </View>
                <View className="bg-slate-50 rounded-lg p-2 mb-2">
                  <Text className="text-slate-500 text-[12px]">
                    目前預算 {item.currentBudget != null ? `RM ${item.currentBudget.toFixed(2)}` : '未設定'} ·
                    本月已花 {item.currentSpending != null ? `RM ${item.currentSpending.toFixed(2)}` : '資料不足'}
                  </Text>
                </View>
                <Text className="text-slate-500 text-[13px] leading-5">{item.reason}</Text>
                {item.changeAmount != null && (
                  <Text className={item.changeAmount < 0 ? 'text-rose-600 text-[13px] mt-1' : 'text-emerald-600 text-[13px] mt-1'}>
                    {item.changeAmount < 0 ? '減少' : '增加'} RM {Math.abs(item.changeAmount).toFixed(2)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      <SectionTitle icon={<CheckCircle2 size={14} color="#16a34a" />} title="調整方向" />
      <BulletList items={report.adjustments.increase} color="text-emerald-700" />
      <BulletList items={report.adjustments.reduce} color="text-rose-700" />

      {report.riskNotes.length > 0 && (
        <>
          <SectionTitle icon={<AlertTriangle size={14} color="#d97706" />} title="風險提醒" />
          <BulletList items={report.riskNotes} color="text-amber-800" />
        </>
      )}

      {report.actionChecklist.length > 0 && (
        <>
          <SectionTitle icon={<CheckCircle2 size={14} color="#4f46e5" />} title="手動執行清單" />
          <BulletList items={report.actionChecklist} color="text-indigo-700" />
        </>
      )}

      <View className="bg-slate-50 border border-slate-100 rounded-xl p-3 mt-2">
        <Text className="text-slate-500 text-[12px] leading-5">
          這是 AI 規劃建議。只有在你點擊「套用此方案」並確認後，才會寫入預算與存錢計劃。
        </Text>
      </View>

      {report.assumptions && report.assumptions.length > 0 && (
        <>
          <SectionTitle icon={<AlertTriangle size={14} color="#64748b" />} title="假設" />
          <BulletList items={report.assumptions} color="text-slate-500" />
        </>
      )}
    </View>
  );
}
