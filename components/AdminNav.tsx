"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setOpenHref(null);
  }, [pathname]);

  useEffect(() => {
    function close() {
      setOpenHref(null);
    }
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedButton = [...buttonRefs.current.values()].some((el) => el.contains(target));
      // A click inside the dropdown panel itself (e.g. one of its Links) must NOT
      // close it here - this fires on mousedown, and closing would unmount the
      // portal (and the link being clicked) before the browser's click event/
      // navigation gets a chance to fire at all.
      const clickedPanel = panelRef.current?.contains(target) ?? false;
      if (!clickedButton && !clickedPanel) close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    // The dropdown is positioned to a specific button's coordinates - if the page
    // scrolls or resizes while it's open, those coordinates go stale, so just close
    // it rather than tracking a moving target.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  function isActive(item: NavItem) {
    return pathname === item.href || (item.children?.some((c) => pathname === c.href) ?? false);
  }

  function toggle(href: string) {
    if (openHref === href) {
      setOpenHref(null);
      return;
    }
    const btn = buttonRefs.current.get(href);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpenHref(href);
  }

  const openItem = links.find((l) => l.href === openHref);

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
            <button
              key={item.href}
              type="button"
              ref={(el) => {
                if (el) buttonRefs.current.set(item.href, el);
                else buttonRefs.current.delete(item.href);
              }}
              className={pillClass}
              onClick={() => toggle(item.href)}
            >
              {item.label}
              <span className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
                ▾
              </span>
            </button>
          );
        })}
      </nav>

      {mounted &&
        openItem &&
        menuPos &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <Link
              href={openItem.href}
              onClick={() => setOpenHref(null)}
              className={`block px-3 py-2 text-sm ${
                pathname === openItem.href ? "text-brand-600 font-medium" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {openItem.label}
            </Link>
            {openItem.children!.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setOpenHref(null)}
                className={`block px-3 py-2 text-sm ${
                  pathname === c.href ? "text-brand-600 font-medium" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>,
          document.body
        )}
    </header>
  );
}
