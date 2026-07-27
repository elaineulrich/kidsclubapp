"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Family = {
  id: string;
  parentName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  emergencyContact: string | null;
  children: { id: string; childName: string }[];
};

const emptyForm = {
  parentName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  emergencyContact: "",
};

export default function FamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/families${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (res.ok) setFamilies(await res.json());
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(f: Family) {
    setEditingId(f.id);
    setForm({
      parentName: f.parentName,
      phone: f.phone,
      email: f.email ?? "",
      address: f.address,
      city: f.city,
      state: f.state,
      zip: f.zip,
      emergencyContact: f.emergencyContact ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = editingId ? `/api/families/${editingId}` : "/api/families";
    const method = editingId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this family and all their children? This cannot be undone.")) return;
    await fetch(`/api/families/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Families</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm((s) => !s);
          }}
        >
          {showForm ? "Cancel" : "+ Add Family"}
        </button>
      </div>

      <input
        className="input"
        placeholder="Search by parent name, phone, or email..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Parent Name</label>
            <input className="input" required value={form.parentName}
              onChange={(e) => setForm({ ...form, parentName: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" required value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <input className="input" value={form.emergencyContact}
              onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input className="input" required value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" required value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">State</label>
              <input className="input" required value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="label">Zip</label>
              <input className="input" required value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {editingId ? "Save Changes" : "Add Family"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {families.map((f) => (
          <div key={f.id} className="card">
            <div className="flex justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-lg">{f.parentName}</p>
                <p className="text-slate-500 text-sm">{f.phone} {f.email ? `· ${f.email}` : ""}</p>
                <p className="text-slate-500 text-sm">{f.address}, {f.city}, {f.state} {f.zip}</p>
                {f.emergencyContact && (
                  <p className="text-slate-500 text-sm">Emergency: {f.emergencyContact}</p>
                )}
                <p className="text-sm mt-2">
                  Children:{" "}
                  {f.children.length === 0
                    ? "None yet"
                    : f.children.map((c) => c.childName).join(", ")}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Link href={`/admin/children?familyId=${f.id}`} className="btn-secondary">
                  + Add Child
                </Link>
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => startEdit(f)}>Edit</button>
                  <button className="btn-danger" onClick={() => handleDelete(f.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {families.length === 0 && <p className="text-slate-500">No families found.</p>}
      </div>
    </div>
  );
}
