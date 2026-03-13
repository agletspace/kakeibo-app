"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { ParsedEmail, parseEmails, filterByCategory, calcMonthlyTotal, deduplicateEmails } from "@/lib/parseEmails"

export default function Home() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState<"expenses" | "orders">("expenses")
  const [emails, setEmails] = useState<ParsedEmail[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      fetchEmails()
    }
  }, [session])

  const fetchEmails = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/gmail")
      const data = await res.json()
      if (data.emails) {
        setEmails(deduplicateEmails(parseEmails(data.emails)))
      }
    } catch (error) {
      console.error("Error fetching emails:", error)
    } finally {
      setLoading(false)
    }
  }

  const testLineNotify = async () => {
    const res = await fetch("/api/line/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "monthly" }),
    })
    const data = await res.json()
    alert(JSON.stringify(data))
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-gray-800 mb-2">家計簿アプリ</h1>
          <p className="text-gray-500 text-sm">Gmailと連携して家計を自動管理</p>
        </div>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          Googleでログイン
        </button>
      </div>
    )
  }

  const monthlyTotal = calcMonthlyTotal(emails)
  const deliveryEmails = filterByCategory(emails, "delivery")
  const expenseEmails = emails.filter(e =>
    ["electricity", "gas", "ntt", "internet"].includes(e.category)
  )

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
        <div>
          <h1 className="text-lg font-medium text-gray-800">家計簿アプリ</h1>
          <p className="text-xs text-gray-400">Gmailから自動取得</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            onClick={testLineNotify}
            className="text-xs text-green-600 hover:text-green-800 cursor-pointer"
          >
            LINE通知テスト
          </span>
          <span
            onClick={() => signOut()}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ログアウト
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex-1 py-2 text-sm rounded-lg border transition ${
            activeTab === "expenses"
              ? "bg-white border-gray-400 font-medium text-gray-800"
              : "bg-gray-100 border-gray-200 text-gray-500"
          }`}
        >
          📊 月額費用
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-2 text-sm rounded-lg border transition ${
            activeTab === "orders"
              ? "bg-white border-gray-400 font-medium text-gray-800"
              : "bg-gray-100 border-gray-200 text-gray-500"
          }`}
        >
          📦 通販・配送
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">Gmailからデータを取得中...</p>
        </div>
      )}

      {!loading && activeTab === "expenses" && (
        <ExpensesTab emails={expenseEmails} monthlyTotal={monthlyTotal} />
      )}
      {!loading && activeTab === "orders" && (
        <OrdersTab emails={deliveryEmails} />
      )}
    </div>
  )
}

function ExpensesTab({ emails, monthlyTotal }: { emails: ParsedEmail[], monthlyTotal: number }) {
  const categoryLabel: Record<string, { label: string, icon: string }> = {
    electricity: { label: "電気代", icon: "⚡" },
    gas: { label: "ガス代", icon: "🔥" },
    ntt: { label: "NTT・携帯", icon: "📱" },
    internet: { label: "光回線", icon: "📡" },
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">今月合計</p>
          <p className="text-xl font-medium text-gray-800">
            ¥{monthlyTotal.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">件数</p>
          <p className="text-xl font-medium text-green-600">{emails.length}件</p>
        </div>
      </div>

      {emails.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">該当するメールが見つかりませんでした</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {emails.map((email, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-base flex-shrink-0">
                {categoryLabel[email.category]?.icon || "📄"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {categoryLabel[email.category]?.label || email.subject}
                </p>
                <p className="text-xs text-gray-400">{email.date}</p>
                <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block bg-green-50 text-green-700">
                  Gmail取得
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800">
                {email.amount ? `¥${email.amount.toLocaleString()}` : "金額不明"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OrdersTab({ emails }: { emails: ParsedEmail[] }) {
  const totalAmount = emails.reduce((sum, e) => sum + (e.amount || 0), 0)

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">今月の購入合計</p>
          <p className="text-xl font-medium text-gray-800">
            ¥{totalAmount.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">注文件数</p>
          <p className="text-xl font-medium text-blue-600">{emails.length}件</p>
        </div>
      </div>

      {emails.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">該当するメールが見つかりませんでした</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {emails.map((email, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg p-3"
              style={{ borderLeft: "2px solid #1D9E75" }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {email.productName || email.subject}
                  </p>
                  <p className="text-xs text-gray-400">{email.shop || email.from}</p>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {email.amount ? `¥${email.amount.toLocaleString()}` : "金額不明"}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                  Gmail取得
                </span>
                <p className="text-xs text-gray-400">
                  {email.deliveryDate ? `${email.deliveryDate} お届け予定` : email.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
