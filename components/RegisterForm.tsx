"use client";

import { useState } from "react";
import Link from "next/link";

const initialState = {
  childName: "",
  childAge: "",
  allergyInfo: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  address: "",
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
      <div>
        <label className="label" htmlFor="childName">Child&apos;s Full Name *</label>
        <input
          id="childName"
          className="input"
          required
          value={form.childName}
          onChange={(e) => update("childName", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="childAge">Child&apos;s Age</label>
        <input
          id="childAge"
          className="input"
          value={form.childAge}
          onChange={(e) => update("childAge", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="allergyInfo">Child&apos;s Allergy Info *</label>
        <textarea
          id="allergyInfo"
          className="input"
          rows={2}
          required
          placeholder="List any allergies, or write 'None'"
          value={form.allergyInfo}
          onChange={(e) => update("allergyInfo", e.target.value)}
        />
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
