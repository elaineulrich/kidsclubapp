"use client";

import { useEffect, useState, useCallback } from "react";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VOLUNTEER";
  activeStatus: boolean;
  createdDate: string;
};

const emptyForm = { name: "", email: "", password: "", role: "VOLUNTEER" as "ADMIN" | "VOLUNTEER" };

export default function UsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(u: StaffUser) {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const url = editingId ? `/api/users/${editingId}` : "/api/users";
    const method = editingId ? "PUT" : "POST";
    const body = editingId
      ? { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) }
      : form;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    load();
  }

  async function toggleActive(u: StaffUser) {
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeStatus: !u.activeStatus }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this account?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not delete account");
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Staff Accounts</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setError("");
            setShowForm((s) => !s);
          }}
        >
          {showForm ? "Cancel" : "+ Create Account"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 md:grid-cols-2 gap-3">
          {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required disabled={!!editingId} value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">{editingId ? "New Password (leave blank to keep current)" : "Password"}</label>
            <input className="input" type="password" required={!editingId} minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "VOLUNTEER" })}>
              <option value="VOLUNTEER">Volunteer (Check-In)</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {editingId ? "Save Changes" : "Create Account"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className={`card flex justify-between flex-wrap gap-2 ${!u.activeStatus ? "opacity-50" : ""}`}>
            <div>
              <p className="font-semibold text-lg">
                {u.name} {!u.activeStatus && <span className="text-sm text-slate-400">(inactive)</span>}
              </p>
              <p className="text-slate-500 text-sm">{u.email} · {u.role}</p>
            </div>
            <div className="flex gap-2 items-start">
              <button className="btn-secondary" onClick={() => startEdit(u)}>Edit</button>
              <button className="btn-secondary" onClick={() => toggleActive(u)}>
                {u.activeStatus ? "Deactivate" : "Reactivate"}
              </button>
              <button className="btn-danger" onClick={() => handleDelete(u.id)}>Delete</button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-slate-500">No accounts yet.</p>}
      </div>
    </div>
  );
}
