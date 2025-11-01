// app/api/post/video/route.js
import Replicate from "replicate";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // penting: service role key, bukan anon
);

export async function POST(req) {
  try {
    const { imageUrl, postId, duration = 5 } = await req.json();

    if (!imageUrl || !postId) {
      return NextResponse.json(
        { error: "imageUrl and postId are required" },
        { status: 400 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
    });

    // 🔹 Step 1: Jalankan model WAN 2.2 I2V Fast
    const prediction = await replicate.predictions.create({
      model: "wan-video/wan-2.2-i2v-fast",
      input: {
        image: imageUrl,
        frames_per_second: 8,
        resolution: "480p",
        prompt: "natural cinematic movement",
      },
    });

    // --- Step 2: Polling hasil
    let result = prediction;
    const maxTries = 40;
    let tries = 0;

    while (
      (result.status === "starting" || result.status === "processing") &&
      tries < maxTries
    ) {
      await new Promise((r) => setTimeout(r, 2000));
      result = await replicate.predictions.get(result.id);
      tries++;
    }

    if (result.status !== "succeeded" || !result.output) {
      console.error("Failed prediction:", result);
      return NextResponse.json(
        { error: "Video generation failed", detail: result.error },
        { status: 500 }
      );
    }

    const videoUrl = result.output;

    // --- Step 3: Fetch file video dari replicate delivery URL
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    // --- Step 4: Upload ke Supabase Storage
    const fileName = `video_${postId}_${Date.now()}.mp4`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("generated-videos")
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("generated-videos").getPublicUrl(fileName);

    // --- Step 5: Simpan URL ke tabel posts
    const { error: dbError } = await supabase
      .from("posts")
      .update({ video_url: publicUrl })
      .eq("id", postId);

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
      replicateUrl: videoUrl,
    });
  } catch (err) {
    console.error("Video generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate video", detail: err.message },
      { status: 500 }
    );
  }
}
