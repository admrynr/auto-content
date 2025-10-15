// app/api/post/publish/route.js
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const GRAPH_VERSION = "v17.0";
const GRAPH_BASE = "https://graph.facebook.com";

async function createMediaContainer(igUserId, accessToken, { image_url, caption }) {
  const res = await fetch(`${GRAPH_BASE}/${GRAPH_VERSION}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url, caption, access_token: accessToken }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  if (!json.id) throw new Error("Missing creation id");
  return json.id;
}

async function getContainerStatus(creationId, accessToken) {
  const res = await fetch(
    `${GRAPH_BASE}/${GRAPH_VERSION}/${creationId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`
  );
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json;
}

async function publishMedia(igUserId, creationId, accessToken) {
  const res = await fetch(`${GRAPH_BASE}/${GRAPH_VERSION}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json;
}

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { post_id } = body ?? {};
    if (!post_id) return NextResponse.json({ error: "Missing post_id" }, { status: 400 });

    // auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // fetch post
    const { data: post, error: postErr } = await supabase
      .from("posts")
      .select("*")
      .eq("id", post_id)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: "Post not found", detail: postErr?.message ?? null }, { status: 404 });
    }

    if (post.user_id && post.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: not the owner" }, { status: 403 });
    }

    // get active IG account
    const { data: activeAccount, error: accountErr } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (accountErr || !activeAccount) {
      return NextResponse.json({ error: "No active Instagram account", detail: accountErr?.message ?? null }, { status: 400 });
    }

    const igUserId = activeAccount.account_id ?? activeAccount.instagram_id ?? activeAccount.instagramUserId;
    const accessToken = activeAccount.access_token;
    if (!igUserId || !accessToken) {
      return NextResponse.json({ error: "Invalid social account data" }, { status: 400 });
    }

    // quick check image accessibility
    if (post.image_url) {
      try {
        const head = await fetch(post.image_url, { method: "HEAD" });
        if (!head.ok) {
          const get = await fetch(post.image_url, { method: "GET" });
          if (!get.ok) throw new Error(`Image URL returned ${get.status}`);
        }
      } catch (err) {
        // best-effort history insert
        try {
          await supabase.from("history").insert({
            user_id: user.id,
            post_id: post.id,
            status: "failed",
            message: `Image not accessible by FB: ${err.message}`,
          });
        } catch (e) {
          console.warn("Failed to write history (image accessibility):", e);
        }
        return NextResponse.json({ error: "Image URL not accessible", detail: err.message }, { status: 400 });
      }
    }

    // create media container
    let creationId;
    try {
      creationId = await createMediaContainer(igUserId, accessToken, {
        image_url: post.image_url,
        caption: post.content || post.title || "",
      });
    } catch (err) {
      try {
        await supabase.from("history").insert({
          user_id: user.id,
          post_id: post.id,
          status: "failed",
          message: `Create container failed: ${err.message}`,
        });
      } catch (e) {
        console.warn("Failed to write history (create container):", e);
      }
      return NextResponse.json({ error: "Create container failed", detail: err.message }, { status: 500 });
    }

    // poll for readiness (exponential backoff)
    const maxAttempts = 12;
    let attempt = 0;
    let delay = 1000;
    let publishResult = null;
    let lastStatus = null;

    while (attempt < maxAttempts) {
      attempt++;
      await new Promise((r) => setTimeout(r, delay));

      try {
        const statusResp = await getContainerStatus(creationId, accessToken);
        lastStatus = statusResp;
        const statusCode = (statusResp && (statusResp.status_code || (statusResp.status && statusResp.status.code))) || null;

        if (statusCode && statusCode.toString().toUpperCase() === "FINISHED") {
          publishResult = await publishMedia(igUserId, creationId, accessToken);
          break;
        }

        if (!statusCode) {
          try {
            publishResult = await publishMedia(igUserId, creationId, accessToken);
            break;
          } catch (pubErr) {
            console.warn("Publish attempt failed (not ready), will retry:", pubErr.message ?? pubErr);
          }
        }
      } catch (err) {
        console.warn("Error checking container status:", err?.message ?? err);
      }

      delay = Math.round(delay * 1.7);
    }

    if (!publishResult) {
      try {
        await supabase.from("history").insert({
          user_id: user.id,
          post_id: post.id,
          status: "failed",
          message: "Media container not ready in time (Media ID is not available). Last status: " + JSON.stringify(lastStatus),
        });
      } catch (e) {
        console.warn("Failed to write history (container timeout):", e);
      }
      return NextResponse.json({
        error: "Media container not ready in time (Media ID is not available).",
        detail: lastStatus,
      }, { status: 500 });
    }

    // update post status
    const { error: updateErr, data: updatedPost } = await supabase
      .from("posts")
      .update({ status: "published" })
      .eq("id", post.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({
        message: "Published on Instagram but failed to update DB status",
        publishResult,
        detail: updateErr.message,
      }, { status: 500 });
    }

    // insert success history (best-effort)
    try {
      await supabase.from("history").insert({
        user_id: user.id,
        post_id: post.id,
        status: "success",
        message: `Published (IG post id: ${publishResult.id ?? publishResult.post_id ?? "unknown"})`,
      });
    } catch (e) {
      console.warn("Failed to write history (success):", e);
    }

    return NextResponse.json({
      message: "Published",
      publishResult,
      post: updatedPost,
    }, { status: 200 });
  } catch (err) {
    console.error("Unhandled publish route error:", err);
    return NextResponse.json({ error: "Internal server error", detail: err?.message ?? null }, { status: 500 });
  }
}
