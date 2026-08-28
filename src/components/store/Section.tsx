import type { ReactNode } from "react";

/**
 * Shared section rhythm: identical vertical breathing room and hairline rule
 * so the page reads as chapters instead of stacked blocks.
 */
export function Section({
  children,
  id,
  dark = false,
  bordered = true,
  className = "",
}: {
  children: ReactNode;
  id?: string;
  dark?: boolean;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={[
        "px-6 py-24 sm:py-32",
        dark ? "bg-foreground text-background" : "bg-background text-foreground",
        bordered && !dark ? "border-t border-border" : "",
        className,
      ].join(" ")}
    >
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "center",
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
  dark?: boolean;
}) {
  const a = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <header className={a}>
      {eyebrow && <p className={`eyebrow ${dark ? "text-background/60" : ""}`}>{eyebrow}</p>}
      <h2 className="mt-4 font-display text-3xl leading-[0.95] sm:text-5xl">{title}</h2>
      {sub && (
        <p
          className={`mt-5 max-w-sm text-sm leading-relaxed ${align === "center" ? "mx-auto" : ""} ${
            dark ? "text-background/70" : "text-muted-foreground"
          }`}
        >
          {sub}
        </p>
      )}
    </header>
  );
}
