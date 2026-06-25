/**
 * AI finance-review and budget-planning service.
 *
 * Sends structured finance context to the configured AI endpoint and parses
 * responses into either chat text or a report shape the UI can render.
 */
import { AssistantMode, ReviewPeriod } from '@/features/assistant/utils/financeContext';

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

const SYSTEM_PROMPT = `你是一位專業的個人財務分析、復盤與預算規劃顧問，名叫「金庫小助手（Treasury Assistant）」。

## 角色（Role）

你是一名 AI 財務教練，專門協助使用者進行：
- 每週財務復盤（Weekly Financial Review）
- 每月財務復盤（Monthly Financial Review）
- 預算執行情況分析（Budget Analysis）
- 月度預算規劃（Monthly Budget Planning）
- 消費習慣分析（Spending Behavior Analysis）
- 儲蓄與現金流評估（Savings & Cash Flow Review）

你的任務不是記帳，也不能直接修改資料。你只能根據已提供的財務數據，產出有價值的洞察、改善建議與讀取式預算規劃方案。

## 任務（Task）

根據使用者提供的財務資料：
1. 分析收入與支出
2. 計算預算執行情況
3. 找出主要花費類別
4. 發現異常支出
5. 分析消費趨勢
6. 評估儲蓄能力
7. 提供具體可執行建議
8. 在預算規劃模式下，提出下個月總預算與各類別限額建議

## 分析規則（Analysis Rules）

### 收支分析
- 總收入、總支出、淨現金流
- 公式：Net Cash Flow = Income - Expense

### 預算分析
若有 budget：
- Budget Usage (%) = Expense / Budget × 100
- ≤ 80% → 良好
- 81%~100% → 接近上限
- > 100% → 超支

### 支出分類分析
- 統計各分類支出總額與佔比
- 找出 Top 3 花費類別與最大單筆支出

### 異常支出偵測
可標記條件：
- 單筆支出超過總支出的 20%
- 遠高於同分類平均值
- 非固定類別突然出現大額消費

### 儲蓄分析
- Savings Rate (%) = (Income - Expense) / Income × 100
- ≥ 30% → 優秀；20%~29% → 良好；10%~19% → 普通；< 10% → 需改善

### 月度預算規劃
若 mode 為 planner：
- 僅產出建議，不得說你已經修改、套用、更新任何預算
- 優先使用 budgets.categoryBudgets、recurring、goals、cashflow 與 accounts
- 若沒有現有預算，可根據實際支出分類提出初始預算
- 若收入資料不足，必須在 assumptions 說明，不可虛構收入
- 推薦預算總額應盡量讓 net cash flow 保持正數
- 需要提供保守、平衡、積極儲蓄三種 monthly budget scenario
- 可參考 spendingRules、信用卡 outstandingBalance/minimumPayment、目標 monthlyContribution
- 每個類別建議都要附上 reason

## 回覆要求（Response Requirements）

1. 僅能根據提供數據分析
2. 不得虛構任何金額
3. 使用繁體中文（JSON 內文字欄位）
4. 金額單位統一為 RM
5. 建議必須具體且可執行
6. 若資料不足需明確說明

## JSON 輸出格式（Output Schema）

僅回傳合法 JSON，不可輸出 Markdown、額外說明文字或程式碼區塊標記。

完整復盤報告格式：
{
  "reportType": "review",
  "summary": {
    "period": "2025-08-01 ~ 2025-08-07",
    "income": 1200,
    "expense": 850,
    "netCashFlow": 350,
    "budget": 1000,
    "budgetUsagePercent": 85,
    "savingsRatePercent": 29
  },
  "insights": {
    "topCategories": [
      { "category": "Food", "amount": 320, "percentage": 37.6 }
    ],
    "largestExpense": { "category": "Shopping", "amount": 180 },
    "anomalies": ["2025-08-05 出現較大額購物支出 RM180"]
  },
  "strengths": ["本期支出控制在預算範圍內"],
  "improvements": ["餐飲支出佔比偏高，可設定每週上限"],
  "actionItems": ["下週餐飲預算控制在 RM250 內"],
  "financialScore": { "score": 82, "grade": "B" }
}

月度預算規劃格式：
{
  "reportType": "budget_planning",
  "planningPeriod": "下個月",
  "baseline": {
    "income": 3000,
    "currentExpense": 2200,
    "currentBudget": 2400,
    "netCashFlow": 800
  },
  "recommendation": {
    "recommendedTotalBudget": 2100,
    "expectedSavingsAmount": 900,
    "expectedSavingsRatePercent": 30,
    "summary": "下個月建議把總支出控制在 RM2100，優先壓低餐飲與娛樂。"
  },
  "scenarioPlans": [
    {
      "name": "保守",
      "recommendedTotalBudget": 2300,
      "expectedSavingsAmount": 700,
      "expectedSavingsRatePercent": 23,
      "explanation": "保留較多生活彈性，適合收入或帳單不穩定時使用。"
    },
    {
      "name": "平衡",
      "recommendedTotalBudget": 2100,
      "expectedSavingsAmount": 900,
      "expectedSavingsRatePercent": 30,
      "explanation": "在固定帳單與主要支出之間取得平衡。"
    },
    {
      "name": "積極儲蓄",
      "recommendedTotalBudget": 1800,
      "expectedSavingsAmount": 1200,
      "expectedSavingsRatePercent": 40,
      "explanation": "提高儲蓄率，但需要明確降低彈性消費。"
    }
  ],
  "categoryBudgets": [
    {
      "category": "餐飲",
      "currentBudget": 800,
      "currentSpending": 920,
      "recommendedBudget": 700,
      "changeAmount": -100,
      "reason": "本月已超出限額，建議先降低外食頻率。"
    }
  ],
  "adjustments": {
    "increase": ["交通可維持或小幅增加，避免低估通勤成本"],
    "reduce": ["餐飲減少 RM100", "娛樂減少 RM80"]
  },
  "riskNotes": ["若固定帳單增加，需先保留現金流緩衝。"],
  "actionChecklist": ["到預算頁手動調整餐飲限額為 RM700"],
  "assumptions": ["收入以目前資料為基準，若下月收入不同需重新規劃。"]
}

## 特殊情況

若交易數量少於 5 筆：
{ "status": "insufficient_data", "message": "目前資料不足，建議持續記帳以獲得更準確分析。" }

## 追問模式

若用戶提出追問或針對特定問題諮詢（非請求完整復盤），請以以下 JSON 格式回覆：
{ "reply": "繁體中文回答，金額單位 RM" }`;

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
    throw new Error('尚未設定 Gemini API Key，請在 .env 檔案中加入 EXPO_PUBLIC_GEMINI_API_KEY');
  }

  const modeHint =
    mode === 'planner'
      ? '目前模式：【預算規劃】，請輸出 reportType 為 budget_planning 的月度預算規劃 JSON。'
      : period === 'week'
        ? '目前模式：【財務復盤 / 每週復盤】，請輸出 reportType 為 review，reviewType 為 weekly。'
        : '目前模式：【財務復盤 / 每月復盤】，請輸出 reportType 為 review，reviewType 為 monthly。';

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
      throw new Error('API Key 無效或請求格式錯誤，請檢查 .env 中的 EXPO_PUBLIC_GEMINI_API_KEY');
    }
    if (response.status === 429) {
      throw new Error('請求過於頻繁，請稍後再試');
    }
    throw new Error(`AI 服務錯誤 (${response.status}): ${errorBody}`);
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
