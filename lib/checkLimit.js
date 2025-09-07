// lib/checkLimit.js
import { supabase } from "./supabaseClient";

export async function checkDailyLimit(userId, action, limit = 20) {
  const start = new Date();
  start.setUTCHours(0,0,0,0);

  const end = new Date();
  end.setUTCHours(23,59,59,999);

  const { data, error } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (error) {
    console.error("Error checking limit:", error);
    return true;
  }

  // hitung log hari ini
  const usageCount = data?.length || 0;
  console.log("🔎 Log hari ini:", data)
  return usageCount < limit; // masih boleh generate
}

export async function logUsage(userId, action) {
  const { error } = await supabase
    .from("usage_logs")
    .insert([{ user_id: userId, action }]);

  if (error) {
    console.error("❌ Gagal insert usage_logs:", error);
    return { ok: false, error };
  }

  return { ok: true };
}
