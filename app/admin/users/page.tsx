"use client";

import { useEffect, useState, useCallback } from "react";
import Modal from "@/components/Modal";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VOLUNTEER";
  activeStatus: boolean;
  createdDate: string;
  invitePending: boolean;
};

type InviteResult = {
  email: string;
  invite: { sent: boolean; error?: string };
  inviteUrl: string;
};

const emptyInviteForm = { name: "", email: "", role: "VOLUNTEER" as "ADMIN" | "VOLUNTEER" };
const emptyEditForm = { name: "", role: "VOLUNTEER" as "ADMIN" | "VOLUNTEER", password: "" };

export default function UsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [inviteForm, setInviteForm] = useState(emptyInviteForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendResult, setResendResult] = useState<{ id: string; result: InviteResult } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(u: StaffUser) {
    setEditingId(u.id);
    setEditForm({ name: u.name, role: u.role, password: "" });
    setError("");
    setInviteResult(null);
    setShowForm(true);
  }

  function startInvite() {
    setEditingId(null);
    setInviteForm(emptyInviteForm);
    setError("");
    setInviteResult(null);
    setShowForm(true);
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    setInviteResult({ email: inviteForm.email, invite: data.invite, inviteUrl: data.inviteUrl });
    setInviteForm(emptyInviteForm);
    load();
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch(`/api/users/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        role: editForm.role,
        ...(editForm.password ? { password: editForm.password } : {}),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }
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

  async function resendInvite(u: StaffUser) {
    setResendingId(u.id);
    setResendResult(null);
    const res = await fetch(`/api/users/${u.id}/resend-invite`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setResendingId(null);
    if (!res.ok) {
      alert(data.error || "Could not resend invite");
      return;
    }
    setResendResult({ id: u.id, result: { email: u.email, invite: data.invite, inviteUrl: data.inviteUrl } });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Staff Accounts</h1>
        <button className="btn-primary" onClick={startInvite}>
          + Invite User
        </button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId === null ? "Invite User" : "Edit Staff Account"}>
        {editingId === null ? (
          <form onSubmit={handleInviteSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
            <div>
              <label className="label">Name</label>
              <input className="input" required value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as "ADMIN" | "VOLUNTEER" })}>
                <option value="VOLUNTEER">Volunteer (Check-In)</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2 items-center flex-wrap">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Sending Invite..." : "Send Invite"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <p className="text-xs text-slate-400 w-full">
                They&apos;ll get an email with a link to set their own password.
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
            <div>
              <label className="label">Name</label>
              <input className="input" required value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "ADMIN" | "VOLUNTEER" })}>
                <option value="VOLUNTEER">Volunteer (Check-In)</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Reset Password (optional)</label>
              <input className="input" type="password" minLength={8} value={editForm.password}
                placeholder="Leave blank to keep current"
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {inviteResult && (
        <div className="card space-y-1">
          {inviteResult.invite.sent ? (
            <p className="text-sm text-emerald-600">✓ Invite emailed to {inviteResult.email}</p>
          ) : (
            <>
              <p className="text-sm text-amber-600">
                Couldn&apos;t send the invite email{inviteResult.invite.error ? `: ${inviteResult.invite.error}` : ""}.
                Share this link manually instead:
              </p>
              <code className="text-xs bg-slate-100 rounded px-2 py-1 break-all block">{inviteResult.inviteUrl}</code>
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className={`card flex justify-between flex-wrap gap-2 ${!u.activeStatus ? "opacity-50" : ""}`}>
            <div>
              <p className="font-semibold text-lg">
                {u.name}
                {!u.activeStatus && <span className="text-sm text-slate-400"> (inactive)</span>}
                {u.invitePending && <span className="text-sm text-amber-600 font-medium"> · Invite Pending</span>}
              </p>
              <p className="text-slate-500 text-sm">{u.email} · {u.role}</p>
              {resendResult?.id === u.id && (
                resendResult.result.invite.sent ? (
                  <p className="text-sm text-emerald-600 mt-1">✓ Invite re-sent</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-amber-600">
                      Couldn&apos;t email it{resendResult.result.invite.error ? `: ${resendResult.result.invite.error}` : ""}.
                      Share this link manually:
                    </p>
                    <code className="text-xs bg-slate-100 rounded px-2 py-1 break-all block">{resendResult.result.inviteUrl}</code>
                  </div>
                )
              )}
            </div>
            <div className="flex gap-2 items-start">
              {u.invitePending && (
                <button className="btn-secondary" disabled={resendingId === u.id} onClick={() => resendInvite(u)}>
                  {resendingId === u.id ? "Sending..." : "Resend Invite"}
                </button>
              )}
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
