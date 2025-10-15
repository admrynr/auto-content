// app/post/delete/route.js
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing post id" },
        { status: 400 }
      );
    }

    // Cek user login
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Cek dulu apakah postnya ada dan milik user ini
    const { data: existingPost, error: fetchErr } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr) {
      console.error("Failed fetching post:", fetchErr);
      return NextResponse.json(
        { error: "Post not found or access denied" },
        { status: 404 }
      );
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: not the owner" },
        { status: 403 }
      );
    }

    // Hapus
    const { error: deleteErr } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      console.error("Delete error:", deleteErr);
      return NextResponse.json(
        { error: "Failed to delete post", detail: deleteErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Post deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unhandled route error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
