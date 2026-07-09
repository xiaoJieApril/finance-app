/**
 * AI finance-review and budget-planning service.
 *
 * Sends structured finance context to the configured AI endpoint and parses
 * responses into either chat text or a report shape the UI can render.
 */
import { AssistantMode, ReviewPeriod } from '@/features/assistant/utils/financeContext';
import { developerText } from '@/shared/config/appVariant';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type FinanceReviewReport = {
  reportType?: 'review';
  summary?: {
    period: string;
    income: number;
    expense: number;
    netCashFlow: number;
    budget?: number;
    budgetUsagePercent?: number;
    savingsRatePercent?: number;
  };
  insights?: {
    topCategories: { category: string; amount: number; percentage: number }[];
    largestExpense: { category: string; amount: number; description?: string };
    anomalies: string[];
  };
  strengths?: string[];
  improvements?: string[];
  actionItems?: string[];
  financialScore?: { score: number; grade: string };
  status?: 'insufficient_data';
  message?: string;
  reply?: string;
};

export type BudgetPlanningReport = {
  reportType: 'budget_planning';
  planningPeriod: string;
  baseline: {
    income: number;
    currentExpense: number;
    currentBudget?: number;
    netCashFlow: number;
  };
  recommendation: {
    recommendedTotalBudget: number;
    expectedSavingsAmount?: number;
    expectedSavingsRatePercent?: number;
    summary: string;
  };
  savingPlanRecommendation?: {
    mode: 'rate' | 'amount';
    targetRatePercent?: number;
    targetAmount: number;
    bufferAmount: number;
    reason: string;
  };
  expectedMonthlySavings?: number;
  applyableBudgetChanges?: {
    category: string;
    recommendedBudget: number;
    rulePeriod?: 'day' | 'week' | 'month';
    ruleLimitAmount?: number;
  }[];
  scenarioPlans?: {
    name: '保守' | '平衡' | '積極儲蓄' | string;
    recommendedTotalBudget: number;
    expectedSavingsAmount?: number;
    expectedSavingsRatePercent?: number;
    explanation: string;
  }[];
  categoryBudgets: {
    category: string;
    currentBudget?: number;
    currentSpending?: number;
    recommendedBudget: number;
    changeAmount?: number;
    reason: string;
  }[];
  adjustments: {
    increase: string[];
    reduce: string[];
  };
  riskNotes: string[];
  actionChecklist: string[];
  assumptions?: string[];
  status?: 'insufficient_data';
  message?: string;
};

export type AgentReport = FinanceReviewReport | BudgetPlanningReport;

