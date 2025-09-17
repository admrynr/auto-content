import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

// ⚡ Admin client pakai service role key (bisa bypass RLS untuk storage & insert)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  console.log("📥 /api/post/save called");

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    const { prompt, title, content, imageUrl } = await req.json();
    console.log("📦 Request body:", { prompt, title, content, imageUrl });

    // 🔑 Dapatkan user dari session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let finalImageUrl = imageUrl;

    // === 1. Kalau ada imageUrl dari Replicate, kita simpan ke Supabase Storage ===
    if (imageUrl) {
      console.log("⬇️ Fetching image from Replicate:", imageUrl);

      const imageRes = await fetch(imageUrl);
      const buffer = Buffer.from(await imageRes.arrayBuffer());

      const filePath = `${user.id}/${Date.now()}.png`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("generated-images") // bucket kamu
        .upload(filePath, buffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      // ✅ Dapatkan public URL
      const { data: publicData } = supabaseAdmin.storage
        .from("generated-images")
        .getPublicUrl(filePath);

      finalImageUrl = publicData.publicUrl;
      console.log("✅ Saved image to Supabase Storage:", finalImageUrl);
    }

    // === 2. Simpan ke tabel posts ===
    const { error: insertError } = await supabaseAdmin.from("posts").insert({
      user_id: user.id,
      prompt,
      title,
      content,
      image_url: finalImageUrl || null,
      status: "draft",
    });

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log("✅ Draft saved for user:", user.id);

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
    });
  } catch (err) {
    console.error("💥 Server error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
