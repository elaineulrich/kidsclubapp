"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/#home", label: "Home" },
  { href: "/evenings", label: "Kids Club Evenings" },
  { href: "/about", label: "About Us" },
  { href: "/#register", label: "Register" },
  { href: "/#contact", label: "Contact Us" },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/#home" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Image src="/logo.png" alt="Haven Kids Club" width={140} height={56} priority />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-slate-700 hover:text-brand-700">
              {l.label}
            </Link>
          ))}
          <a
            href="tel:12542216793"
            className="text-sm font-medium text-slate-500 hover:text-brand-700"
          >
            (254) 221-6793
          </a>
          <Link href="/login" className="btn-secondary text-sm">
            Staff Login
          </Link>
        </nav>

        <button
          type="button"
          className="md:hidden p-2 text-slate-700"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-slate-200 px-4 py-3 flex flex-col gap-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-700"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <a href="tel:12542216793" className="text-sm font-medium text-slate-500">
            (254) 221-6793
          </a>
          <Link href="/login" className="btn-secondary text-sm w-fit" onClick={() => setOpen(false)}>
            Staff Login
          </Link>
        </nav>
      )}
    </header>
  );
}
