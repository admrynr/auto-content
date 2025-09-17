"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { checkDailyLimit, logUsage } from "../lib/checkLimit";
import { toast } from "sonner";

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
  const [loadingSave, setLoadingSave] = useState(false); // ✅ loader untuk save
  const [imageUrl, setImageUrl] = useState("");

  const handleGenerateText = async (e) => {
    e.preventDefault();
    setLoadingText(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const canGenerate = await checkDailyLimit(user.id, "text_and_image_generate");
    if (!canGenerate) {
      toast.warning("Limit harian generate konten sudah tercapai!");
      return;
    }

    try {
      setContent("");
      setTitle("");

      const res = await fetch("/api/generate-text", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setContent(data.content);
      setTitle(data.title);
      toast.success("Success Generate Text");
    } catch (err) {
      toast.error("Error generating text:", err);
    } finally {
      setLoadingText(false);
    }

    // log usage
    const resLog = await logUsage(user.id, "text_and_image_generate");
    if (!resLog.ok) {
      toast.error(`Gagal mencatat log: ${resLog.error.message}`);
    }
  };

  const handleGenerateImage = async () => {
    try {
      setLoadingImage(true);
      setImageUrl("");

      const res = await fetch("/api/generate-image", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setImageUrl(data.imageUrl);
      toast.success("Success Generate Image");
    } catch (err) {
      toast.error("Error generating image:", err);
    } finally {
      setLoadingImage(false);
    }
  };

  // Save draft
  const handleSave = async () => {
    try {
      setLoadingSave(true); // ✅ mulai loading
      const res = await fetch("/api/post/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          title,
          content,
          imageUrl,
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
    } finally {
      setLoadingSave(false); // ✅ stop loading
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Generate Konten</h1>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Tulis ide atau tema konten..."
        className="w-full p-2 border rounded mb-4"
      />

      <button
        onClick={handleGenerateText}
        disabled={loadingText || !prompt}
        className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
      >
        {loadingText ? "⏳ Loading..." : "Generate Teks"}
      </button>

      {content && (
        <button
          onClick={handleGenerateImage}
          disabled={loadingImage}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {loadingImage ? "⏳ Loading..." : "Generate Image"}
        </button>
      )}

      {title && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Judul:</h2>
          <p className="p-2 border rounded bg-gray-50">{title}</p>
        </div>
      )}

      {content && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Hasil Teks:</h2>
          <p className="p-2 border rounded bg-gray-50 whitespace-pre-line">
            {content}
          </p>
        </div>
      )}

      {imageUrl && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Hasil Gambar:</h2>
          <img src={imageUrl} alt="Generated" className="rounded-lg shadow" />
        </div>
      )}

      {(title || content || imageUrl) && (
        <button
          onClick={handleSave}
          disabled={loadingSave}
          className="mt-6 bg-purple-600 text-white px-4 py-2 rounded"
        >
          {loadingSave ? "💾 Saving..." : "Save as Draft"}
        </button>
      )}
    </main>
  );
}
