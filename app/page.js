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
  const [prompt, setPrompt] = useState("");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loadingText, setLoadingText] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");


  const handleGenerateText = async (e) => {
    e.preventDefault();
    setLoadingText(true)

    const { data: { user } } = await supabase.auth.getUser();

    const canGenerate = await checkDailyLimit(user.id, "text_and_image_generate");
    if (!canGenerate) {
      toast.warning("Limit harian generate konten sudah tercapai!");
      return;
    }

    console.log(user.id)

    console.log("Form submitted:", { title, content });

    try {
      setLoadingText(true)
      setContent("")
      setTitle("")

      const res = await fetch("/api/generate-text", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      setContent(data.content)
      setTitle(data.title)
      toast.success("Success Generate Text")
    } catch (err) {
      toast.error("Error generating text:", err)
    } finally {
      setLoadingText(false)
    }

      // ... setelah proses generate sukses:
      const resLog = await logUsage(user.id, "text_and_image_generate"); // atau "text_generate"
      if (!resLog.ok) {
        // bebas: pakai toast, alert, atau UI message
        toast.error(`Gagal mencatat log: ${resLog.error.message}`);
        // proses utama tetap lanjut — jangan diblokir
      }

  };

  const handleGenerateImage = async () => {
    try {
      setLoadingImage(true)
      setImageUrl("")

      const res = await fetch("/api/generate-image", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      setImageUrl(data.imageUrl)
      toast.success("Success Generate Image")
    } catch (err) {
      toast.error("Error generating image:", err)
    } finally {
      setLoadingImage(false)
    }
  }

  // Save draft (simpan ke Supabase via API route)
  const handleSave = async () => {
    try {
      const res = await fetch("/api/post/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          title,
          content,
          imageUrl, // kirim hasil generate image (nanti disimpan ke storage di server)
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(`Error saving draft: ${data.error}`);
        return;
      }

      toast.success("✅ Draft berhasil disimpan!");
      console.log("Saved draft:", data);
    } catch (err) {
      console.error("❌ Error saving draft:", err);
      toast.error("Error saving draft");
    }
  };



  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Generate Konten</h1>

      {/* Input prompt */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Tulis ide atau tema konten..."
        className="w-full p-2 border rounded mb-4"
      />

      {/* Tombol generate teks */}
      <button
        onClick={handleGenerateText}
        disabled={loadingText || !prompt}
        className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
      >
        {loadingText ? "Loading..." : "Generate Teks"}
      </button>

      {/* Generate image hanya aktif kalau ada teks */}
      {content && (
        <button
          onClick={handleGenerateImage}
          disabled={loadingImage}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {loadingImage ? "Loading..." : "Generate Image"}
        </button>
      )}

      {/* Hasil judul */}
      {title && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Judul:</h2>
          <p className="p-2 border rounded bg-gray-50">{title}</p>
        </div>
      )}

      {/* Hasil konten */}
      {content && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Hasil Teks:</h2>
          <p className="p-2 border rounded bg-gray-50 whitespace-pre-line">
            {content}
          </p>
        </div>
      )}

      {/* Hasil image */}
      {imageUrl && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Hasil Gambar:</h2>
          <img src={imageUrl} alt="Generated" className="rounded-lg shadow" />
        </div>
      )}

      {/* Save draft */}
      {(title || content || imageUrl) && (
        <button
          onClick={handleSave}
          className="mt-6 bg-purple-600 text-white px-4 py-2 rounded"
        >
          Save as Draft
        </button>
      )}
    </main>
  )
}
