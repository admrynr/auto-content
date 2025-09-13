import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req) {
  const { account_id } = await req.json();
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Set semua jadi false, lalu aktifkan yang dipilih
  await supabase
    .from("social_accounts")
    .update({ is_active: false })
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("social_accounts")
    .update({ is_active: true })
    .eq("user_id", user.id)
    .eq("account_id", account_id);

  if (error) {
    console.error("❌ Error setting active account:", error);
    return NextResponse.json({ error: "Failed to update active account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
