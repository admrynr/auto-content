// app/post/update/route.js
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * Expect JSON body: { id: "<uuid>", content: "<new content>", title?: "<new title>" }
 * Returns { post } on success or { error, detail } on failure.
 */
export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Invalid JSON body", e);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, content, title } = body ?? {};

    if (!id) {
      return NextResponse.json({ error: "Missing post id" }, { status: 400 });
    }

    // get authenticated user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      console.error("Auth failed:", userErr);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // fetch the post to ensure it exists & ownership
    const { data: existingPost, error: fetchErr } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr) {
      console.error("Failed fetching post:", fetchErr);
      // if RLS denies access this may be where it fails
      return NextResponse.json({ error: "Post not found or access denied", detail: fetchErr.message }, { status: 404 });
    }

    // ensure ownership if user_id is set
    if (existingPost.user_id && existingPost.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: not the owner" }, { status: 403 });
    }

    // prepare payload
    const updatePayload = {};
    if (typeof content !== "undefined") updatePayload.content = content;
    if (typeof title !== "undefined") updatePayload.title = title;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ message: "Nothing to update", post: existingPost }, { status: 200 });
    }

    // perform update. Do NOT touch history here.
    const { data: updatedPost, error: updateErr } = await supabase
      .from("posts")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("Update error:", updateErr);
      // Common causes: RLS denies update, trigger fails, or DB constraint
      return NextResponse.json(
        { error: "Failed to update post", detail: updateErr.message },
        { status: 500 }
      );
    }

    // success — return updated post (updated_at should be set by DB trigger)
    return NextResponse.json({ message: "Updated", post: updatedPost }, { status: 200 });
  } catch (err) {
    console.error("Unhandled route error:", err);
    return NextResponse.json({ error: "Internal server error", detail: err?.message ?? null }, { status: 500 });
  }
}
