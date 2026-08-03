"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Family = { id: string; parentName: string; address: string };
type Van = { id: string; vanName: string };
type Child = {
  id: string;
  childName: string;
  birthday: string | null;
  age: number | null;
  medicalNotes: string | null;
  pickupRequired: boolean;
  pickupNotes: string | null;
  bestContactPhone: string | null;
  defaultVan: Van | null;
  activeStatus: boolean;
  family: Family;
};

const emptyForm = {
  familyId: "",
  childName: "",
  birthday: "",
  age: "",
  medicalNotes: "",
  pickupRequired: false,
  pickupNotes: "",
  bestContactPhone: "",
  defaultVanId: "",
};

function ChildrenPageInner() {
  const searchParams = useSearchParams();
  const preselectedFamilyId = searchParams.get("familyId") ?? "";

  const [children, setChildren] = useState<Child[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [q, setQ] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [showForm, setShowForm] = useState(!!preselectedFamilyId);
  const [form, setForm] = useState({ ...emptyForm, familyId: preselectedFamilyId });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (familyFilter) params.set("familyId", familyFilter);
    if (addressFilter) params.set("address", addressFilter);

    const [childRes, familyRes, vanRes] = await Promise.all([
      fetch(`/api/children${params.toString() ? `?${params.toString()}` : ""}`),
      fetch(`/api/families`),
      fetch(`/api/vans`),
    ]);
    if (childRes.ok) setChildren(await childRes.json());
    if (familyRes.ok) setFamilies(await familyRes.json());
    if (vanRes.ok) setVans(await vanRes.json());
  }, [q, familyFilter, addressFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(c: Child) {
    setEditingId(c.id);
    setForm({
      familyId: c.family.id,
      childName: c.childName,
      birthday: c.birthday ? c.birthday.slice(0, 10) : "",
      age: c.age !== null ? String(c.age) : "",
      medicalNotes: c.medicalNotes ?? "",
      pickupRequired: c.pickupRequired,
      pickupNotes: c.pickupNotes ?? "",
      bestContactPhone: c.bestContactPhone ?? "",
      defaultVanId: c.defaultVan?.id ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = editingId ? `/api/children/${editingId}` : "/api/children";
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

  async function toggleActive(c: Child) {
    await fetch(`/api/children/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, activeStatus: !c.activeStatus }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this child? This cannot be undone.")) return;
    await fetch(`/api/children/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Children</h1>
          <p className="text-slate-500 text-sm">
            {children.length} {children.length === 1 ? "child" : "children"}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm((s) => !s);
          }}
        >
          {showForm ? "Cancel" : "+ Add Child"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Search by child name or parent name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input flex-1 min-w-[180px]"
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value)}
        >
          <option value="">All families</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>{f.parentName}</option>
          ))}
        </select>
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Filter by address..."
          value={addressFilter}
          onChange={(e) => setAddressFilter(e.target.value)}
        />
        {(q || familyFilter || addressFilter) && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setQ("");
              setFamilyFilter("");
              setAddressFilter("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Family</label>
            <select
              className="input"
              required
              value={form.familyId}
              onChange={(e) => setForm({ ...form, familyId: e.target.value })}
            >
              <option value="">Select a family...</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>{f.parentName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Child Name</label>
            <input className="input" required value={form.childName}
              onChange={(e) => setForm({ ...form, childName: e.target.value })} />
          </div>
          <div>
            <label className="label">Birthday</label>
            <input className="input" type="date" value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          </div>
          <div>
            <label className="label">Age</label>
            <input className="input" type="number" min="0" max="18" value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Medical Notes / Allergies</label>
            <input className="input" value={form.medicalNotes}
              onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="pickupRequired"
              type="checkbox"
              className="h-5 w-5"
              checked={form.pickupRequired}
              onChange={(e) => setForm({ ...form, pickupRequired: e.target.checked })}
            />
            <label htmlFor="pickupRequired" className="label mb-0">Needs Transportation</label>
          </div>
          <div>
            <label className="label">Pickup Notes</label>
            <input className="input" placeholder="e.g. Dog outside" value={form.pickupNotes}
              onChange={(e) => setForm({ ...form, pickupNotes: e.target.value })} />
          </div>
          <div>
            <label className="label">Best Number to Contact During Kids Club</label>
            <input className="input" placeholder="Defaults to parent's phone if left blank"
              value={form.bestContactPhone}
              onChange={(e) => setForm({ ...form, bestContactPhone: e.target.value })} />
          </div>
          <div>
            <label className="label">Default Van</label>
            <select className="input" value={form.defaultVanId}
              onChange={(e) => setForm({ ...form, defaultVanId: e.target.value })}>
              <option value="">No default - assign per event</option>
              {vans.map((v) => (
                <option key={v.id} value={v.id}>{v.vanName}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {editingId ? "Save Changes" : "Add Child"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {children.map((c) => (
          <div key={c.id} className={`card ${!c.activeStatus ? "opacity-50" : ""}`}>
            <div className="flex justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-lg">
                  {c.childName} {!c.activeStatus && <span className="text-sm text-slate-400">(inactive)</span>}
                </p>
                <p className="text-slate-500 text-sm">Parent: {c.family.parentName}</p>
                <p className="text-slate-500 text-sm">{c.family.address}</p>
                {c.age !== null && <p className="text-slate-500 text-sm">Age: {c.age}</p>}
                {c.medicalNotes && <p className="text-red-600 text-sm">Medical: {c.medicalNotes}</p>}
                {c.pickupRequired && (
                  <p className="text-slate-500 text-sm">
                    Transportation required {c.pickupNotes ? `· ${c.pickupNotes}` : ""}
                  </p>
                )}
                {c.defaultVan && (
                  <p className="text-slate-500 text-sm">Default Van: {c.defaultVan.vanName}</p>
                )}
                {c.bestContactPhone && (
                  <p className="text-slate-500 text-sm">Best contact during event: {c.bestContactPhone}</p>
                )}
              </div>
              <div className="flex gap-2 items-start">
                <button className="btn-secondary" onClick={() => startEdit(c)}>Edit</button>
                <button className="btn-secondary" onClick={() => toggleActive(c)}>
                  {c.activeStatus ? "Deactivate" : "Reactivate"}
                </button>
                <button className="btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {children.length === 0 && <p className="text-slate-500">No children found.</p>}
      </div>
    </div>
  );
}

export default function ChildrenPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading...</p>}>
      <ChildrenPageInner />
    </Suspense>
  );
}
