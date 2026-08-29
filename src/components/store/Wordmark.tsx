/** Tight BADR wordmark matching the condensed mark printed on every bottle. */
export function Wordmark({
  size = "md",
  estd = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  estd?: boolean;
  className?: string;
}) {
  const s = size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : "text-2xl";
  return (
    <span className={`inline-block text-center leading-none ${className}`}>
      <span className={`badr-wordmark ${s}`}>BADR</span>
      {estd && (
        <span className="mt-2 block text-[9px] uppercase tracking-[0.34em] opacity-60">
          Estd 1448 AH
        </span>
      )}
    </span>
  );
}
