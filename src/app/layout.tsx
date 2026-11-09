import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chronolab Calendar",
  description: "Personal calendar with imported holidays and reminders, in a retro-lab theme.",
};

const NAV = [
  { href: "/", label: "Calendar" },
  { href: "/calendars", label: "Calendars" },
  { href: "/settings", label: "Notifications" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-line/80 bg-black/30 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="amber text-lg font-semibold tracking-[0.2em]">CHRONOLAB</span>
              <span className="label hidden sm:inline">{"// time-keeping apparatus"}</span>
            </Link>
            <nav className="flex gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded px-3 py-1.5 text-muted hover:text-phosphor">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-center label">world line stable · all times Asia/Kuala_Lumpur</footer>
      </body>
    </html>
  );
}
