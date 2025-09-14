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

    // --- Step 1: Create prediction ---
    let res = await fetch(
      "https://api.replicate.com/v1/models/ideogram-ai/ideogram-v3-turbo/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${replicateKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt: `Generate Instagram content image for: ${prompt}`,
            aspect_ratio: "1:1",
          },
        }),
      }
    );

    let prediction = await res.json();
    if (prediction.error) throw new Error(prediction.error);

    // --- Step 2: Polling (kalau status masih jalan) ---
    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed" &&
      !prediction.output
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // tunggu 2 detik
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        { headers: { Authorization: `Bearer ${replicateKey}` } }
      );
      prediction = await pollRes.json();
    }

    // --- Step 3: Handle result (array/string) ---
    let imageUrl = null;
    if (prediction.output) {
      imageUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;
    }

    if (!imageUrl) throw new Error("Image generation failed: no output URL");

    console.log("✅ Replicate done:", imageUrl);
    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("UNEXPECTED ERROR (image):", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
