"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Family = { id: string; parentName: string };
type Child = {
  id: string;
  childName: string;
  birthday: string | null;
  grade: string | null;
  medicalNotes: string | null;
  pickupRequired: boolean;
  pickupNotes: string | null;
  activeStatus: boolean;
  family: Family;
};

const emptyForm = {
  familyId: "",
  childName: "",
  birthday: "",
  grade: "",
  medicalNotes: "",
  pickupRequired: false,
  pickupNotes: "",
};

function ChildrenPageInner() {
  const searchParams = useSearchParams();
  const preselectedFamilyId = searchParams.get("familyId") ?? "";

  const [children, setChildren] = useState<Child[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(!!preselectedFamilyId);
  const [form, setForm] = useState({ ...emptyForm, familyId: preselectedFamilyId });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [childRes, familyRes] = await Promise.all([
      fetch(`/api/children${q ? `?q=${encodeURIComponent(q)}` : ""}`),
      fetch(`/api/families`),
    ]);
    if (childRes.ok) setChildren(await childRes.json());
    if (familyRes.ok) setFamilies(await familyRes.json());
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(c: Child) {
    setEditingId(c.id);
    setForm({
      familyId: c.family.id,
      childName: c.childName,
      birthday: c.birthday ? c.birthday.slice(0, 10) : "",
      grade: c.grade ?? "",
      medicalNotes: c.medicalNotes ?? "",
      pickupRequired: c.pickupRequired,
      pickupNotes: c.pickupNotes ?? "",
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
        <h1 className="text-2xl font-bold text-slate-900">Children</h1>
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

      <input
        className="input"
        placeholder="Search by child name or parent name..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

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
            <label className="label">Grade</label>
            <input className="input" value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })} />
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
                {c.grade && <p className="text-slate-500 text-sm">Grade: {c.grade}</p>}
                {c.medicalNotes && <p className="text-red-600 text-sm">Medical: {c.medicalNotes}</p>}
                {c.pickupRequired && (
                  <p className="text-slate-500 text-sm">
                    Transportation required {c.pickupNotes ? `· ${c.pickupNotes}` : ""}
                  </p>
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
