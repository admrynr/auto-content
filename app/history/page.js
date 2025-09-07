"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function HistoryPage() {
  const supabase = createClientComponentClient()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    const { data, error } = await supabase
      .from("history")
      .select("id, post_id, status, message, created_at")
      .order("created_at", { ascending: false })

    if (error) console.error("Error fetching history:", error)
    else setHistory(data || [])
    setLoading(false)
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Publish History</h1>

      {loading && <p>Loading history...</p>}

      {!loading && history.length === 0 && (
        <p className="text-gray-500">Belum ada aktivitas publish.</p>
      )}

      <div className="space-y-4">
        {history.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-4 shadow-sm ${
              item.status === "success"
                ? "bg-green-50 border-green-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <p className="font-semibold">
              {item.status === "success" ? "✅ Success" : "❌ Failed"}
            </p>
            <p className="text-sm text-gray-700">
              {item.message || "No details"}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
