"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function AcceptInviteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "invalid" | "ready" | "done">("loading");
  const [invitee, setInvitee] = useState<{ name: string; email: string; passwordAlreadySet: boolean } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    fetch(`/api/users/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setStatus("invalid");
          return;
        }
        setInvitee(await res.json());
        setStatus("ready");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/users/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }
    setStatus("done");
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="Haven Kids Club" width={220} height={89} className="mx-auto mb-2" priority />
        </div>

        {status === "loading" && <p className="text-center text-slate-500">Loading invite...</p>}

        {status === "invalid" && (
          <div className="card text-center space-y-3">
            <p className="text-red-600 font-semibold">This invite link is invalid or has expired.</p>
            <p className="text-slate-500 text-sm">Ask an admin to resend your invite.</p>
            <Link href="/login" className="btn-secondary inline-block">Back to Login</Link>
          </div>
        )}

        {status === "ready" && invitee && (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">
                {invitee.passwordAlreadySet ? "Reset your password" : `Welcome, ${invitee.name}!`}
              </p>
              <p className="text-slate-500 text-sm">
                {invitee.passwordAlreadySet ? "Choose a new password for " : "Set a password for "}
                {invitee.email}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting
                ? "Saving..."
                : invitee.passwordAlreadySet
                ? "Reset Password & Continue"
                : "Set Password & Continue"}
            </button>
          </form>
        )}

        {status === "done" && (
          <div className="card text-center space-y-2">
            <p className="text-emerald-600 font-semibold">✓ Password set!</p>
            <p className="text-slate-500 text-sm">Taking you to the login page...</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </main>
    }>
      <AcceptInviteInner />
    </Suspense>
  );
}
