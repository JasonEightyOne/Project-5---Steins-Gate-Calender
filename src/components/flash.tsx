export function Flash({ msg, error }: { msg?: string; error?: string }) {
  if (!msg && !error) return null;
  return (
    <div
      role="status"
      className={`panel mb-4 px-4 py-2 text-sm ${error ? "border-danger/60 text-danger" : "crt"}`}
    >
      {error ? `! ${error}` : `> ${msg}`}
    </div>
  );
}

export type FlashParams = { msg?: string; error?: string };
