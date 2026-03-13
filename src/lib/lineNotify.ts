const LINE_API_URL = "https://api.line.me/v2/bot/message/push"

export async function sendLineMessage(message: string) {
  const userId = process.env.LINE_USER_ID
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN

  if (!userId || !token) {
    console.error("LINE環境変数が設定されていません")
    return
  }

  const response = await fetch(LINE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error("LINE送信エラー:", error)
  } else {
    console.log("LINE通知送信成功")
  }
}

export function buildMonthlyReport(expenses: any[], alerts: string[]) {
  const categoryLabel: Record<string, string> = {
    electricity: "電気代",
    gas: "ガス代",
    ntt: "NTT・携帯",
    internet: "光回線",
  }

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  let message = "📊 今月の費用まとめ\n\n"

  for (const expense of expenses) {
    const label = categoryLabel[expense.category] || expense.subject
    const amount = expense.amount ? `¥${expense.amount.toLocaleString()}` : "金額不明"
    message += `${label}　${amount}\n`
  }

  message += `\n合計　¥${total.toLocaleString()}`

  if (alerts.length > 0) {
    message += "\n\n⚠️ アラート\n"
    for (const alert of alerts) {
      message += `${alert}\n`
    }
  }

  return message
}

export function buildDeliveryNotification(deliveries: any[]) {
  if (deliveries.length === 0) return null

  let message = "📦 本日のお届け予定\n\n"

  for (const delivery of deliveries) {
    const name = delivery.productName || delivery.subject
    const shop = delivery.shop || ""
    message += `・${name}（${shop}）\n`
  }

  message += `\n合計${deliveries.length}件が本日届く予定です`

  return message
}