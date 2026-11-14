import type { Metadata } from "next";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource/b612-mono/400.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Chronolab Calendar",
  description: "Personal calendar with Malaysian public holidays, your own days, and reminders.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 t-small text-muted">Dates and reminder times are in Malaysia time.</footer>
      </body>
    </html>
  );
}
