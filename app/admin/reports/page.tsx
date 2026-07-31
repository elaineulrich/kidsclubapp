"use client";

import { Fragment, useEffect, useState } from "react";

type AttendanceRecord = {
  eventId: string;
  eventName: string;
  eventDate: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
};

type AttendanceReport = {
  events: { id: string; eventName: string; eventDate: string }[];
  report: {
    childId: string;
    childName: string;
    parentName: string;
    totalEvents: number;
    presentCount: number;
    percentage: number;
    records: AttendanceRecord[];
  }[];
};

type TransportationReport = {
  event: { id: string; eventName: string; eventDate: string } | null;
  totalRiders: number;
  vans: {
    id: string;
    vanName: string;
    capacity: number;
    driverName: string;
    riders: { childName: string; stopOrder: number; status: string }[];
  }[];
};

type FamilyReport = {
  id: string;
  parentName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  children: { childName: string; medicalNotes: string | null }[];
}[];

const TABS = ["Attendance", "Transportation", "Family"] as const;

export default function ReportsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Attendance");
  const [attendance, setAttendance] = useState<AttendanceReport | null>(null);
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [transportation, setTransportation] = useState<TransportationReport | null>(null);
  const [family, setFamily] = useState<FamilyReport | null>(null);

  useEffect(() => {
    if (tab === "Attendance" && !attendance) {
      fetch("/api/reports/attendance").then((r) => r.json()).then(setAttendance);
    }
    if (tab === "Transportation" && !transportation) {
      fetch("/api/reports/transportation").then((r) => r.json()).then(setTransportation);
    }
    if (tab === "Family" && !family) {
      fetch("/api/reports/family").then((r) => r.json()).then(setFamily);
    }
  }, [tab, attendance, transportation, family]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t ? "bg-brand-600 text-white" : "bg-white border border-slate-300 text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Attendance" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 pr-4">Child</th>
                <th className="py-2 pr-4">Parent</th>
                <th className="py-2 pr-4">Present</th>
                <th className="py-2 pr-4">Total Events</th>
                <th className="py-2 pr-4">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {attendance?.report.map((r) => (
                <Fragment key={r.childId}>
                  <tr
                    className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedChildId(expandedChildId === r.childId ? null : r.childId)}
                  >
                    <td className="py-2 pr-4 font-medium">
                      {expandedChildId === r.childId ? "▾" : "▸"} {r.childName}
                    </td>
                    <td className="py-2 pr-4">{r.parentName}</td>
                    <td className="py-2 pr-4">{r.presentCount}</td>
                    <td className="py-2 pr-4">{r.totalEvents}</td>
                    <td className="py-2 pr-4">{r.percentage}%</td>
                  </tr>
                  {expandedChildId === r.childId && (
                    <tr className="border-b border-slate-100 last:border-0">
                      <td colSpan={5} className="bg-slate-50 px-4 py-3">
                        {r.records.length === 0 ? (
                          <p className="text-slate-400">No check-in activity yet.</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-slate-400">
                                <th className="py-1 pr-4 font-normal">Event</th>
                                <th className="py-1 pr-4 font-normal">Date</th>
                                <th className="py-1 pr-4 font-normal">Status</th>
                                <th className="py-1 pr-4 font-normal">Checked In</th>
                                <th className="py-1 pr-4 font-normal">Checked Out</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.records.map((rec) => (
                                <tr key={rec.eventId}>
                                  <td className="py-1 pr-4">{rec.eventName}</td>
                                  <td className="py-1 pr-4">{new Date(rec.eventDate).toLocaleDateString()}</td>
                                  <td className="py-1 pr-4">{rec.status}</td>
                                  <td className="py-1 pr-4">
                                    {rec.checkInTime
                                      ? new Date(rec.checkInTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                                      : "—"}
                                  </td>
                                  <td className="py-1 pr-4">
                                    {rec.checkOutTime
                                      ? new Date(rec.checkOutTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {!attendance && <p className="text-slate-400">Loading...</p>}
        </div>
      )}

      {tab === "Transportation" && (
        <div className="space-y-4">
          {transportation?.event && (
            <p className="text-slate-600">
              {transportation.event.eventName} &mdash;{" "}
              {new Date(transportation.event.eventDate).toLocaleDateString()} &middot;{" "}
              {transportation.totalRiders} total riders
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transportation?.vans.map((v) => (
              <div key={v.id} className="card">
                <h3 className="font-semibold">{v.vanName} &mdash; {v.driverName}</h3>
                <p className="text-xs text-slate-400 mb-2">{v.riders.length} / {v.capacity} riders</p>
                <ol className="text-sm space-y-1">
                  {v.riders.map((r, i) => (
                    <li key={i}>{r.stopOrder}. {r.childName} <span className="text-slate-400">({r.status})</span></li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          {!transportation && <p className="text-slate-400">Loading...</p>}
        </div>
      )}

      {tab === "Family" && (
        <div className="space-y-3">
          {family?.map((f) => (
            <div key={f.id} className="card">
              <p className="font-semibold">{f.parentName}</p>
              <p className="text-sm text-slate-500">{f.phone} {f.email ? `· ${f.email}` : ""}</p>
              <p className="text-sm text-slate-500">{f.address}, {f.city}, {f.state} {f.zip}</p>
              {(f.emergencyContactName || f.emergencyContactPhone) && (
                <p className="text-sm text-slate-500">
                  Emergency: {[f.emergencyContactName, f.emergencyContactPhone, f.emergencyContactRelationship]
                    .filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="text-sm mt-1">
                Children: {f.children.map((c) => c.childName + (c.medicalNotes ? ` (⚠ ${c.medicalNotes})` : "")).join(", ") || "None"}
              </p>
            </div>
          ))}
          {!family && <p className="text-slate-400">Loading...</p>}
        </div>
      )}
    </div>
  );
}
