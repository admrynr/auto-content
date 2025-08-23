"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const [contents, setContents] = useState([]);
  const [checking, setChecking] = useState(true);

  // delete modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editIdeas, setEditIdeas] = useState("");

  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
      else {
        setChecking(false);
        fetchContents();
      }
    };
    checkLogin();
  }, [router]);

  const fetchContents = async () => {
    const { data, error } = await supabase
      .from("contents")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setContents(data);
  };

  // delete
  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await supabase.from("contents").delete().eq("id", deleteId);
      setContents(contents.filter((c) => c.id !== deleteId));
      setShowConfirm(false);
      setDeleteId(null);
    }
  };

  // edit
  const openEdit = (item) => {
    setEditId(item.id);
    setEditIdeas(item.ideas);
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (editId) {
      const { error } = await supabase
        .from("contents")
        .update({ ideas: editIdeas })
        .eq("id", editId);

      if (!error) {
        setContents(
          contents.map((c) =>
            c.id === editId ? { ...c, ideas: editIdeas } : c
          )
        );
        setShowEdit(false);
        setEditId(null);
        setEditIdeas("");
      }
    }
  };

  if (checking) return <p className="p-6">Checking login...</p>;

  return (
    <div>
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-4">History</h2>
        {contents.length === 0 ? (
          <p>Tidak ada history.</p>
        ) : (
          <ul className="space-y-4">
            {contents.map((c) => (
              <li key={c.id} className="p-4 border rounded bg-white shadow-sm">
                <p className="font-semibold">Niche: {c.niche}</p>
                <p className="text-sm text-gray-600">Description: {c.description}</p>
                <p className="mt-2 whitespace-pre-line">💡 {c.ideas}</p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => openEdit(c)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => confirmDelete(c.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal konfirmasi delete */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-80">
            <h3 className="font-semibold text-lg mb-4">Konfirmasi</h3>
            <p>Yakin mau hapus history ini?</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1 border rounded"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edit ideas */}
      {showEdit && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-[500px]">
            <h3 className="font-semibold text-lg mb-4">Edit Ideas</h3>
            <textarea
              value={editIdeas}
              onChange={(e) => setEditIdeas(e.target.value)}
              className="w-full border p-2 rounded h-40"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowEdit(false)}
                className="px-3 py-1 border rounded"
              >
                Batal
              </button>
              <button
                onClick={handleEditSave}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
