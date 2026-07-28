"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={`text-sm font-medium text-slate-500 hover:text-slate-800 ${className}`}
    >
      Sign Out
    </button>
  );
}
