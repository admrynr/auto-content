// middleware.js
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // daftar halaman yang butuh login
  const protectedPaths = ["/", "/history"]

  if (protectedPaths.includes(req.nextUrl.pathname)) {
    if (!user) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/login"
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ["/", "/history/:path*"],
}
