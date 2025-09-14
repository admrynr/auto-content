"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Router, useRouter } from "next/navigation";
import { toast } from "sonner"


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
  const [saving, setSaving] = useState(false);




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
    setSaving(true);
    try {
      const res =     await fetch("/api/social/set-active", {
        method: "POST",
        body: JSON.stringify({ account_id: accountId }),
      });

      const data = await res.json();
      if(data.success){
        setActiveId(accountId);
        toast.success("Instagram account selected!")
      } else{
        toast.error("Failed to set active:", data.error);
      }
    } catch(err) {
      toast.error("Request error:", err);
    } finally {
      setSaving(false);
    }

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
        <ul className="space-y-3">
          {accounts.map((acc) => (
            <li
              key={acc.id}
              className={`flex items-center gap-3 p-3 rounded border ${
                acc.is_active ? "border-green-500" : "border-gray-300"
              }`}
            >
              {acc.profile_picture_url ? (
                <img
                  src={acc.profile_picture_url}
                  alt={acc.username || acc.account_id}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200" />
              )}

              <div>
                <p className="font-semibold">@{acc.username || acc.account_id}</p>
                <p className="text-sm text-gray-600">{acc.name || "Tanpa nama"}</p>
              </div>

              {activeId === acc.account_id ? (
                <span className="ml-auto text-green-600 font-bold text-sm">
                  Aktif
                </span>
              ) : (
                <button
                  onClick={() => setActive(acc.account_id)}
                  disabled={saving}
                  className="ml-auto px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? "..." : "Set Active"}
                </button>
              )
              }
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
