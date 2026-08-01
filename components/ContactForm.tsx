"use client";

import { useState } from "react";

const initialState = {
  name: "",
  email: "",
  hearAboutUs: "",
  message: "",
};

export default function ContactForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function update<K extends keyof typeof initialState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/public/contact", {
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
        setErrorMessage("We couldn't send your message online. Please call us at (254) 221-6793.");
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
        <h3 className="text-xl font-semibold text-brand-800">Message sent!</h3>
        <p className="text-slate-600 mt-2">Thanks for reaching out. We&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input
          id="name"
          className="input"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          className="input"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="hearAboutUs">Where did you hear about us?</label>
        <input
          id="hearAboutUs"
          className="input"
          value={form.hearAboutUs}
          onChange={(e) => update("hearAboutUs", e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="message">Message</label>
        <textarea
          id="message"
          className="input"
          rows={4}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
        />
      </div>

      {status === "error" && <p className="text-red-600 text-sm">{errorMessage}</p>}

      <button type="submit" className="btn-primary w-full" disabled={status === "loading"}>
        {status === "loading" ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
