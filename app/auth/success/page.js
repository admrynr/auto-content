"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3); // 3 detik sebelum redirect

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    const redirectTimer = setTimeout(() => {
      router.replace("/profile");
    }, 3000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-6">
      <div className="bg-white bg-opacity-20 rounded-2xl p-8 shadow-lg flex flex-col items-center gap-4 animate-fadeIn">
        <div className="text-6xl animate-bounce">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          Akun Instagram Berhasil Terhubung!
        </h1>
        <p className="text-center text-gray-800/90">
          Kamu akan diarahkan ke halaman profil dalam <strong>{countdown}</strong> detik.
        </p>

        <div className="mt-4 w-64 h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-2 bg-white text-blue rounded-full transition-all duration-1000"
            style={{ width: `${((3 - countdown + 1) / 3) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
