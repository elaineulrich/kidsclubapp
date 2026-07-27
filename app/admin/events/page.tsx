"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Event = {
  id: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
};

const emptyForm = { eventName: "Kids Club", eventDate: "", startTime: "18:00", endTime: "19:30" };

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) setEvents(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(e: Event) {
    setEditingId(e.id);
    setForm({
      eventName: e.eventName,
      eventDate: e.eventDate.slice(0, 10),
      startTime: e.startTime,
      endTime: e.endTime,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = editingId ? `/api/events/${editingId}` : "/api/events";
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
    if (!confirm("Delete this event and all its attendance/route data?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Events</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm((s) => !s);
          }}
        >
          {showForm ? "Cancel" : "+ Create Event"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="label">Event Name</label>
            <input className="input" required value={form.eventName}
              onChange={(e) => setForm({ ...form, eventName: e.target.value })} />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" required value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input className="input" type="time" required value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input className="input" type="time" required value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {editingId ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {events.map((e) => (
          <div key={e.id} className="card flex justify-between items-center flex-wrap gap-2">
            <div>
              <p className="font-semibold text-lg">{e.eventName}</p>
              <p className="text-slate-500 text-sm">
                {new Date(e.eventDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                &middot; {e.startTime}&ndash;{e.endTime}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/routes?eventId=${e.id}`} className="btn-secondary">Routes</Link>
              <button className="btn-secondary" onClick={() => startEdit(e)}>Edit</button>
              <button className="btn-danger" onClick={() => handleDelete(e.id)}>Delete</button>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-slate-500">No events yet.</p>}
      </div>
    </div>
  );
}