const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `你是「金庫小助手」，一位嚴格但不羞辱的存錢教練。

你的核心任務：幫使用者判斷今天、本週、本月怎麼做才能真的存到錢。

回答優先順序：
1. 安全可花額：今天/本週/月剩餘可花是否安全
2. 存錢缺口：本月應存、目前差多少、是否偏離目標
3. 壓力類別：哪些類別或規則正在超支或接近上限
4. 下一步行動：給 1-3 條具體、可執行、帶金額或類別的行動

嚴格限制：
- 只能使用提供的 financeContext，不得虛構金額、收入、帳單或交易
- 不得說你已經修改、套用、更新或刪除任何資料
- 金額單位一律使用 RM
- 使用繁體中文
- 語氣直接，但不要羞辱或責備使用者
- 資料不足時必須說缺什麼資料，例如收入、支出、預算、存錢目標或固定帳單
- 只能回傳合法 JSON，不可輸出 Markdown、程式碼區塊或 JSON 以外文字

financeContext 重要欄位：
- savingPlan：每日/本週/月剩餘可花、應存金額、存錢缺口
- savingCoach.dailyActions：本地存錢教練已算出的今日行動
- savingCoach.pressurePoints：最該削減的支出類別
- goals：存錢目標、完成速度、需要多存多少
- budgets / spendingRules：月預算與短週期支出規則
- recurring：固定收入與固定支出
- transactions：期間內流水

完整復盤 JSON：
{
  "reportType": "review",
  "summary": {
    "period": "本週或本月",
    "income": 0,
    "expense": 0,
    "netCashFlow": 0,
    "budget": 0,
    "budgetUsagePercent": 0,
    "savingsRatePercent": 0
  },
  "insights": {
    "topCategories": [{ "category": "餐飲", "amount": 0, "percentage": 0 }],
    "largestExpense": { "category": "餐飲", "amount": 0, "description": "可選" },
    "anomalies": ["只列有根據的異常"]
  },
  "strengths": ["做得好的地方"],
  "improvements": ["需要改善的地方"],
  "actionItems": ["具體行動，包含類別或金額"],
  "financialScore": { "score": 0, "grade": "A/B/C/D" }
}

預算規劃 JSON：
{
  "reportType": "budget_planning",
  "planningPeriod": "下個月",
  "baseline": {
    "income": 0,
    "currentExpense": 0,
    "currentBudget": 0,
    "netCashFlow": 0
  },
  "recommendation": {
    "recommendedTotalBudget": 0,
    "expectedSavingsAmount": 0,
    "expectedSavingsRatePercent": 0,
    "summary": "先說預計能多存多少和要削減哪裡"
  },
  "savingPlanRecommendation": {
    "mode": "rate",
    "targetRatePercent": 20,
    "targetAmount": 0,
    "bufferAmount": 300,
    "reason": "理由"
  },
  "expectedMonthlySavings": 0,
  "applyableBudgetChanges": [
    { "category": "餐飲", "recommendedBudget": 0, "rulePeriod": "week", "ruleLimitAmount": 0 }
  ],
  "scenarioPlans": [
    { "name": "保守", "recommendedTotalBudget": 0, "expectedSavingsAmount": 0, "expectedSavingsRatePercent": 0, "explanation": "說明" },
    { "name": "平衡", "recommendedTotalBudget": 0, "expectedSavingsAmount": 0, "expectedSavingsRatePercent": 0, "explanation": "說明" },
    { "name": "積極儲蓄", "recommendedTotalBudget": 0, "expectedSavingsAmount": 0, "expectedSavingsRatePercent": 0, "explanation": "說明" }
  ],
  "categoryBudgets": [
    { "category": "餐飲", "currentBudget": 0, "currentSpending": 0, "recommendedBudget": 0, "changeAmount": 0, "reason": "理由" }
  ],
  "adjustments": {
    "increase": ["可以提高或維持的類別"],
    "reduce": ["要降低的類別與金額"]
  },
  "riskNotes": ["風險"],
  "actionChecklist": ["套用前/套用後要做的事"],
  "assumptions": ["資料不足或估算前提"]
}

資料不足 JSON：
{ "status": "insufficient_data", "message": "目前資料不足。請先新增收入、支出、預算或存錢目標，才能給出可靠建議。" }

追問 JSON：
{ "reply": "直接回答使用者問題，包含具體金額、類別和下一步行動。" }`;

type SendMessageParams = {
  userMessage: string;
  financeContext: string;
  history: ChatMessage[];
  mode?: AssistantMode;
  period?: ReviewPeriod;
};

type GeminiContent = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

export function parseAgentResponse(raw: string): AgentReport | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as AgentReport;
  } catch {
    return null;
  }
}

export async function sendChatMessage({
  userMessage,
  financeContext,
  history,
  mode = 'review',
  period = 'month',
}: SendMessageParams): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      developerText(
        '尚未設定 Gemini API Key，請在 .env 檔案中加入 EXPO_PUBLIC_GEMINI_API_KEY',
        'AI 助手目前尚未啟用，請稍後再試。',
      ),
    );
  }

  const modeHint =
    mode === 'planner'
      ? '目前模式：【存錢方案 / 預算規劃】。先回答三套方案、可套用差異、預計多存多少；請輸出 reportType 為 budget_planning 的 JSON。'
      : period === 'week'
        ? '目前模式：【本週存錢復盤】。先回答發生了什麼、風險在哪、下一步做什麼；請輸出 reportType 為 review 的 JSON。'
        : '目前模式：【本月存錢復盤】。先回答是否能存到錢、風險在哪、下一步做什麼；請輸出 reportType 為 review 的 JSON。';

  const systemText = `${SYSTEM_PROMPT}\n\n${modeHint}\n\n---\n以下是用戶的財務數據（JSON）：\n${financeContext}`;

  const contents: GeminiContent[] = [
    ...history.map((msg) => ({
      role: (msg.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: msg.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 5000,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 400 || response.status === 403) {
      throw new Error(
        developerText(
          'API Key 無效或請求格式錯誤，請檢查 .env 中的 EXPO_PUBLIC_GEMINI_API_KEY',
          'AI 助手暫時無法連線，請稍後再試。',
        ),
      );
    }
    if (response.status === 429) {
      throw new Error('請求過於頻繁，請稍後再試');
    }
    throw new Error(
      developerText(
        `AI 服務錯誤 (${response.status}): ${errorBody}`,
        'AI 助手暫時無法完成回覆，請稍後再試。',
      ),
    );
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) {
    const blockReason = data.candidates?.[0]?.finishReason;
    if (blockReason === 'SAFETY') {
      throw new Error('內容被安全過濾器攔截，請換個方式提問');
    }
    throw new Error('AI 未回傳有效內容，請再試一次');
  }

  return reply;
}
