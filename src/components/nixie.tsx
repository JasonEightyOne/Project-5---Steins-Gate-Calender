/** Renders text as a row of nixie tubes. "." becomes a narrow dot. Tubes ignite left to right once on load. */
export function Nixie({ value, size = "clamp(1.25rem, 5.6vw, 2.1rem)", label }: { value: string; size?: string; label: string }) {
  return (
    <span className="nixie-row" style={{ fontSize: size }} role="img" aria-label={label}>
      {value.split("").map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className={`nixie-tube${ch === "." ? " dot" : ""}`}
          style={{ "--i": i } as React.CSSProperties}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
