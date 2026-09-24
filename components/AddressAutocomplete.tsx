"use client";

import { useEffect, useRef, useState } from "react";

export type AddressResult = {
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
};

// Search-as-you-type address field. Doesn't hold the actual address fields itself -
// the parent form keeps its own Address/City/State/Zip inputs so a result can still be
// hand-corrected (e.g. adding an apartment number) after picking a suggestion; this
// just fills them in for you and hands back lat/lng so the parent can skip a later
// geocoding round-trip.
export default function AddressAutocomplete({
  onSelect,
  placeholder = "Start typing an address...",
}: {
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 5) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`);
      const data = res.ok ? await res.json() : { results: [] };
      setResults(data.results);
      setLoading(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function pick(result: AddressResult) {
    onSelect(result);
    setQuery(result.label);
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (loading || results.length > 0) && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading && <li className="px-3 py-2 text-sm text-slate-400">Searching...</li>}
          {!loading &&
            results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(r)}
                >
                  {r.label}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
