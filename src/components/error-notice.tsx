/** Shared body for the error pages: says what likely went wrong and how to fix it. */
export function ErrorNotice({ digest, onRetry }: { digest?: string; onRetry: () => void }) {
  return (
    <div className="readable">
      <h1 className="t-h1 mb-4">The calendar couldn&apos;t load</h1>
      <p className="mb-3">
        Usually this means the app can&apos;t reach its database. On Vercel, check that <code>TURSO_DATABASE_URL</code> and{" "}
        <code>TURSO_AUTH_TOKEN</code> are set in Settings, Environment Variables, then redeploy.
      </p>
      <p className="mb-6 text-pencil">
        Setup steps are in the README under &ldquo;Deploy on Vercel&rdquo;.
        {digest && <> To find the exact error, search the Vercel logs for <code>{digest}</code>.</>}
      </p>
      <button type="button" className="btn btn-ink" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
