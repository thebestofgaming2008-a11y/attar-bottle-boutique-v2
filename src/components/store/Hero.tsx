import { Link } from "@tanstack/react-router";
import heroImage from "@/assets/scene-oud-zafar.webp";

/** Full-screen campaign opener following Sarkar's restrained hero structure. */
export function Hero({
  ctaLabel = "Discover",
  onCta,
  ctaTo,
}: {
  headline?: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaTo?: string;
}) {
  const ctaClass =
    "inline-flex min-h-11 items-center justify-center border border-white px-7 text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-white hover:text-black";

  return (
    <section className="relative min-h-[72svh] overflow-hidden bg-black sm:min-h-[calc(100svh-76px)]">
      <h1 className="sr-only">BADR attar — rare air, crafted for the relentless</h1>
      <img
        src={heroImage}
        alt="BADR Oud Zafar campaign"
        className="absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
        decoding="async"
      />
      <div className="absolute inset-0 bg-black/28" />
      <div className="absolute inset-x-0 bottom-10 flex justify-center sm:bottom-16">
        {ctaTo ? (
          <Link to={ctaTo} className={ctaClass}>
            {ctaLabel}
          </Link>
        ) : (
          <button type="button" onClick={onCta} className={ctaClass}>
            {ctaLabel}
          </button>
        )}
      </div>
    </section>
  );
}
