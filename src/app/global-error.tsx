"use client";

import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";
import { ErrorNotice } from "@/components/error-notice";

/** Shown when the root layout itself fails (the instrument strip reads the database on every page). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="site-header">
          <div className="mx-auto max-w-6xl px-4 py-4"><span className="wordmark text-[1.1rem]">Chronolab</span></div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-10">
          <ErrorNotice digest={error.digest} onRetry={reset} />
        </main>
      </body>
    </html>
  );
}
