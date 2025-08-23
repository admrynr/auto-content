"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex justify-between items-center p-4 shadow-md bg-white">
      <h1 className="text-xl font-bold">Content Generator</h1>
      <nav className="flex gap-4">
        <Link href="/" className="hover:underline">Beranda</Link>
        <Link href="/history" className="hover:underline">History</Link>
        <button
          onClick={handleLogout}
          className="text-red-500 hover:underline"
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
