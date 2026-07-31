"use client";

import { useEffect, useState } from "react";
import { SUPPORTED_TIMEZONES } from "@/lib/timezones";

const TIMEZONE_LABELS: Record<string, string> = {
  "America/New_York": "Eastern Time",
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Phoenix": "Mountain Time (no DST - Arizona)",
  "America/Los_Angeles": "Pacific Time",
  "America/Anchorage": "Alaska Time",
  "Pacific/Honolulu": "Hawaii Time",
  UTC: "UTC",
};

export default function SettingsPage() {
  const [timezone, setTimezone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setTimezone(data.timezone));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <form onSubmit={handleSubmit} className="card space-y-3">
        <div>
          <label className="label">Time Zone</label>
          <p className="text-sm text-slate-500 mb-2">
            Used to determine what counts as &quot;today&quot; for events and driver routes -
            e.g. so a route stays on today&apos;s list until midnight in your local time,
            not the server&apos;s.
          </p>
          <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)} disabled={!timezone}>
            {SUPPORTED_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{TIMEZONE_LABELS[tz] ?? tz} ({tz})</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={saving || !timezone}>
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-emerald-600 font-medium ml-3">Saved ✓</span>}
      </form>
    </div>
  );
}
