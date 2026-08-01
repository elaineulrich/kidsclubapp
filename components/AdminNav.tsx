"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/families", label: "Families" },
  { href: "/admin/children", label: "Children" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/vans", label: "Vans" },
  { href: "/admin/routes", label: "Routes" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/import-export", label: "Import/Export" },
  { href: "/admin/users", label: "Staff Accounts" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between">
        <Link href="/admin" className="flex items-center">
          <Image src="/logo.png" alt="Haven Kids Club" width={104} height={42} priority />
        </Link>
        <SignOutButton />
      </div>
      <nav className="max-w-6xl mx-auto px-3 pb-2 flex gap-1 overflow-x-auto">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
