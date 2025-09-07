"use client"

import { toast } from "sonner"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

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
    } = await supabase.auth.getUser()
    try {
        // update status jadi published
        const { error: updateError } = await supabase
        .from("posts")
        .update({ status: "published" })
        .eq("id", draft.id)

        if (updateError) throw updateError

        // bikin log history
        const { error: historyError } = await supabase.from("history").insert({
        user_id: user.id,
        post_id: draft.id,
        status: "success",
        message: draft.status === "published" 
            ? "Republished draft (dummy)"
            : "Published draft (dummy)"
        })

        if (historyError) throw historyError

        toast.success(
        draft.status === "published"
            ? "Draft berhasil direpublish!"
            : "Draft berhasil dipublish!"
        )

        fetchDrafts() // refresh data
    } catch (err) {
        console.error("Publish error:", err)
        await supabase.from("history").insert({
        post_id: draft.id,
        status: "failed",
        message: err.message
        })
        toast.error(`Gagal publish: ${err.message}`)
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
            className="border rounded-lg p-4 shadow-sm flex justify-between items-start"
            >
            <div className="flex-auto pr-2">
                <textarea
                defaultValue={draft.content}
                onBlur={(e) => handleUpdate(draft.id, e.target.value)}
                className="w-full min-h-[120px] p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-2">
                    Last updated: {new Date(draft.updated_at || draft.created_at).toLocaleString()}
                </p>

                {/* 🔹 Badge status */}
                <span
                className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded ${
                    draft.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-700"
                }`}
                >
                {draft.status === "published" ? "Published" : "Draft"}
                </span>
            </div>

            <div className="flex space-x-2">
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

        ))}
      </div>
    </main>
  )
}
