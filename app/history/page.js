// app/history/page.js
"use client"
import { useEffect, useState } from "react";
import Link from "next/link";


export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history", {
          method: "GET",
          credentials: "include",
        })
        const { data } = await res.json()
        setHistory(data || [])
      } catch (err) {
        console.error("Error fetch history:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">History</h1>
      {history.length === 0 ? (
        <p>No content yet.</p>
      ) : (
        <ul className="space-y-4">
          {history.map((item) => (
            <li
              key={item.id}
              className="p-4 border rounded-lg bg-white shadow"
            >
              <h2 className="font-semibold">{item.niche}</h2>
              <p className="text-gray-700">{item.description}</p>
              <p className="text-gray-700">{item.description}</p>
              <p className="text-gray-700">{item.ideas}</p>
              <p className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
        <Link href="/" className="text-blue-600 underline">
          Home
        </Link>
    </div>
  )
}
