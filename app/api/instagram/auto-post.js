import { supabase } from "@/lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // 1. Ambil user ID dari body (atau session auth kalau sudah pakai supabase auth-helpers)
    const { user } = req.body;
    if (!user?.id) return res.status(401).json({ error: "User not authenticated" });

    // 2. Ambil akun Instagram aktif user
    const { data: activeAccount, error: accountErr } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (accountErr || !activeAccount) return res.status(404).json({ error: "No active Instagram account" });

    const igUserId = activeAccount.instagram_id;
    const accessToken = activeAccount.access_token;

    // 3. Ambil draft post
    const { data: draftPosts, error: postErr } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "draft");

    if (postErr || !draftPosts || draftPosts.length === 0) {
      return res.status(404).json({ error: "No draft posts found" });
    }

    const results = [];

    for (const post of draftPosts) {
      try {
        // 4a. Create media container
        const containerRes = await fetch(
          `https://graph.facebook.com/v17.0/${igUserId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_url: post.image_url,
              caption: post.content,
              access_token: accessToken,
            }),
          }
        );
        const containerData = await containerRes.json();
        if (containerData.error) throw new Error(JSON.stringify(containerData.error));

        const creationId = containerData.id;

        // 4b. Publish media
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
        if (publishData.error) throw new Error(JSON.stringify(publishData.error));

        // 5a. Update post status → posted
        await supabase.from("posts").update({ status: "posted" }).eq("id", post.id);

        // 5b. Insert history → success
        await supabase.from("history").insert({
          user_id: user.id,
          post_id: post.id,
          status: "success",
          message: `Posted successfully: ${publishData.id}`,
        });

        results.push({ post_id: post.id, status: "success", message: publishData.id });
      } catch (err) {
        // 6. Insert history → failed
        await supabase.from("history").insert({
          user_id: user.id,
          post_id: post.id,
          status: "failed",
          message: err.message,
        });

        results.push({ post_id: post.id, status: "failed", message: err.message });
      }
    }

    res.status(200).json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
