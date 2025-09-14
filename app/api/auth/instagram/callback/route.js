// /api/auth/instagram/callback/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    // 1. Tukar code dengan access_token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${process.env.NEXT_PUBLIC_FB_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback&client_secret=${process.env.FB_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    console.log("🔑 Token Response:", tokenData);

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: "Failed to get token", details: tokenData }, { status: 400 });
    }

    // 2. Ambil semua Pages user
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();
    console.log("📄 Pages Response:", pagesData);

    if (!pagesData?.data?.length) {
      return NextResponse.json({ error: "No connected Facebook Pages" }, { status: 400 });
    }

    // 3. Untuk setiap page, ambil IG business account
    const igAccounts = [];
    for (const page of pagesData.data) {
      const igRes = await fetch(
        `https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
      );
      const igData = await igRes.json();
      console.log(`📸 IG for Page ${page.name}:`, igData);

      const igUserId = igData?.instagram_business_account?.id;
      if (!igUserId) continue;

      // Ambil detail IG
      const igDetailRes = await fetch(
        `https://graph.facebook.com/v20.0/${igUserId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
      );
      const igDetailData = await igDetailRes.json();
      console.log("📋 IG Detail:", igDetailData);

      if (igDetailData?.error) continue;

      if (igData.instagram_business_account?.id) {
        igAccounts.push({
          page_id: page.id,
          page_name: page.name,
          ig_id: igData.instagram_business_account.id,
          access_token: page.access_token, // lebih baik simpan page access token
          username: igDetailData.username,
          name: igDetailData.name,
          profile_picture_url: igDetailData.profile_picture_url,
        });
      }
    }

    if (!igAccounts.length) {
      return NextResponse.json({ error: "No IG Business accounts linked" }, { status: 400 });
    }

    // 4. Simpan semua akun IG ke Supabase
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Insert multiple IG accounts
    const { error: insertError } = await supabase.from("social_accounts").insert(
      igAccounts.map((acc) => ({
        user_id: user.id,
        provider: "instagram",
        account_id: acc.ig_id,
        access_token: acc.access_token,
        page_id: acc.page_id,
        page_name: acc.page_name,
        username: acc.username,
        name: acc.name,
        profile_picture_url: acc.profile_picture_url
      }))
    );

    if (insertError) {
      console.error("❌ Supabase Insert Error:", insertError);
    } else {
      console.log("✅ Saved IG accounts for user:", user.id);
    }

    // 5. Redirect ke profile → nanti user pilih mau pakai akun yang mana
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/success`);
  } catch (err) {
    console.error("💥 Instagram OAuth error:", err);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}
