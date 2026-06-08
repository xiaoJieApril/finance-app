import { ReviewPeriod } from '../app/utils/financeContext';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `你是一位專業的個人理財復盤顧問，名叫「金庫小助手」。
你的核心任務是幫用戶做【每週】或【每月】財務復盤，像一位貼心的理財教練一樣回顧過去、總結問題、給出可行建議。

復盤報告應包含（視數據多寡調整）：
1. 📊 總覽：期間收支摘要與預算執行狀況
2. 🔍 重點分析：花費最多的類別、異常支出、值得注意的趨勢
3. ✅ 做得好的地方：若有節制或儲蓄，給予肯定
4. ⚠️ 需改善之處：具體指出問題，不要空泛
5. 💡 下期行動建議：2-4 條可執行的具體建議

規則：
1. 一律使用繁體中文回覆
2. 金額單位為馬來西亞令吉 (RM)
3. 嚴格根據提供的財務數據分析，不要編造數字
4. 善用條列式與小標題，讓復盤報告清晰易讀
5. 語氣親切專業，像值得信賴的理財教練
6. 若數據不足，誠實說明並鼓勵用戶持續記帳`;

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

  const periodHint = period === 'week' ? '目前復盤模式：【每週復盤】' : '目前復盤模式：【每月復盤】';

  const systemText = `${SYSTEM_PROMPT}\n\n${periodHint}\n\n---\n以下是用戶的財務數據：\n${financeContext}`;

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
        temperature: 0.7,
        maxOutputTokens: 1024,
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
