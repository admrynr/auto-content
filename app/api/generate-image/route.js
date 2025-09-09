import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient(
    { cookies: () => cookieStore },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_KEY,
    }
  );

  try {
    const { prompt } = await req.json();

    // ✅ Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 🔑 Replicate API key
    const replicateKey = process.env.REPLICATE_API_KEY;

    const res = await fetch(
      "https://api.replicate.com/v1/models/ideogram-ai/ideogram-v3-turbo/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${replicateKey}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt: `Generate Instagram content image for: ${prompt}`,
            aspect_ratio: "1:1",
          },
        }),
      }
    );

    const prediction = await res.json();
    const imageUrl = prediction?.output?.[0] || null;

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("UNEXPECTED ERROR (image):", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
