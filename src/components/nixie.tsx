/**
 * Renders text as a row of nixie tubes ("." becomes a narrow dot). Tubes ignite once on load.
 * Pass an empty `label` when the surrounding element already describes the value.
 */
export function Nixie({ value, size = "1.5rem", label }: { value: string; size?: string; label: string }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <span className="nixie-row" style={{ fontSize: size }} {...a11y}>
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
