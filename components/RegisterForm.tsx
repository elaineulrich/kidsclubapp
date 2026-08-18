"use client";

import { useState } from "react";
import Link from "next/link";

type ChildEntry = { childName: string; childAge: string; allergyInfo: string };

const emptyChild: ChildEntry = { childName: "", childAge: "", allergyInfo: "" };

const initialState = {
  children: [{ ...emptyChild }] as ChildEntry[],
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  transportationNeeds: "",
  smsOptIn: false,
};

export default function RegisterForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function update<K extends keyof typeof initialState>(key: K, value: (typeof initialState)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateChild(index: number, key: keyof ChildEntry, value: string) {
    setForm((f) => {
      const children = [...f.children];
      children[index] = { ...children[index], [key]: value };
      return { ...f, children };
    });
  }

  function addChild() {
    setForm((f) => ({ ...f, children: [...f.children, { ...emptyChild }] }));
  }

  function removeChild(index: number) {
    setForm((f) => ({ ...f, children: f.children.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (!data.sent) {
        setStatus("error");
        setErrorMessage("We couldn't send your application online. Please call us at (254) 221-6793.");
        return;
      }

      setStatus("success");
      setForm(initialState);
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="card text-center py-10">
        <h3 className="text-xl font-semibold text-brand-800">Thank you!</h3>
        <p className="text-slate-600 mt-2">
          Your application has been submitted. We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="space-y-4">
        {form.children.map((child, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-700">Child {i + 1}</p>
              {form.children.length > 1 && (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => removeChild(i)}
                >
                  Remove
                </button>
              )}
            </div>

            <div>
              <label className="label" htmlFor={`childName-${i}`}>Child&apos;s Full Name *</label>
              <input
                id={`childName-${i}`}
                className="input"
                required
                value={child.childName}
                onChange={(e) => updateChild(i, "childName", e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor={`childAge-${i}`}>Child&apos;s Age</label>
              <input
                id={`childAge-${i}`}
                className="input"
                value={child.childAge}
                onChange={(e) => updateChild(i, "childAge", e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor={`allergyInfo-${i}`}>Child&apos;s Allergy Info *</label>
              <textarea
                id={`allergyInfo-${i}`}
                className="input"
                rows={2}
                required
                placeholder="List any allergies, or write 'None'"
                value={child.allergyInfo}
                onChange={(e) => updateChild(i, "allergyInfo", e.target.value)}
              />
            </div>
          </div>
        ))}

        <button type="button" className="btn-secondary w-full" onClick={addChild}>
          + Add Another Child
        </button>
      </div>

      <div>
        <label className="label" htmlFor="parentName">Parent/Guardian&apos;s Name *</label>
        <input
          id="parentName"
          className="input"
          required
          value={form.parentName}
          onChange={(e) => update("parentName", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="parentEmail">Parent/Guardian&apos;s Email *</label>
        <input
          id="parentEmail"
          type="email"
          className="input"
          required
          value={form.parentEmail}
          onChange={(e) => update("parentEmail", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="parentPhone">Parent/Guardian&apos;s Phone Number *</label>
        <input
          id="parentPhone"
          type="tel"
          className="input"
          required
          value={form.parentPhone}
          onChange={(e) => update("parentPhone", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="address">Street Address *</label>
        <input
          id="address"
          className="input"
          required
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="addressLine2">Apt/Suite/Unit #</label>
        <input
          id="addressLine2"
          className="input"
          placeholder="e.g. Apt 2B"
          value={form.addressLine2}
          onChange={(e) => update("addressLine2", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="city">City *</label>
        <input
          id="city"
          className="input"
          required
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="state">State *</label>
          <input
            id="state"
            className="input"
            required
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="zip">Zip *</label>
          <input
            id="zip"
            className="input"
            required
            value={form.zip}
            onChange={(e) => update("zip", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="transportationNeeds">Do you need Transportation? *</label>
        <select
          id="transportationNeeds"
          className="input"
          required
          value={form.transportationNeeds}
          onChange={(e) => update("transportationNeeds", e.target.value)}
        >
          <option value="" disabled>Select an option</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div className="flex items-start gap-2.5 pt-1">
        <input
          id="smsOptIn"
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={form.smsOptIn}
          onChange={(e) => update("smsOptIn", e.target.checked)}
        />
        <label htmlFor="smsOptIn" className="text-sm text-slate-600">
          I&apos;d like to receive text message updates from Haven Kids Club about pickup routes,
          event reminders, and program information. Message frequency varies. Message and data
          rates may apply. Reply STOP to opt out or HELP for help at any time. See our{" "}
          <Link href="/privacy" target="_blank" className="text-brand-600 hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" target="_blank" className="text-brand-600 hover:underline">
            Terms of Service
          </Link>
          . This is optional and not required to register.
        </label>
      </div>

      {status === "error" && <p className="text-red-600 text-sm">{errorMessage}</p>}

      <button type="submit" className="btn-primary w-full" disabled={status === "loading"}>
        {status === "loading" ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  );
}
