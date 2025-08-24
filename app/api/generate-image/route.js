// app/api/generate-image/route.js
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { niche, description } = await req.json();
  const prompt = `Generate an image for niche: ${niche}. Additional details: ${description}`;

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
        "prompt" : prompt,
        "aspect_ratio": "1:1",
    },
    }),
  });

  const prediction = await res.json();

  // ambil hasil image URL
  const imageUrl = prediction?.output || res;

  // simpan ke Supabase
  const { error } = await supabase.from("contents").insert({
    user_id: user.id,
    niche,
    description,
    ideas: null,
    image_url: imageUrl,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ image_url: imageUrl });
}
