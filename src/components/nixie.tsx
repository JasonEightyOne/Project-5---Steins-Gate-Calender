/** Renders text as a row of glowing nixie tubes. "." becomes a narrow dot; "_" an unlit tube. */
export function Nixie({ value, size = "clamp(1.3rem, 6.2vw, 2.25rem)", label }: { value: string; size?: string; label?: string }) {
  return (
    <span className="nixie-row" style={{ fontSize: size }} role="img" aria-label={label ?? value}>
      {value.split("").map((ch, i) => (
        <span key={i} aria-hidden className={`nixie-tube${ch === "." ? " dot" : ""}${ch === "_" ? " off" : ""}`}>
          {ch === "_" ? "0" : ch}
        </span>
      ))}
    </span>
  );
}
