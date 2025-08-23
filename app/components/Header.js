"use client";

import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Header() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // arahkan balik ke halaman login
  };

  return (
    <header className="w-full p-4 flex justify-between items-center bg-white shadow">
      <h1 className="text-xl font-bold text-indigo-600">Auto Content</h1>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
      >
        Logout
      </button>
    </header>
  );
}
