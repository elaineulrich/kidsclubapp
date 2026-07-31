"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export default function DriverLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session.user.role === "DRIVER") {
      router.push("/driver/route");
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("driver", { redirect: false, code });

    setLoading(false);
    if (res?.error) {
      setError("Invalid driver code.");
      return;
    }
    router.push("/driver/route");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="Haven Kids Club" width={180} height={73} className="mx-auto mb-3" priority />
          <h1 className="text-2xl font-bold text-slate-900">Driver Portal</h1>
          <p className="text-slate-500 mt-1">Enter your driver code to see today&apos;s route</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="code">Driver Code</label>
            <input
              id="code"
              type="text"
              placeholder="VAN1-4829"
              className="input text-center tracking-widest uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Logging in..." : "LOGIN"}
          </button>
        </form>
      </div>
    </main>
  );
}
