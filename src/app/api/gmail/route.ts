import { getServerSession } from "next-auth"
import { google } from "googleapis"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

function extractBody(payload: any): string {
  if (!payload) return ""

  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64").toString("utf-8")
    return decoded
  }

  if (payload.parts) {
    let textContent = ""
    let htmlContent = ""

    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        textContent = Buffer.from(part.body.data, "base64").toString("utf-8")
      }
      if (part.mimeType === "text/html" && part.body?.data) {
        htmlContent = Buffer.from(part.body.data, "base64").toString("utf-8")
      }
      if (part.parts) {
        const nested = extractBody(part)
        if (nested) textContent = textContent || nested
      }
    }

    // テキスト形式を優先、なければHTMLからタグを除去
    if (textContent) return textContent
    if (htmlContent) {
      return htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&yen;/g, "¥")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
    }
  }

  return ""
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "未認証です" }, { status: 401 })
  }

  const accessToken = (session as any).accessToken

  if (!accessToken) {
    return NextResponse.json({ error: "アクセストークンがありません" }, { status: 401 })
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    auth.setCredentials({
      access_token: accessToken,
    })

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
      const body = extractBody(detail.data.payload)

      emailData.push({ id: message.id, subject, from, date, snippet, body: body.slice(0, 3000) })
    }

    return NextResponse.json({ emails: emailData })
  } catch (error) {
    console.error("Gmail API error:", error)
    return NextResponse.json({ error: "取得失敗" }, { status: 500 })
  }
}