export interface AnalyzedEmail {
  id: string;
  category: "electricity" | "gas" | "ntt" | "internet" | "delivery" | "unknown";
  amount?: number;
  deliveryDate?: string;
  productName?: string;
  shop?: string;
  subject?: string;
  from?: string;
  date?: string;
}

// 待機ユーティリティ
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeEmailWithGemini(
  id: string,
  subject: string,
  from: string,
  body: string,
): Promise<AnalyzedEmail> {
  const apiKey = process.env.GEMINI_API_KEY!;
  // ✅ v1beta に修正
  // 変更後
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const prompt = `
以下のメールを解析して、JSON形式で返してください。
余分な文字やマークダウンは不要です。JSONのみ返してください。

【分類ルール】
- electricity: 電力会社からの請求メール
- gas: ガス会社からの請求メール
- ntt: NTT・携帯・スマホの請求メール
- internet: 光回線・プロバイダの請求メール
- delivery: 通販の注文確認・発送・お届けメール
- unknown: 上記以外

【返却形式】
{
  "category": "カテゴリ名",
  "amount": 金額を数値で（不明な場合はnull）,
  "deliveryDate": "配送予定日を○月○日の形式で（ない場合はnull）",
  "productName": "商品名（通販の場合のみ・ない場合はnull）",
  "shop": "ショップ名（通販の場合のみ・ない場合はnull）"
}

【メール情報】
件名：${subject}
送信元：${from}
本文：${body.slice(0, 2000)}
`;

  // ✅ リトライ処理（最大3回、429時は待機）
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      // ✅ 429はリトライ
      if (response.status === 429) {
        const waitMs = 2000 * (attempt + 1); // 2秒 → 4秒 → 6秒
        console.warn(
          `Gemini rate limit. ${waitMs / 1000}秒後にリトライ (${attempt + 1}/3)`,
        );
        await sleep(waitMs);
        continue;
      }

      const data = await response.json();

      if (!response.ok) {
        console.error("Gemini APIエラー:", data.error?.message);
        return { id, category: "unknown", subject, from };
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) {
        console.error("Gemini APIレスポンスが空です");
        return { id, category: "unknown", subject, from };
      }

      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      return {
        id,
        category: parsed.category || "unknown",
        amount: parsed.amount || undefined,
        deliveryDate: parsed.deliveryDate || undefined,
        productName: parsed.productName || undefined,
        shop: parsed.shop || undefined,
        subject,
        from,
      };
    } catch (error) {
      console.error("Gemini解析エラー:", error);
      return { id, category: "unknown", subject, from };
    }
  }

  // 3回リトライしても失敗
  console.error("Gemini API: リトライ上限に達しました");
  return { id, category: "unknown", subject, from };
}
