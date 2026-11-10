"use client";

import { ErrorNotice } from "@/components/error-notice";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorNotice digest={error.digest} onRetry={reset} />;
}
