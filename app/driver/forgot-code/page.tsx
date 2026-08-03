"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotDriverCodePage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/drivers/forgot-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSubmitting(false);
    setDone(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="Haven Kids Club" width={180} height={73} className="mx-auto mb-3" priority />
          <h1 className="text-2xl font-bold text-slate-900">Forgot Your Code?</h1>
          <p className="text-slate-500 mt-1">Enter your registered email and we&apos;ll send it to you</p>
        </div>

        {done ? (
          <div className="card text-center space-y-3">
            <p className="text-emerald-600 font-semibold">Check your email</p>
            <p className="text-slate-500 text-sm">
              If a driver account is registered to {email}, we&apos;ve sent your code there.
            </p>
            <Link href="/driver" className="btn-secondary inline-block">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Sending..." : "Send My Code"}
            </button>

            <div className="text-center">
              <Link href="/driver" className="text-sm text-slate-500 hover:text-slate-800">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
