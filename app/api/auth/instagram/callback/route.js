// app/api/auth/instagram/callback/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    console.error("⚠️ Missing code in callback URL");
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const redirectUri = process.env.NEXT_PUBLIC_FB_REDIRECT_URI;

  try {
    // Step 1: Tukar code dengan access_token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${process.env.NEXT_PUBLIC_FB_APP_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${process.env.FB_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    console.log("🔑 Token Response:", tokenData);

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to get access token", details: tokenData },
        { status: 400 }
      );
    }

    // Step 2: Ambil akun Facebook Pages via Business Manager
    const bizRes = await fetch(
      `https://graph.facebook.com/v20.0/me/businesses?access_token=${accessToken}`
    );
    const bizData = await bizRes.json();
    console.log("🏢 Businesses Response:", bizData);

    let igUserId = null;

    if (bizData?.data?.length) {
      const businessId = bizData.data[0].id;

      // Ambil pages yang dimiliki business
      const pagesRes = await fetch(
        `https://graph.facebook.com/v20.0/${businessId}/owned_pages?access_token=${accessToken}`
      );
      const pagesData = await pagesRes.json();
      console.log("📄 Pages Response:", pagesData);

      if (pagesData?.data?.length) {
        const pageId = pagesData.data[0].id;

        // Ambil IG Business Account dari page
        const igRes = await fetch(
          `https://graph.facebook.com/v20.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
        );
        const igData = await igRes.json();
        console.log("📸 IG Business Account Response:", igData);

        igUserId = igData?.instagram_business_account?.id;
      }
    }

    if (!igUserId) {
      return NextResponse.json(
        { error: "No Instagram Business account linked" },
        { status: 400 }
      );
    }

    // Step 3: Simpan ke Supabase
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error: insertError } = await supabase
      .from("social_accounts")
      .insert({
        user_id: user.id,
        provider: "instagram",
        access_token: accessToken,
        account_id: igUserId,
      });

    if (insertError) {
      console.error("❌ Supabase Insert Error:", insertError);
    } else {
      console.log("✅ Saved Instagram account for user:", user.id);
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile`);
  } catch (err) {
    console.error("💥 Instagram OAuth error:", err);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}
