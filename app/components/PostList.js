"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function PostList() {
  const supabase = createClientComponentClient()
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState(null)

  async function fetchPosts() {
    const {
      data,
      error,
    } = await supabase
      .from("posts")
      .select("id, title, content, created_at, user_id")
      .eq("user_id", user?.id) // hanya ambil post user ini
      .order("created_at", { ascending: false })

    if (!error) setPosts(data)
  }

  useEffect(() => {
    // ambil user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) fetchPosts()
    })
  }, [])

  async function handleDelete(id) {
    if (!confirm("Yakin mau hapus draft ini?")) return
    const { error } = await supabase.from("posts").delete().eq("id", id)
    if (!error) fetchPosts()
  }

  async function handleEdit(id, oldTitle, oldContent) {
    const newTitle = prompt("Edit judul:", oldTitle)
    if (newTitle === null) return
    const newContent = prompt("Edit konten:", oldContent)
    if (newContent === null) return

    const { error } = await supabase
      .from("posts")
      .update({ title: newTitle, content: newContent })
      .eq("id", id)

    if (!error) fetchPosts()
  }

  return (
    <div className="space-y-4 mt-6">
      {posts.length === 0 && (
        <p className="text-gray-500 text-center">Belum ada draft post</p>
      )}
      {posts.map((post) => (
        <div key={post.id} className="p-4 border rounded-xl bg-white shadow-sm">
          <h3 className="text-lg font-semibold">{post.title}</h3>
          <p className="text-gray-700">{post.content}</p>
          <p className="text-sm text-gray-500 mt-2">
            Draft dibuat {new Date(post.created_at).toLocaleString()}
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleEdit(post.id, post.title, post.content)}
              className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(post.id)}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
            {/* Tombol ini nanti buat integrasi IG */}
            <button
              onClick={() => alert("Soon: publish ke Instagram")}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Publish
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
