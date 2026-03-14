import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function getCachedEmail(id: string) {
  try {
    const cached = await redis.get(`email:${id}`);
    return cached || null;
  } catch (error) {
    console.error("キャッシュ取得エラー:", error);
    return null;
  }
}

export async function setCachedEmail(id: string, data: any) {
  try {
    // 90日間キャッシュを保持
    await redis.set(`email:${id}`, JSON.stringify(data), {
      ex: 60 * 60 * 24 * 90,
    });
  } catch (error) {
    console.error("キャッシュ保存エラー:", error);
  }
}

export async function getAllCachedEmails(): Promise<any[]> {
  try {
    const keys = await redis.keys("email:*");
    if (keys.length === 0) return [];

    const values = await redis.mget(...keys);
    return values
      .filter(Boolean)
      .map((v) => (typeof v === "string" ? JSON.parse(v) : v));
  } catch (error) {
    console.error("全キャッシュ取得エラー:", error);
    return [];
  }
}
