/** Official BADR wordmark supplied by the brand. */
export function Wordmark({
  size = "md",
  estd = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  estd?: boolean;
  className?: string;
}) {
  const width = size === "sm" ? "w-10" : size === "lg" ? "w-20 sm:w-24" : "w-[52px] sm:w-[58px]";
  return (
    <span className={`inline-flex flex-col items-center text-center leading-none ${className}`}>
      <img
        src="/brand/badr-wordmark.png"
        alt="BADR"
        width={138}
        height={118}
        className={`block h-auto ${width}`}
      />
      {estd && (
        <span className="mt-2 block text-[9px] uppercase tracking-[0.34em] opacity-60">
          Estd 1448 AH
        </span>
      )}
    </span>
  );
}
