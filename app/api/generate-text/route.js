import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

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
    const { prompt } = await req.json();

    // ✅ Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 1) Generate konten (caption)
    const respContent = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Buatkan konten Instagram panjang, informatif, menarik, SEO friendly dan relevan  dengan prompt: "${prompt}". Lengkapi dengan hashtag populer.`,
          },
        ],
      }),
    });

    const dataContent = await respContent.json();
    const content =
      dataContent?.choices?.[0]?.message?.content ||
      dataContent?.error?.message ||
      "No content generated";

    // 2) Generate judul dari konten
    const respTitle = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Buatkan judul singkat, catchy, maksimal 8 kata untuk teks berikut:\n\n${content}`,
          },
        ],
      }),
    });

    const dataTitle = await respTitle.json();
    const title =
      dataTitle?.choices?.[0]?.message?.content ||
      dataTitle?.error?.message ||
      "Untitled";

    return NextResponse.json({ title, content });
  } catch (err) {
    console.error("UNEXPECTED ERROR (text):", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
