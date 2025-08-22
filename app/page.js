"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link"


export default function ProtectedPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [checking, setChecking] = useState(true);
  const [niche, setNiche] = useState("");
  const [description, setDescription] = useState("");
  const [ideas, setIdeas] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Form submitted:", { niche, description });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, description }),
      });

      const data = await res.json();
      setIdeas(data.ideas);
      console.log("Response dari server:", data);
    } catch (err) {
      console.error("Error submit:", err);
    }
  };

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
        setLoadingHistory(false);
      }
    }

    fetchHistory()
  }, [])

  return (
      <main className="max-w-xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Auto Content Generator</h1>
        <Link href="/history" className="text-blue-600 underline">
          View History
        </Link>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white shadow p-6 rounded-xl">
          <div>
            <label className="block font-medium">Select niche:</label>
            <select
              className="w-full border p-2 rounded"
              value={niche}
              onChange={e => setNiche(e.target.value)}
            >
              <option value="skincare">Skincare</option>
              <option value="gadgets">Gadgets</option>
              <option value="fitness">Fitness</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">Optional description:</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. budget-friendly for gen z"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 w-full"
          >
            Generate
          </button>
        </form>

        {ideas && (
          <div className="mt-6 whitespace-pre-wrap bg-gray-100 p-4 rounded-xl">
            {ideas}
          </div>
        )}

      {/* history */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Your History</h2>
        {loadingHistory ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
          <p>No history yet</p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => (
              <li key={item.id} className="border p-3 rounded bg-gray-50">
                <p className="font-bold">Niche: {item.niche}</p>
                <p className="italic">Desc: {item.description}</p>
                <p className="mt-2">{item.ideas}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      </main>

  );
}
