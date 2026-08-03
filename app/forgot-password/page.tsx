"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/users/forgot-password", {
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
          <Image src="/logo.png" alt="Haven Kids Club" width={220} height={89} className="mx-auto mb-2" priority />
          <p className="text-slate-500 mt-1">Reset Your Password</p>
        </div>

        {done ? (
          <div className="card text-center space-y-3">
            <p className="text-emerald-600 font-semibold">Check your email</p>
            <p className="text-slate-500 text-sm">
              If an account exists for {email}, we&apos;ve sent a link to reset the password.
            </p>
            <Link href="/login" className="btn-secondary inline-block">Back to Login</Link>
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
              {submitting ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-slate-500 hover:text-slate-800">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
