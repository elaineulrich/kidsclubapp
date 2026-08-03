"use client";

import { useEffect, useState, useCallback } from "react";
import Modal from "@/components/Modal";

type Driver = { id: string; name: string };
type Van = {
  id: string;
  vanName: string;
  capacity: number;
  activeStatus: boolean;
  driver: Driver | null;
};

const emptyForm = { vanName: "", driverId: "", capacity: "10" };

export default function VansPage() {
  const [vans, setVans] = useState<Van[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [vanRes, driverRes] = await Promise.all([fetch("/api/vans"), fetch("/api/drivers")]);
    if (vanRes.ok) setVans(await vanRes.json());
    if (driverRes.ok) setDrivers(await driverRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(v: Van) {
    setEditingId(v.id);
    setForm({ vanName: v.vanName, driverId: v.driver?.id ?? "", capacity: String(v.capacity) });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = editingId ? `/api/vans/${editingId}` : "/api/vans";
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

  async function toggleActive(v: Van) {
    await fetch(`/api/vans/${v.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vanName: v.vanName, driverId: v.driver?.id ?? "", capacity: v.capacity, activeStatus: !v.activeStatus }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this van?")) return;
    await fetch(`/api/vans/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Vans</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}
        >
          + Add Van
        </button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? "Edit Van" : "Add Van"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Van Name</label>
            <input className="input" required placeholder="Van 1" value={form.vanName}
              onChange={(e) => setForm({ ...form, vanName: e.target.value })} />
          </div>
          <div>
            <label className="label">Capacity</label>
            <input className="input" type="number" min="1" required value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Driver</label>
            <select className="input" value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
              <option value="">Unassigned</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {editingId ? "Save Changes" : "Add Van"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <div className="space-y-3">
        {vans.map((v) => (
          <div key={v.id} className={`card flex justify-between flex-wrap gap-2 ${!v.activeStatus ? "opacity-50" : ""}`}>
            <div>
              <p className="font-semibold text-lg">
                {v.vanName} {!v.activeStatus && <span className="text-sm text-slate-400">(inactive)</span>}
              </p>
              <p className="text-slate-500 text-sm">Driver: {v.driver?.name ?? "Unassigned"}</p>
              <p className="text-slate-500 text-sm">Capacity: {v.capacity}</p>
            </div>
            <div className="flex gap-2 items-start">
              <button className="btn-secondary" onClick={() => startEdit(v)}>Edit</button>
              <button className="btn-secondary" onClick={() => toggleActive(v)}>
                {v.activeStatus ? "Deactivate" : "Reactivate"}
              </button>
              <button className="btn-danger" onClick={() => handleDelete(v.id)}>Delete</button>
            </div>
          </div>
        ))}
        {vans.length === 0 && <p className="text-slate-500">No vans yet.</p>}
      </div>
    </div>
  );
}
