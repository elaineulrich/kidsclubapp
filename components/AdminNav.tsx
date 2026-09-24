"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

type NavLink = { href: string; label: string };
type NavItem = NavLink & { children?: NavLink[] };

const links: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/families", label: "Families", children: [{ href: "/admin/children", label: "Children" }] },
  {
    href: "/admin/routes",
    label: "Routes",
    children: [
      { href: "/admin/drivers", label: "Drivers" },
      { href: "/admin/vans", label: "Vans" },
      { href: "/admin/map", label: "Map" },
    ],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    children: [
      { href: "/admin/users", label: "Staff Accounts" },
      { href: "/admin/reports", label: "Reports" },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [openHref, setOpenHref] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpenHref(null);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenHref(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function isActive(item: NavItem) {
    return pathname === item.href || (item.children?.some((c) => pathname === c.href) ?? false);
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between">
        <Link href="/admin" className="flex items-center">
          <Image src="/logo.png" alt="Haven Kids Club" width={104} height={42} priority />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/driver" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            Switch to Driver
          </Link>
          <SignOutButton />
        </div>
      </div>
      <nav ref={navRef} className="max-w-6xl mx-auto px-3 pb-2 flex gap-1 overflow-x-auto">
        {links.map((item) => {
          const active = isActive(item);
          const pillClass = `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-1 ${
            active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`;

          if (!item.children) {
            return (
              <Link key={item.href} href={item.href} className={pillClass}>
                {item.label}
              </Link>
            );
          }

          const open = openHref === item.href;
          return (
            <div key={item.href} className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => setOpenHref(open ? null : item.href)}
              >
                {item.label}
                <span className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
                  ▾
                </span>
              </button>
              {open && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 text-sm ${
                      pathname === item.href ? "text-brand-600 font-medium" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`block px-3 py-2 text-sm ${
                        pathname === c.href ? "text-brand-600 font-medium" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </header>
  );
}
