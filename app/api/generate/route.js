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

    // 2) Generate ide via OpenRouter (atau OpenAI)
    const prompt = `Generate 5 short content ideas (titles only) for "${niche}". Context: "${description}". Numbered list.`;

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
    });

    if (insertError) {
      console.error("SUPABASE INSERT ERROR:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ideas });
  } catch (err) {
    console.error("UNEXPECTED ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
