import { AlertCircle, CheckCircle2, Lightbulb, Target, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { FinanceReviewReport } from '@/features/assistant/services/aiAgent';

type Props = {
  report: FinanceReviewReport;
};

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-2 mt-3">
      {icon}
      <Text className="text-slate-800 font-bold text-sm">{title}</Text>
    </View>
  );
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  return (
    <View className="gap-1.5">
      {items.map((item, i) => (
        <Text key={i} className={`text-[14px] leading-5 ${color}`}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export function ReviewReportView({ report }: Props) {
  if (report.status === 'insufficient_data') {
    return (
      <View className="gap-1">
        <Text className="text-amber-700 font-bold text-sm">資料不足</Text>
        <Text className="text-slate-600 text-[14px] leading-5">
          {report.message ?? '目前資料不足，建議持續記帳以獲得更準確分析。'}
        </Text>
      </View>
    );
  }

  if (report.reply) {
    return <Text className="text-slate-700 text-[15px] leading-6">{report.reply}</Text>;
  }

  const { summary, insights, strengths, improvements, actionItems, financialScore } = report;

  return (
    <View className="gap-1">
      {summary && (
        <>
          <SectionTitle icon={<TrendingUp size={14} color="#4f46e5" />} title="總覽" />
          <View className="bg-slate-50 rounded-xl p-3 gap-1">
            <Text className="text-slate-500 text-xs">{summary.period}</Text>
            <Text className="text-slate-700 text-[14px]">
              收入 RM {summary.income.toFixed(2)} · 支出 RM {summary.expense.toFixed(2)}
            </Text>
            <Text className="text-slate-700 text-[14px]">
              淨現金流 RM {summary.netCashFlow.toFixed(2)}
            </Text>
            {summary.budget != null && summary.budget > 0 && (
              <Text className="text-slate-700 text-[14px]">
                預算使用率 {summary.budgetUsagePercent?.toFixed(0) ?? 0}%
              </Text>
            )}
            {summary.savingsRatePercent != null && (
              <Text className="text-slate-700 text-[14px]">
                儲蓄率 {summary.savingsRatePercent.toFixed(0)}%
              </Text>
            )}
          </View>
        </>
      )}

      {insights && (
        <>
          <SectionTitle icon={<Target size={14} color="#4f46e5" />} title="重點分析" />
          {insights.topCategories?.length > 0 && (
            <View className="gap-1 mb-1">
              {insights.topCategories.map((cat, i) => (
                <Text key={i} className="text-slate-600 text-[14px] leading-5">
                  {cat.category}: RM {cat.amount.toFixed(2)}（{cat.percentage.toFixed(1)}%）
                </Text>
              ))}
            </View>
          )}
          {insights.largestExpense && (
            <Text className="text-slate-600 text-[14px] leading-5 mb-1">
              最大支出：{insights.largestExpense.category} RM{' '}
              {insights.largestExpense.amount.toFixed(2)}
            </Text>
          )}
          {insights.anomalies?.length > 0 && (
            <BulletList items={insights.anomalies} color="text-amber-700" />
          )}
        </>
      )}

      {strengths && strengths.length > 0 && (
        <>
          <SectionTitle icon={<CheckCircle2 size={14} color="#16a34a" />} title="做得好的地方" />
          <BulletList items={strengths} color="text-green-700" />
        </>
      )}

      {improvements && improvements.length > 0 && (
        <>
          <SectionTitle icon={<AlertCircle size={14} color="#d97706" />} title="需改善之處" />
          <BulletList items={improvements} color="text-amber-800" />
        </>
      )}

      {actionItems && actionItems.length > 0 && (
        <>
          <SectionTitle icon={<Lightbulb size={14} color="#4f46e5" />} title="行動建議" />
          <BulletList items={actionItems} color="text-indigo-700" />
        </>
      )}

      {financialScore && (
        <View className="mt-2 bg-indigo-50 rounded-xl px-3 py-2 flex-row items-center justify-between">
          <Text className="text-indigo-800 font-bold text-sm">財務評分</Text>
          <Text className="text-indigo-600 font-bold">
            {financialScore.score} 分（{financialScore.grade}）
          </Text>
        </View>
      )}
    </View>
  );
}
