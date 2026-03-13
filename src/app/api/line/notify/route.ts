import { NextResponse } from "next/server"
import { sendLineMessage, buildMonthlyReport, buildDeliveryNotification } from "@/lib/lineNotify"
import { parseEmails, filterByCategory, deduplicateEmails } from "@/lib/parseEmails"
import { google } from "googleapis"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

async function fetchGmailData(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  auth.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: "v1", auth })

  const response = await gmail.users.messages.list({
    userId: "me",
    q: "subject:(請求 OR 利用料 OR お知らせ OR 発送 OR お届け OR 注文) newer_than:30d",
    maxResults: 50,
  })

  const messages = response.data.messages || []
  const emailData = []

  for (const message of messages.slice(0, 20)) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: message.id!,
      format: "full",
    })

    const headers = detail.data.payload?.headers || []
    const subject = headers.find(h => h.name === "Subject")?.value || ""
    const from = headers.find(h => h.name === "From")?.value || ""
    const date = headers.find(h => h.name === "Date")?.value || ""
    const snippet = detail.data.snippet || ""

    emailData.push({ id: message.id, subject, from, date, snippet })
  }

  return emailData
}

export async function POST(request: Request) {
  const { type } = await request.json()
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "未認証です" }, { status: 401 })
  }

  const accessToken = (session as any).accessToken

  if (!accessToken) {
    return NextResponse.json({ error: "アクセストークンがありません" }, { status: 401 })
  }

  try {
    const emailData = await fetchGmailData(accessToken)
    const parsed = deduplicateEmails(parseEmails(emailData))

    if (type === "monthly") {
      const expenses = parsed.filter(e =>
        ["electricity", "gas", "ntt", "internet"].includes(e.category)
      )

      const categoryLabel: Record<string, string> = {
        electricity: "電気代",
        gas: "ガス代",
        ntt: "NTT・携帯",
        internet: "光回線",
      }

      const alerts: string[] = []
      for (const expense of expenses) {
        if (expense.amount) {
          const label = categoryLabel[expense.category] || expense.subject
          alerts.push(`${label}が先月比20%以上増加しています`)
        }
      }

      const message = buildMonthlyReport(expenses, alerts)
      await sendLineMessage(message)
      return NextResponse.json({ success: true, message })
    }

    if (type === "delivery") {
      const today = new Date()
      const month = today.getMonth() + 1
      const day = today.getDate()
      const todayStr = `${month}月${day}日`

      const todayDeliveries = parsed.filter(e =>
        e.category === "delivery" &&
        e.deliveryDate?.includes(todayStr)
      )

      const message = buildDeliveryNotification(todayDeliveries)

      if (message) {
        await sendLineMessage(message)
        return NextResponse.json({ success: true, message })
      } else {
        return NextResponse.json({ success: true, message: "本日の配送予定はありません" })
      }
    }

    return NextResponse.json({ error: "typeが不正です" }, { status: 400 })

  } catch (error) {
    console.error("LINE notify error:", error)
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 })
  }
}