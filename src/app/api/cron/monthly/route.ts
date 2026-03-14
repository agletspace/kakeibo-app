import { NextResponse } from "next/server";
import { getAllCachedEmails } from "@/lib/cache";
import { sendLineMessage, buildMonthlyReport } from "@/lib/lineNotify";

function isLastDayOfMonth(): boolean {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return tomorrow.getMonth() !== today.getMonth();
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLastDayOfMonth()) {
    return NextResponse.json({ skipped: true, reason: "月末日ではありません" });
  }

  try {
    const emails = await getAllCachedEmails();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const expenseCategories = ["electricity", "gas", "ntt", "internet"];
    const categoryLabel: Record<string, string> = {
      electricity: "電気代",
      gas: "ガス代",
      ntt: "NTT・携帯",
      internet: "光回線",
    };

    const monthlyExpenses = emails.filter((email) => {
      if (!expenseCategories.includes(email.category)) return false;
      if (!email.date) return false;
      const emailDate = new Date(email.date);
      return (
        emailDate.getMonth() === currentMonth &&
        emailDate.getFullYear() === currentYear
      );
    });

    const lastMonthExpenses = emails.filter((email) => {
      if (!expenseCategories.includes(email.category)) return false;
      if (!email.date) return false;
      const emailDate = new Date(email.date);
      return (
        emailDate.getMonth() === lastMonth &&
        emailDate.getFullYear() === lastYear
      );
    });

    const alerts: string[] = [];
    for (const category of expenseCategories) {
      const current = monthlyExpenses.find((e) => e.category === category);
      const last = lastMonthExpenses.find((e) => e.category === category);
      if (current?.amount && last?.amount) {
        const increase = (current.amount - last.amount) / last.amount;
        if (increase >= 0.2) {
          alerts.push(
            `${categoryLabel[category]}が先月比${Math.round(increase * 100)}%増加（¥${last.amount.toLocaleString()} → ¥${current.amount.toLocaleString()}）`,
          );
        }
      }
    }

    const message = buildMonthlyReport(monthlyExpenses, alerts);
    await sendLineMessage(message);

    return NextResponse.json({ success: true, count: monthlyExpenses.length });
  } catch (error) {
    console.error("月次通知エラー:", error);
    return NextResponse.json({ error: "失敗" }, { status: 500 });
  }
}
