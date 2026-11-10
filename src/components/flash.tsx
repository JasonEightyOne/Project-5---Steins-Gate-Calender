/** One-line result of the last action, written into the page like a note. Errors say what happened and how to fix it. */
export function Flash({ msg, error }: { msg?: string; error?: string }) {
  if (!msg && !error) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className="mb-6 border-l-[3px] py-1 pl-3"
      style={{ borderColor: error ? "var(--holiday)" : "var(--own)", color: error ? "var(--holiday)" : "var(--ink)" }}
    >
      {error ?? msg}
    </p>
  );
}
