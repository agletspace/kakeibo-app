import { NextResponse } from "next/server";
import { getAllCachedEmails } from "@/lib/cache";
import { sendLineMessage, buildDeliveryNotification } from "@/lib/lineNotify";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const emails = await getAllCachedEmails();

    const today = new Date();
    const todayStr = `${today.getMonth() + 1}月${today.getDate()}日`;

    const todayDeliveries = emails.filter(
      (email) =>
        email.category === "delivery" && email.deliveryDate === todayStr,
    );

    const message = buildDeliveryNotification(todayDeliveries);
    if (message) {
      await sendLineMessage(message);
      console.log(`配送通知送信: ${todayDeliveries.length}件`);
    } else {
      console.log("本日の配送予定なし");
    }

    return NextResponse.json({ success: true, count: todayDeliveries.length });
  } catch (error) {
    console.error("配送通知エラー:", error);
    return NextResponse.json({ error: "失敗" }, { status: 500 });
  }
}
