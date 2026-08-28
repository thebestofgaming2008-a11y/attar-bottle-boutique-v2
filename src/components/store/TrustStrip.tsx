const ITEMS = ["0% alcohol", "6 ml roll-on", "India shipping included", "Made in India"];

export function TrustStrip() {
  return (
    <div className="border-y border-border bg-secondary">
      <ul className="no-scrollbar mx-auto flex max-w-5xl items-center gap-8 overflow-x-auto px-6 py-5 sm:justify-center">
        {ITEMS.map((t) => (
          <li
            key={t}
            className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
