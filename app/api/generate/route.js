import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

// Jika pakai OpenRouter:
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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
    const { niche, description } = await req.json();

    // 1) Dapatkan user dari session (cookie)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

  const imagePrompt = `Generate an image for niche: ${niche}. Additional details: ${description}`;

  // 🔑 ambil API key Replicate dari env
  const replicateKey = process.env.REPLICATE_API_KEY;

  const res = await fetch("https://api.replicate.com/v1/models/ideogram-ai/ideogram-v3-turbo/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${replicateKey}`,
      "Content-Type": "application/json",
      "Prefer": "wait"
    },
    body: JSON.stringify({
      input: { 
        "prompt" : imagePrompt,
        "aspect_ratio": "1:1",
    },
    }),
  });

  const prediction = await res.json();

  // ambil hasil image URL
  const imageUrl = prediction?.output || res;

    // 2) Generate ide via OpenRouter (atau OpenAI)
    const prompt = `Buatkan saya konten pendek untuk caption instagram berbahasa Indonesia yang optimal untuk algoritma instagram, dengan niche : "${niche}". Konteks: "${description}". Lengkapi dengan hastag.`;

    const resp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await resp.json();

    const ideas =
      data?.choices?.[0]?.message?.content || data?.error?.message || "No ideas";

    // 3) Insert ke contents (kena policy RLS → wajib user_id = auth.uid())
    const { error: insertError } = await supabase.from("contents").insert({
      user_id: user.id,
      niche,
      description,
      ideas,
      image_url: imageUrl,
    });

    if (insertError) {
      console.error("SUPABASE INSERT ERROR:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ideas,niche,image_url: imageUrl });
  } catch (err) {
    console.error("UNEXPECTED ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
