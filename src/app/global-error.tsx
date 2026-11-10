"use client";

import "@fontsource/b612/400.css";
import "@fontsource/b612/700.css";
import "./globals.css";
import { ErrorNotice } from "@/components/error-notice";

/** Shown when the root layout itself fails (the instrument strip reads the database on every page). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="housing">
          <div className="mx-auto max-w-6xl px-4 py-4 font-bold" style={{ color: "var(--nixie-core)" }}>Chronolab</div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-10">
          <ErrorNotice digest={error.digest} onRetry={reset} />
        </main>
      </body>
    </html>
  );
}
