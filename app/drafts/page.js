"use client"

import { toast } from "sonner"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function DraftsPage() {
  const supabase = createClientComponentClient()
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false) // 🔹 loader publish state
  const [publishingDraftId, setPublishingDraftId] = useState(null)
  const [updatingDraftId, setUpdatingDraftId] = useState(null)


  useEffect(() => {
    fetchDrafts()
  }, [])

  async function fetchDrafts() {
    setLoading(true)
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) console.error(error)
    else setDrafts(data || [])
    setLoading(false)
  }

  // client handleUpdate (snippet to use inside your component)
  async function handleUpdate(id, newContent) {
    // optimistic: simpan lama dulu
    const currentDraft = drafts.find(d => d.id === id);
    if (!currentDraft) {
      toast.error("Draft tidak ditemukan");
      return;
    }
    if ((currentDraft.content || "").trim() === (newContent || "").trim()) return;

    const prevContent = currentDraft.content;
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, content: newContent, updated_at: new Date().toISOString() } : d));
    setUpdatingDraftId(id);

    try {
      const res = await fetch("/api/post/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content: newContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Gagal update");
      }

      // if server returned updated post, sync it (so updated_at, etc. are accurate)
      if (data.post) {
        setDrafts(prev => prev.map(d => (d.id === id ? data.post : d)));
      }

      toast.success("Draft berhasil diperbarui.");
    } catch (err) {
      console.error("Update error:", err);
      setDrafts(prev => prev.map(d => (d.id === id ? { ...d, content: prevContent } : d)));
      toast.error(`Gagal memperbarui draft: ${err.message ?? err}`);
    } finally {
      setUpdatingDraftId(null);
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch("/api/post/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");

      toast.success("Draft berhasil dihapus", {duration:1000});
      fetchDrafts(); // refresh list
    } catch (err) {
      console.error(err);
      toast.error(`Gagal menghapus: ${err.message}`);
    }
  }

  // di dalam DraftsPage component (client)
  async function handlePublish(draft) {
    setPublishing(true);
    setPublishingDraftId(draft.id);

    try {
      // optional: quick client-side check user logged in (nicer UX)
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        toast.error("Kamu belum login.");
        return;
      }

      const res = await fetch("/api/post/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: draft.id }),
      });

      // if not ok, try read raw text for debugging
      if (!res.ok) {
        const raw = await res.text();
        console.error("Publish endpoint returned not-ok raw response:", raw);
        // parse json if possible
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.error) {
            toast.error(`Gagal publish: ${parsed.error}${parsed.detail ? " — " + JSON.stringify(parsed.detail) : ""}`);
          } else {
            toast.error(`Gagal publish: Server responded ${res.status}`);
          }
        } catch {
          toast.error(`Gagal publish: Server responded ${res.status}`);
        }
        return;
      }

      const data = await res.json();

      if (data?.error) {
        toast.error(`Gagal publish: ${data.error}${data.detail ? " — " + JSON.stringify(data.detail) : ""}`);
      } else {
        // success: update local state to match
        setDrafts((prev) =>
          prev.map((d) => (d.id === draft.id ? { ...d, status: data.post?.status ?? "published" } : d))
        );
        toast.success("Draft berhasil dipublish ke Instagram!", { duration: 1000 });
      }
    } catch (err) {
      console.error("handlePublish error:", err);
      toast.error(`Gagal publish: ${err?.message ?? String(err)}`);
    } finally {
      setPublishing(false);
      setPublishingDraftId(null);
      await fetchDrafts();
    }
  }

  async function handleGenerateVideo(draft) {
    try {
      toast.loading("⏳ Generating video... please wait");

      const res = await fetch("/api/post/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: draft.image_url,
          postId: draft.id,
          duration: 5,
        }),
      });

      const data = await res.json();
      toast.dismiss();

      if (!res.ok) throw new Error(data.error || "Video generation failed");

      toast.success("✅ Video berhasil dibuat dan disimpan!");

      // Refresh list
      fetchDrafts();
    } catch (err) {
      toast.dismiss();
      toast.error(`Gagal generate video: ${err.message}`);
    }
  }


  function confirmDeleteDraft(draftId) {
    toast(
      (t) => (
        <div className="flex flex-col space-y-3">
          <p className="text-sm">Yakin ingin menghapus draft ini?</p>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                handleDelete(draftId);
                toast.dismiss(t);
              }}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm"
            >
              Hapus
            </button>
            <button
              onClick={() => toast.dismiss(t)}
              className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6 relative">
      <h1 className="text-2xl font-bold mb-6">Draft Manager</h1>

      {loading && <p>Loading drafts...</p>}

      {!loading && drafts.length === 0 && (
        <p className="text-gray-500">Belum ada draft. Yuk buat di halaman Generate!</p>
      )}

      <div className="space-y-4">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="border rounded-lg p-4 shadow-sm flex flex-col relative"
          >
            <div className="border rounded-lg mb-4">
              { draft.video_url ?
                (
                  <video controls preload="none"
                  src={draft.video_url}
                  autoPlay
                  loop
                  className="shadow-md w-full max-w-lg mx-auto">
                    Your browser does not support the video tag.
                  </video>
                ) :
                (
                  <img
                    src={
                      draft.image_url ||
                      "https://media.istockphoto.com/id/1055079680/vector/black-linear-photo-camera-like-no-image-available.jpg"
                    }
                    width={500}
                    height={500}
                    alt="Generated draft"
                  /> 
                )  
              }
            </div>

            <textarea
              defaultValue={draft.content}
              onBlur={(e) => handleUpdate(draft.id, e.target.value)}
              className="w-full min-h-[240px] p-2 border rounded"
            />

            <div className="flex justify-between mt-6">
              <div className="flex flex-col space-y-2">
                <p className="text-xs text-gray-500">
                  Last updated:{" "}
                  {new Date(
                    draft.updated_at || draft.created_at
                  ).toLocaleString()}
                </p>
                <div className="flex-none">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                      draft.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {draft.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
              <div className="pt-4 flex flex-row space-x-2">
                <button
                  onClick={() => handlePublish(draft)}
                  disabled={publishing && publishingDraftId === draft.id}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {publishing && publishingDraftId === draft.id
                    ? "Publishing..."
                    : draft.status === "published"
                    ? "Republish"
                    : "Publish"}
                </button>
                <button
                  onClick={() => confirmDeleteDraft(draft.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleGenerateVideo(draft)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Generate Video
                </button>

              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔹 Fullscreen Loader Overlay */}
      {publishing && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white text-lg font-semibold animate-pulse">
            Publishing to Instagram...
          </p>
        </div>
      )}
    </main>
  )
}
