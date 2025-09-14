"use client"

import { toast } from "sonner"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Image from "next/image";


export default function DraftsPage() {
  const supabase = createClientComponentClient()
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  

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

  async function handleDelete(id) {
    try{
        const { error } = await supabase.from("posts").delete().eq("id", id)
        if (!error) {
        setDrafts(drafts.filter((d) => d.id !== id))
        }else{
            throw error
        }
        toast.success("Draft berhasil dihapus")
    } catch (err) {
        toast.error(`Gagal hapus draft: ${err.message}`)
    }
    const { error } = await supabase.from("posts").delete().eq("id", id)
    if (!error) {
      setDrafts(drafts.filter((d) => d.id !== id))
    }
  }

  async function handleUpdate(id, newContent) {
    try{
        const { error } = await supabase
        .from("posts")
        .update({ content: newContent })
        .eq("id", id)

        if (!error) {
            setDrafts(
                drafts.map((d) => (d.id === id ? { ...d, content: newContent } : d))
            )
        }
        else {
                throw error
            }
    toast.success("Perubahan tersimpan", { duration: 1500 })
    }catch (err){
        toast.error(`Gagal simpan: ${err.message}`)
    }
  }

  async function handlePublish(draft) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      // --- Step 1: Ambil akun Instagram aktif ---
      const { data: activeAccount, error: accountErr } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (accountErr || !activeAccount) throw new Error("No active Instagram account");

      const igUserId = activeAccount.account_id;
      const accessToken = activeAccount.access_token;

      // --- Step 2: Create media container ---
      const containerRes = await fetch(
        `https://graph.facebook.com/v17.0/${igUserId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: draft.image_url || "https://media.istockphoto.com/id/1055079680/vector/black-linear-photo-camera-like-no-image-available.jpg?s=612x612&w=0&k=20&c=P1DebpeMIAtXj_ZbVsKVvg-duuL0v9DlrOZUvPG6UJk=",
            caption: draft.content,
            access_token: accessToken,
          }),
        }
      );
      const containerData = await containerRes.json();
      if (containerData.error) throw new Error(containerData.error.message);
      const creationId = containerData.id;

      // --- Step 3: Publish media ---
      const publishRes = await fetch(
        `https://graph.facebook.com/v17.0/${igUserId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: accessToken,
          }),
        }
      );
      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);

      // --- Step 4: Update post status ---
      const { error: updateError } = await supabase
        .from("posts")
        .update({ status: "published" })
        .eq("id", draft.id);
      if (updateError) throw updateError;

      // --- Step 5: Insert ke history ---
      const { error: historyError } = await supabase.from("history").insert({
        user_id: user.id,
        post_id: draft.id,
        status: "success",
        message:
          draft.status === "published"
            ? `Republished to Instagram (Post ID: ${publishData.id})`
            : `Published to Instagram (Post ID: ${publishData.id})`,
      });
      if (historyError) throw historyError;

      // --- Step 6: Toast feedback ---
      toast.success(
        draft.status === "published"
          ? "Draft berhasil direpublish ke Instagram!"
          : "Draft berhasil dipublish ke Instagram!"
      );

      fetchDrafts(); // refresh data
    } catch (err) {
      console.error("Publish error:", err);

      await supabase.from("history").insert({
        user_id: user?.id ?? null,
        post_id: draft.id,
        status: "failed",
        message: err.message,
      });

      toast.error(`Gagal publish: ${err.message}`);
    }
  }



  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Draft Manager</h1>

      {loading && <p>Loading drafts...</p>}

      {!loading && drafts.length === 0 && (
        <p className="text-gray-500">Belum ada draft. Yuk buat di halaman Generate!</p>
      )}

      <div className="space-y-4">
        {drafts.map((draft) => (
          <div
          key={draft.id}
          className="border rounded-lg p-4 shadow-sm flex flex-col"
          >
            <div className="border rounded-lg border rounded-lg mb-4">
              <img
                src={draft.image_url || "https://media.istockphoto.com/id/1055079680/vector/black-linear-photo-camera-like-no-image-available.jpg?s=612x612&w=0&k=20&c=P1DebpeMIAtXj_ZbVsKVvg-duuL0v9DlrOZUvPG6UJk="}
                width={500}
                height={500}
                alt="Picture of the author"
              />
            </div>
            <textarea
            defaultValue={draft.content}
            onBlur={(e) => handleUpdate(draft.id, e.target.value)}
            className="w-full min-h-[240px] p-2 border rounded"
            />

            <div className="flex justify-between mt-6">
                <div className="flex flex-col space-y-2">
                  <p className="text-xs text-gray-500">
                      Last updated: {new Date(draft.updated_at || draft.created_at).toLocaleString()}
                  </p>
                  {/* 🔹 Badge status */}
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
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                  {draft.status === "published" ? "Republish" : "Publish"}
                  </button>
                  <button
                  onClick={() => handleDelete(draft.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                  Delete
                  </button>
                </div>
                
            </div>
          </div>

        ))}
      </div>
    </main>
  )
}
