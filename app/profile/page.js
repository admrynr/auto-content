"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Router, useRouter } from "next/navigation";

export default function ProfilePage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [activeId, setActiveId] = useState(null);

  // Get session user
  useEffect(() => {
    async function getSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    }
    getSession();
  }, []);

  // Get profile data
  useEffect(() => {
    if (session?.user) getProfile();
  }, [session]);

  useEffect(() => {
    async function loadAccounts() {
      const res = await fetch("/api/social/list");
      const data = await res.json();
      setAccounts(data.accounts || []);
      setActiveId(data.activeId || null);
      setLoadingAccount(false);
    }
    loadAccounts();
  }, []);

  async function setActive(accountId) {
    await fetch("/api/social/set-active", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    });
    setActiveId(accountId);
  }

  async function getProfile() {
    try {
      setLoading(true);
      let { data, error } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url, bio")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const updates = {
        id: session.user.id,
        full_name: fullName,
        username,
        bio,
        avatar_url: avatarUrl,
        updated_at: new Date(),
      };

      let { error } = await supabase.from("profiles").upsert(updates);
      if (error) throw error;
      alert("Profile updated!");
    } catch (error) {
      console.error(error);
      alert("Error updating profile!");
    } finally {
      setLoading(false);
    }
  }

  const handleConnectInstagram = () => {
    const clientId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const redirectUri = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`
    );
    const scope = "instagram_basic,pages_show_list,instagram_content_publish";
    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    router.push(authUrl);
  };

  if (!session) {
    return <p className="text-center mt-10">Please login to view your profile.</p>;
  }

  return (
    <div>
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>
        <form onSubmit={updateProfile} className="space-y-4">
          <div>
            <label className="block text-sm">Full Name</label>
            <input
              className="w-full p-2 border rounded"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Username</label>
            <input
              className="w-full p-2 border rounded"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Bio</label>
            <textarea
              className="w-full p-2 border rounded"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Avatar URL</label>
            <input
              className="w-full p-2 border rounded"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
        <div className="flex justify-center p-2">
          <button
            onClick={handleConnectInstagram}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700"
          >
            Connect Instagram
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Instagram Accounts</h1>
        {loadingAccount ? "Loading..." : ""}
        {accounts.map((acc) => (
          <div
            key={acc.account_id}
            className={`p-4 rounded-lg border ${
              acc.account_id === activeId ? "border-blue-500 bg-blue-50" : "border-gray-200"
            }`}
          >
            <p className="font-medium">{acc.page_name}</p>
            <p className="text-sm text-gray-500">IG ID: {acc.account_id}</p>
            <button
              onClick={() => setActive(acc.account_id)}
              className="mt-2 px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-700"
            >
              {acc.account_id === activeId ? "Active" : "Set Active"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
