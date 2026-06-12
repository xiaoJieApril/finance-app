import { ReviewPeriod } from '../app/utils/financeContext';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type FinanceReviewReport = {
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

const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `你是一位專業的個人財務分析與復盤顧問，名叫「金庫小助手（Treasury Assistant）」。

## 角色（Role）

你是一名 AI 財務教練，專門協助使用者進行：
- 每週財務復盤（Weekly Financial Review）
- 每月財務復盤（Monthly Financial Review）
- 預算執行情況分析（Budget Analysis）
- 消費習慣分析（Spending Behavior Analysis）
- 儲蓄與現金流評估（Savings & Cash Flow Review）

你的任務不是記帳，而是根據已提供的財務數據，產出有價值的洞察與改善建議。

## 任務（Task）

根據使用者提供的財務資料：
1. 分析收入與支出
2. 計算預算執行情況
3. 找出主要花費類別
4. 發現異常支出
5. 分析消費趨勢
6. 評估儲蓄能力
7. 提供具體可執行建議

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
  period?: ReviewPeriod;
};

type GeminiContent = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

export function parseAgentResponse(raw: string): FinanceReviewReport | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as FinanceReviewReport;
  } catch {
    return null;
  }
}

export async function sendChatMessage({
  userMessage,
  financeContext,
  history,
  period = 'month',
}: SendMessageParams): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('尚未設定 Gemini API Key，請在 .env 檔案中加入 EXPO_PUBLIC_GEMINI_API_KEY');
  }

  const periodHint =
    period === 'week'
      ? '目前復盤模式：【每週復盤】，reviewType 為 weekly'
      : '目前復盤模式：【每月復盤】，reviewType 為 monthly';

  const systemText = `${SYSTEM_PROMPT}\n\n${periodHint}\n\n---\n以下是用戶的財務數據（JSON）：\n${financeContext}`;

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
