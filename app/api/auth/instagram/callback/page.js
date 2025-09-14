"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function InstagramCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      toast.error("OAuth gagal: missing code");
      router.replace("/profile");
      return;
    }

    const connectInstagram = async () => {
      try {
        const res = await fetch(`/api/auth/instagram/callback?code=${code}`);
        const data = await res.json();

        if (data.success) {
          toast.success("Instagram berhasil tersambung 🎉");
          router.replace("/profile");
        } else {
          toast.error("OAuth gagal ❌");
          router.replace("/profile");
        }
      } catch (err) {
        console.error(err);
        toast.error("Terjadi kesalahan server ⚠️");
        router.replace("/profile");
      } finally {
        setLoading(false);
      }
    };

    connectInstagram();
  }, [searchParams, router]);

  return <div>{loading ? "Menghubungkan Instagram..." : "Redirecting..."}</div>;
}
