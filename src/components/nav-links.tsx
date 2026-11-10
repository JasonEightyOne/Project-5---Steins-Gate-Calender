"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Calendar", match: (p: string) => p === "/" || p.startsWith("/events") },
  { href: "/calendars", label: "Calendars", match: (p: string) => p.startsWith("/calendars") },
  { href: "/settings", label: "Alerts", match: (p: string) => p.startsWith("/settings") },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-5 text-[0.95rem]">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={n.match(pathname) ? "page" : undefined} className="no-underline">
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
