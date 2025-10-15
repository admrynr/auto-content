// /app/api/auth/instagram/callback/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // optional fallback user id

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;

    // 1) Exchange code -> access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${process.env.NEXT_PUBLIC_FB_APP_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${process.env.FB_APP_SECRET}&code=${encodeURIComponent(code)}`
    );
    const tokenData = await tokenRes.json();
    console.log("🔑 Token Response:", tokenData);
    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return NextResponse.json({ error: "Failed to get token", details: tokenData }, { status: 400 });
    }
    const userAccessToken = tokenData.access_token;

    // 2) Get Pages the user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`
    );
    const pagesData = await pagesRes.json();
    console.log("📄 Pages Response raw:", pagesData);
    if (pagesData.error) {
      console.error("Pages fetch error:", pagesData.error);
      return NextResponse.json({ error: "Failed to get pages", details: pagesData }, { status: 400 });
    }

    // Normalize pagesData.data to array (handle single-object edge case)
    let pages = [];
    if (Array.isArray(pagesData.data)) {
      pages = pagesData.data;
    } else if (pagesData.data) {
      pages = [pagesData.data];
    } else {
      pages = [];
    }

    console.log("📄 Normalized pages:", pages);

    if (!pages.length) {
      return NextResponse.json({ error: "No connected Facebook Pages" }, { status: 400 });
    }

    // 3) For each page, find instagram_business_account (if exists)
    const igAccounts = [];
    for (const page of pages) {
      try {
        // Some pages responses may not include access_token here; fallback handled below
        console.log("processing page:", page.id, page.name);

        // Query the page object for instagram_business_account
        const igRes = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(page.id)}?fields=instagram_business_account&access_token=${encodeURIComponent(userAccessToken)}`
        );
        const igData = await igRes.json();
        console.log(`📸 IG lookup for Page ${page.name} (${page.id}):`, igData);

        const igUserId = igData?.instagram_business_account?.id;
        if (!igUserId) {
          console.log(`Page ${page.id} has no instagram_business_account, skipping.`);
          continue;
        }

        // Fetch IG details (username, name, profile_picture_url)
        const igDetailRes = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(userAccessToken)}`
        );
        const igDetailData = await igDetailRes.json();
        console.log("📋 IG Detail:", igDetailData);
        if (igDetailData?.error) {
          console.warn("IG detail fetch error, skipping this IG:", igDetailData.error);
          continue;
        }

        // page.access_token is usually present in pages list, but sometimes not.
        // Favor page.access_token (for publishing as page), else fallback to userAccessToken.
        const pageAccessToken = page.access_token || userAccessToken;
        if (!pageAccessToken) {
          console.warn("No pageAccessToken available for page", page.id);
        }

        igAccounts.push({
          page_id: page.id,
          page_name: page.name,
          ig_id: igUserId,
          access_token: pageAccessToken,
          username: igDetailData.username || null,
          name: igDetailData.name || null,
          profile_picture_url: igDetailData.profile_picture_url || null,
        });
      } catch (innerErr) {
        console.error("Error processing page:", page, innerErr);
      }
    }

    console.log("➡️ Collected IG accounts:", igAccounts);

    if (!igAccounts.length) {
      return NextResponse.json({ error: "No IG Business accounts linked via any Page" }, { status: 400 });
    }

    // 4) Determine target user id (session or state fallback)
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const targetUserId = user?.id || state || null;
    if (!targetUserId) {
      console.warn("No session user and no state provided - cannot attach accounts");
      return NextResponse.json({ error: "Not authenticated and no state fallback" }, { status: 401 });
    }
    console.log("Attaching accounts to user:", targetUserId);

    // 5) Upsert using admin client (bypass RLS)
    // Ensure onConflict keys match an actual unique index. If you removed constraint,
    // set onConflict to the index you created (e.g. ['provider','account_id']).
    const rows = igAccounts.map((acc) => ({
      user_id: targetUserId,
      provider: "instagram",
      account_id: acc.ig_id,
      access_token: acc.access_token,
      page_id: acc.page_id,
      page_name: acc.page_name,
      username: acc.username,
      name: acc.name,
      profile_picture_url: acc.profile_picture_url,
      is_active: false,
      updated_at: new Date().toISOString(),
    }));

    try {
      const onConflictKeys = ["provider", "account_id"]; // adjust if your unique index differs
      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from("social_accounts")
        .upsert(rows, { onConflict: onConflictKeys })
        .select();

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        // If upsert fails because no constraint exists, fallback to insert single rows carefully:
        // Try inserting one-by-one ignoring duplicates
        for (const r of rows) {
          try {
            const { error: insErr } = await supabaseAdmin.from("social_accounts").insert(r);
            if (insErr) {
              // log but continue
              console.warn("Insert row error (may be duplicate or constraint):", insErr);
            } else {
              console.log("Inserted row:", r.account_id);
            }
          } catch (ie) {
            console.error("Insert fallback error:", ie);
          }
        }
      } else {
        console.log("✅ Upserted rows:", upsertData?.length ?? rows.length);
      }
    } catch (e) {
      console.error("Unexpected DB upsert error:", e);
    }

    // 6) Done → redirect to success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/success`);
  } catch (err) {
    console.error("💥 Instagram OAuth callback error:", err);
    return NextResponse.json({ error: err.message || "OAuth failed" }, { status: 500 });
  }
}
