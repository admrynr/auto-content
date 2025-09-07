"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { checkDailyLimit, logUsage } from "../lib/checkLimit";
import { toast } from "sonner"


export default function ProtectedPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [checking, setChecking] = useState(true);
  const [niche, setNiche] = useState("skincare");
  const [description, setDescription] = useState("");
  const [ideas, setIdeas] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [imageUrl, setImageUrl] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingGenerate(true)

    const { data: { user } } = await supabase.auth.getUser();

    const canGenerate = await checkDailyLimit(user.id, "text_and_image_generate");
    if (!canGenerate) {
      alert("Limit harian generate konten sudah tercapai!");
      return;
    }

    console.log(user.id)

    console.log("Form submitted:", { niche, description });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, description }),
      });

      const data = await res.json();

      setIdeas(data.ideas);
      if (data.image_url) {
        setImageUrl(data.image_url); // tampilkan di UI
      }
      setNiche(data.niche);
      console.log("Response dari server:", data);

    } catch (err) {
      console.error("Error submit:", err);
    } finally{
      setLoadingGenerate(false);
    }

      // ... setelah proses generate sukses:
      const resLog = await logUsage(user.id, "text_and_image_generate"); // atau "text_generate"
      if (!resLog.ok) {
        // bebas: pakai toast, alert, atau UI message
        toast.error(`Gagal mencatat log: ${resLog.error.message}`);
        // proses utama tetap lanjut — jangan diblokir
      }

  };

          async function handleSave() {
          // 🔹 ambil user login
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) {
            toast.warning("Harus login dulu")
            return
          }

          // 🔹 simpan ke posts
          const { error } = await supabase.from("posts").insert({
            title: niche, // opsional bisa diubah jadi judul otomatis
            content: ideas,
            user_id: user.id,
          })

          if (error) {
            console.error("Error saving draft:", error)
          } else {
            toast.success("Draft tersimpan!")
          }
        }

  return (
      <main className="max-w-xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Auto Content Generator</h1>

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
            {loadingGenerate ? "Generating..." : "Generate"}
          </button>

        </form>
        {/*
        <button
            onClick={async () => {
              const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ niche, description }),
              });
              const data = await res.json();
              if (data.image_url) {
                setImageUrl(data.image_url); // tampilkan di UI
              }
            }}
          >
            Generate Image
          </button>
          */}


        {ideas && (
          <div className="mt-6 whitespace-pre-wrap bg-gray-100 p-4 rounded-xl">
            {ideas}
                      <button
            onClick={handleSave}
            className="bg-blue-600 text-white py-2 px-4 mt-2 rounded hover:bg-blue-700 w-full"
          >
            Save as Draft
          </button>
          </div>
        )}

        {imageUrl && (
          <div className="mt-4">
            <img src={imageUrl} alt="Generated" className="rounded-xl shadow" />
          </div>
        )}

      {/* history */}
      {/*
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
      */}

      </main>

  );
}
