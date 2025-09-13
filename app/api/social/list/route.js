import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ accounts: [] });
  }

  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ accounts: [] });
  }

  const active = data.find((acc) => acc.is_active);
  return NextResponse.json({ accounts: data, activeId: active?.account_id || null });
}
