"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function PostForm({ onPostCreated }) {
  const supabase = createClientComponentClient()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("You must be logged in to post")
      setLoading(false)
      return
    }

    const { error } = await supabase.from("posts").insert({
      title,
      content,
      user_id: user.id,
    })

    if (error) {
      console.error(error)
      alert("Failed to create post")
    } else {
      setTitle("")
      setContent("")
      if (onPostCreated) onPostCreated()
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-xl bg-gray-50">
      <input
        type="text"
        placeholder="Title"
        className="w-full border rounded-lg px-3 py-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Write something..."
        className="w-full border rounded-lg px-3 py-2"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Posting..." : "Post"}
      </button>
    </form>
  )
}
