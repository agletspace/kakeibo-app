import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const keys = await redis.keys("email:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return NextResponse.json({ success: true, cleared: keys.length });
  } catch (error) {
    console.error("キャッシュクリアエラー:", error);
    return NextResponse.json({ error: "失敗" }, { status: 500 });
  }
}
