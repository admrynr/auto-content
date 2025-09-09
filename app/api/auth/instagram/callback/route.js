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
    // Step 1: Tukar code dengan access_token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${process.env.NEXT_PUBLIC_FB_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback&client_secret=${process.env.FB_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    const accessToken = tokenData.access_token;

    // Step 2: Ambil akun Instagram Business user
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`
    );
    const pages = await pagesRes.json();

    const igPageId = pages?.data?.[0]?.id;
    if (!igPageId) {
      return NextResponse.json(
        { error: "No connected Facebook Page / Instagram Business account" },
        { status: 400 }
      );
    }

    const igRes = await fetch(
      `https://graph.facebook.com/v20.0/${igPageId}?fields=instagram_business_account&access_token=${accessToken}`
    );
    const igData = await igRes.json();
    const igUserId = igData?.instagram_business_account?.id;

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

    await supabase.from("social_accounts").insert({
      user_id: user.id,
      provider: "instagram",
      access_token: accessToken,
      account_id: igUserId,
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile`);
  } catch (err) {
    console.error("Instagram OAuth error:", err);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}
