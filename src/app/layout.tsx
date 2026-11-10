import type { Metadata } from "next";
import "@fontsource/b612/400.css";
import "@fontsource/b612/700.css";
import "@fontsource/b612-mono/400.css";
import "./globals.css";
import { Instrument } from "@/components/instrument";

export const metadata: Metadata = {
  title: "Chronolab Calendar",
  description: "Personal calendar with Malaysian public holidays, your own days, and reminders.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Instrument />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 t-small text-pencil">Dates and reminder times are in Malaysia time.</footer>
      </body>
    </html>
  );
}
