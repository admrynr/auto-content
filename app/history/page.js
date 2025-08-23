"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      let { data, error } = await supabase
        .from("contents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching history:", error);
      } else {
        setContents(data);
      }
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard ✅");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">📜 Your Content History</h1>

      {contents.length === 0 ? (
        <p className="text-gray-500">No history yet. Generate some content first!</p>
      ) : (
        <div className="space-y-6">
          {contents.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold">{item.niche}</h2>
              <p className="text-sm text-gray-600 mb-2">
                {item.description || "No description"}
              </p>
              <pre className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                {item.ideas}
              </pre>
              <div className="mt-3">
                <button
                  onClick={() => handleCopy(item.ideas)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Created: {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
