export type EmailCategory = "electricity" | "gas" | "ntt" | "internet" | "delivery" | "unknown"

export interface ParsedEmail {
  id: string
  category: EmailCategory
  subject: string
  from: string
  date: string
  amount?: number
  deliveryDate?: string
  productName?: string
  shop?: string
}

function extractAmount(text: string): number | undefined {
  const patterns = [
    /合計[^\d]*[¥￥]?\s*([0-9,]+)\s*円/,
    /ご請求金額[^\d]*[¥￥]?\s*([0-9,]+)/,
    /お支払い金額[^\d]*[¥￥]?\s*([0-9,]+)/,
    /総合計[^\d]*[¥￥]?\s*([0-9,]+)/,
    /請求金額[^\d]*[¥￥]?\s*([0-9,]+)/,
    /ご利用金額[^\d]*[¥￥]?\s*([0-9,]+)/,
    /金額[^\d]*[¥￥]?\s*([0-9,]+)\s*円/,
    /[¥￥]\s*([0-9,]+)/,
    /([0-9,]+)\s*円/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ""))
      if (amount > 0 && amount < 10000000) {
        return amount
      }
    }
  }
  return undefined
}

function extractDeliveryDate(text: string): string | undefined {
  const patterns = [
    /お届け予定日[^\d]*(\d+月\d+日)/,
    /配達予定日[^\d]*(\d+月\d+日)/,
    /(\d+月\d+日)[^\d]*お届け予定/,
    /(\d+月\d+日)[^\d]*配達予定/,
    /(\d+月\d+日)[^\d]*到着予定/,
    /予定日時[^\d]*(\d+月\d+日)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return undefined
}

export function parseEmails(emails: any[]): ParsedEmail[] {
  return emails.map(email => {
    const subject = email.subject || ""
    const from = email.from || ""
    const snippet = email.snippet || ""
    const body = email.body || ""
    const fullText = `${subject} ${from} ${snippet} ${body}`
    const lowerText = fullText.toLowerCase()

    const parsed: ParsedEmail = {
      id: email.id,
      category: "unknown",
      subject,
      from,
      date: email.date,
    }

    // カテゴリ分類
    if (lowerText.includes("東京電力") || lowerText.includes("関西電力") || lowerText.includes("電気料金") || lowerText.includes("電力")) {
      parsed.category = "electricity"
    } else if (lowerText.includes("東京ガス") || lowerText.includes("大阪ガス") || lowerText.includes("ガス料金") || lowerText.includes("ガス")) {
      parsed.category = "gas"
    } else if (lowerText.includes("ntt") || lowerText.includes("ドコモ") || lowerText.includes("docomo") || lowerText.includes("携帯") || lowerText.includes("スマホ")) {
      parsed.category = "ntt"
    } else if (lowerText.includes("光回線") || lowerText.includes("フレッツ") || lowerText.includes("インターネット") || lowerText.includes("プロバイダ")) {
      parsed.category = "internet"
    } else if (
      lowerText.includes("発送") || lowerText.includes("お届け") ||
      lowerText.includes("配送") || lowerText.includes("注文") ||
      lowerText.includes("amazon") || lowerText.includes("楽天") ||
      lowerText.includes("yahoo") || lowerText.includes("zozo") ||
      lowerText.includes("購入")
    ) {
      parsed.category = "delivery"
    }

    // 金額抽出（本文全体から）
    parsed.amount = extractAmount(fullText)

    // 配送日抽出
    parsed.deliveryDate = extractDeliveryDate(fullText)

    // 商品名・ショップ名抽出
    if (parsed.category === "delivery") {
      const productMatch = subject.match(/「(.+?)」/) ||
                           subject.match(/【(.+?)】/) ||
                           subject.match(/〔(.+?)〕/)
      if (productMatch) {
        parsed.productName = productMatch[1]
      }

      if (from.includes("amazon")) parsed.shop = "Amazon"
      else if (from.includes("rakuten")) parsed.shop = "楽天市場"
      else if (from.includes("yahoo")) parsed.shop = "Yahoo!ショッピング"
      else if (from.includes("zozo")) parsed.shop = "ZOZOTOWN"
      else if (from.includes("soup")) parsed.shop = "Soup Stock Tokyo"
      else parsed.shop = from.split("<")[0].trim()
    }

    return parsed
  })
}

export function filterByCategory(emails: ParsedEmail[], category: EmailCategory) {
  return emails.filter(e => e.category === category)
}

export function calcMonthlyTotal(emails: ParsedEmail[]) {
  const expenseCategories: EmailCategory[] = ["electricity", "gas", "ntt", "internet"]
  return emails
    .filter(e => expenseCategories.includes(e.category) && e.amount)
    .reduce((sum, e) => sum + (e.amount || 0), 0)
}

export function deduplicateEmails(emails: ParsedEmail[]): ParsedEmail[] {
  const seen = new Map<string, ParsedEmail>()

  for (const email of emails) {
    // カテゴリ+金額+月をキーにして重複を除去
    const date = new Date(email.date)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    const key = `${email.category}-${email.amount}-${monthKey}`

    if (!seen.has(key)) {
      seen.set(key, email)
    } else {
      // 金額が取得できている方を優先
      const existing = seen.get(key)!
      if (!existing.amount && email.amount) {
        seen.set(key, email)
      }
    }
  }

  return Array.from(seen.values())
}