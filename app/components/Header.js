"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Menu, X, LogOut, User, History, Home } from "lucide-react"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()

  const [user, setUser] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (pathname === "/login" || pathname === "/signup") return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    setMobileOpen(false)
  }

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-blue-600">
          MyApp
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex space-x-6 items-center">
          <Link href="/" className="flex items-center gap-1 text-gray-700 hover:text-blue-600">
            <Home size={18} /> Home
          </Link>

          {user && (
            <Link
              href="/history"
              className="flex items-center gap-1 text-gray-700 hover:text-blue-600"
            >
              <History size={18} /> History
            </Link>
          )}
          {user && (
            <Link
              href="/drafts"
              className="flex items-center gap-1 text-gray-700 hover:text-blue-600"
            >
              <History size={18} /> Drafts
            </Link>
          )}        </nav>

        {/* Auth Section (desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <div className="relative group">
              <button className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  <User size={16} /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-gray-600"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <nav className="flex flex-col p-4 space-y-3">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
            >
              <Home size={18} /> Home
            </Link>
            {user && (
              <Link
                href="/history"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
              >
                <History size={18} /> History
              </Link>
            )}
            {user && (
              <Link
                href="/drafts"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
              >
                <History size={18} /> Drafts
              </Link>
            )}

            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                >
                  <User size={18} /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <LogOut size={18} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
