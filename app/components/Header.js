"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Menu, LogOut, User, History, Home } from "lucide-react"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()

  const [user, setUser] = useState(null)

  // Ambil user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Hide di /login & /signup
  if (pathname === "/login" || pathname === "/signup") return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-blue-600">
          MyApp
        </Link>

        {/* Navigasi */}
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
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="relative group">
              <button className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  <User size={16} /> Profile
                </Link>
                <Link
                  href="/history"
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 md:hidden"
                >
                  <History size={16} /> History
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

        {/* Mobile menu button */}
        <button className="md:hidden text-gray-600">
          <Menu size={24} />
        </button>
      </div>
    </header>
  )
}
