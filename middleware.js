// middleware.js
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = req.nextUrl

  // Halaman yang butuh login
  const protectedPaths = ["/", "/history", "/profile"]

  // Halaman login/signup (jangan diakses kalau sudah login)
  const authPaths = ["/login", "/signup"]

  // Kalau user belum login, dan akses halaman dilindungi → redirect ke /login
  if (protectedPaths.includes(pathname) && !user) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  // Kalau user sudah login, dan akses /login atau /signup → redirect ke /
  if (authPaths.includes(pathname) && user) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/"
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// hanya jalankan middleware di route tertentu
export const config = {
  matcher: ["/", "/history/:path*", "/profile", "/login", "/signup"],
}
