"use client";

import { useState } from "react";

type ImportResult = {
  familiesCreated: number;
  familiesReused: number;
  childrenCreated: number;
  childrenSkipped: number;
  warnings: string[];
};

export default function ImportExportWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/roster/import", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Import failed");
      return;
    }
    setResult(data);
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold text-lg">Import / Export Roster</h2>

      <div className="space-y-2">
        <p className="text-slate-500 text-sm">
          Download all current families and children as an Excel spreadsheet.
        </p>
        <a href="/api/admin/roster/export" className="btn-secondary inline-block" download>
          Export to Excel
        </a>
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-2">
        <p className="text-slate-500 text-sm">
          Upload a roster spreadsheet (the exported format above, or a Haven Kids Club
          &quot;Profile Metrics&quot; report). Rows are grouped by address into families. Existing
          families (matched by address) and children (matched by name) are skipped, so it&apos;s
          safe to re-upload the same file.
        </p>
        <form onSubmit={handleImport} className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input"
          />
          <button type="submit" className="btn-primary" disabled={!file || loading}>
            {loading ? "Importing..." : "Upload & Import"}
          </button>
        </form>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {result && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <p>Families created: {result.familiesCreated}</p>
            <p>Families already existing (reused): {result.familiesReused}</p>
            <p>Children created: {result.childrenCreated}</p>
            <p>Children skipped (already existed): {result.childrenSkipped}</p>
            {result.warnings.length > 0 && (
              <div className="pt-2">
                <p className="font-medium">Warnings ({result.warnings.length}):</p>
                <ul className="list-disc list-inside text-slate-600">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
