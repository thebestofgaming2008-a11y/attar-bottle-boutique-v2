import { Link } from "@tanstack/react-router";
import bottleCut from "@/assets/badr-bottle-cut.png.asset.json";
import logo from "@/assets/badr-logo.png.asset.json";
import { BottleSpin } from "./BottleSpin";

export const HERO_BOTTLE = bottleCut.url;
export const BADR_LOGO = logo.url;

/**
 * The signature BADR hero: black field, wordmark, one stacked headline,
 * one small CTA, the endlessly spinning signature bottle.
 */
export function Hero({
  headline,
  ctaLabel = "Shop now",
  onCta,
  ctaTo,
}: {
  headline?: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaTo?: string;
}) {
  const lines = headline ? headline.split(" ") : ["Rare", "Air"];
  const headlineSize = headline ? "text-[18vw] sm:text-[7rem]" : "text-[22vw] sm:text-[9rem]";

  return (
    <section className="relative overflow-hidden bg-foreground px-6 pb-0 pt-28 text-background sm:pt-32">
      <h1 className={`mx-auto text-center font-display leading-[0.82] ${headlineSize}`}>
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>

      <div className="mt-8 flex justify-center">
        {ctaTo ? (
          <Link
            to={ctaTo}
            className="motion-button border border-background/70 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-background hover:-translate-y-0.5 hover:bg-background hover:text-foreground"
          >
            {ctaLabel}
          </Link>
        ) : (
          <button
            onClick={onCta}
            className="motion-button border border-background/70 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-background hover:-translate-y-0.5 hover:bg-background hover:text-foreground"
          >
            {ctaLabel}
          </button>
        )}
      </div>

      <BottleSpin className="-mx-6 mt-14 w-screen" />
      <div className="h-4" />
    </section>
  );
}
