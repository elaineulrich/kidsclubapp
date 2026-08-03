"use client";

import { useEffect, useState, useCallback } from "react";
import Modal from "@/components/Modal";

type Driver = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loginCode: string;
  activeStatus: boolean;
  vans: { id: string; vanName: string }[];
};

const emptyForm = { name: "", phone: "", email: "", loginCode: "" };

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/drivers");
    if (res.ok) setDrivers(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(d: Driver) {
    setEditingId(d.id);
    setForm({ name: d.name, phone: d.phone, email: d.email ?? "", loginCode: d.loginCode });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = editingId ? `/api/drivers/${editingId}` : "/api/drivers";
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

  async function toggleActive(d: Driver) {
    await fetch(`/api/drivers/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, activeStatus: !d.activeStatus }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this driver?")) return;
    await fetch(`/api/drivers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}
        >
          + Add Driver
        </button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? "Edit Driver" : "Add Driver"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
            <label className="label">Driver Login Code</label>
            <input className="input" required placeholder="VAN1-4829" value={form.loginCode}
              onChange={(e) => setForm({ ...form, loginCode: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {editingId ? "Save Changes" : "Add Driver"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <div className="space-y-3">
        {drivers.map((d) => (
          <div key={d.id} className={`card flex justify-between flex-wrap gap-2 ${!d.activeStatus ? "opacity-50" : ""}`}>
            <div>
              <p className="font-semibold text-lg">
                {d.name} {!d.activeStatus && <span className="text-sm text-slate-400">(inactive)</span>}
              </p>
              <p className="text-slate-500 text-sm">{d.phone} {d.email ? `· ${d.email}` : ""}</p>
              <p className="text-slate-500 text-sm">Login Code: <span className="font-mono">{d.loginCode}</span></p>
              {d.vans.length > 0 && (
                <p className="text-slate-500 text-sm">Van: {d.vans.map((v) => v.vanName).join(", ")}</p>
              )}
            </div>
            <div className="flex gap-2 items-start">
              <button className="btn-secondary" onClick={() => startEdit(d)}>Edit</button>
              <button className="btn-secondary" onClick={() => toggleActive(d)}>
                {d.activeStatus ? "Deactivate" : "Reactivate"}
              </button>
              <button className="btn-danger" onClick={() => handleDelete(d.id)}>Delete</button>
            </div>
          </div>
        ))}
        {drivers.length === 0 && <p className="text-slate-500">No drivers yet.</p>}
      </div>
    </div>
  );
}
