"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    // redirect: false + a manual relative push keeps the browser on whatever domain it's
    // already on. Letting next-auth redirect itself would send the browser to a URL built
    // from NEXTAUTH_URL server-side, which is the platform's default domain, not necessarily
    // the custom domain the user is actually visiting on.
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className={`text-sm font-medium text-slate-500 hover:text-slate-800 ${className}`}
    >
      Sign Out
    </button>
  );
}
