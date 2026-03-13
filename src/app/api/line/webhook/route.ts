import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()
  console.log("LINE Webhook:", JSON.stringify(body, null, 2))

  const events = body.events || []
  for (const event of events) {
    if (event.type === "follow" || event.type === "message") {
      console.log("User ID:", event.source.userId)
    }
  }

  return NextResponse.json({ status: "ok" })
}