"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

// Only renders for a driver whose email also matches an active admin account (set on
// the session at driver login - see lib/auth.ts). Links to the staff login page rather
// than switching sessions directly, so it still requires the admin password.
export default function DriverAdminSwitchLink() {
  const { data: session } = useSession();
  if (!session?.user?.canSwitchToAdmin) return null;

  return (
    <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-800">
      Switch to Admin
    </Link>
  );
}
