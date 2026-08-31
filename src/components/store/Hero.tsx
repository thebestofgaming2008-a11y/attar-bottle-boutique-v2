import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BOTTLE_IMAGES, type Product } from "@/lib/products";
import type { HomepageHeroSection } from "@/lib/homepageLayout";

export function Hero({ products, config }: { products: Product[]; config?: HomepageHeroSection }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const length = products.length;

  const showPrevious = useCallback(() => {
    setActiveIndex((index) => Math.max(0, index - 1));
  }, []);
  const showNext = useCallback(() => {
    setActiveIndex((index) => Math.min(length - 1, index + 1));
  }, [length]);

  useEffect(() => {
    if (activeIndex >= length) setActiveIndex(0);
  }, [activeIndex, length]);

  if (!length) return null;

  const active = products[activeIndex];
  const headlineWords = (config?.headline || "Rare Air").split(/\s+/).filter(Boolean);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="BADR fragrance collection"
      className="relative overflow-hidden bg-foreground px-6 pb-4 pt-28 text-background sm:pt-32"
    >
      {config?.eyebrow ? (
        <p className="mb-5 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-background/65">
          {config.eyebrow}
        </p>
      ) : null}
      <h1 className="mx-auto text-center font-display text-[22vw] leading-[0.82] sm:text-[9rem]">
        {headlineWords.map((word) => (
          <span key={word} className="block">
            {word}
          </span>
        ))}
      </h1>

      {config?.subtext ? (
        <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-6 text-background/75">
          {config.subtext}
        </p>
      ) : null}

      {config?.ctaLabel !== "" ? (
        <div className="mt-8 flex justify-center">
          <a
            href={config?.ctaHref || "#shop"}
            className="motion-button border border-background/70 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-background hover:-translate-y-0.5 hover:bg-background hover:text-foreground"
          >
            {config?.ctaLabel || "Shop now"}
          </a>
        </div>
      ) : null}

      <div className="relative -mx-6 mt-10 h-[250px] w-screen overflow-hidden sm:mt-12 sm:h-[280px]">
        <div
          className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              aria-hidden={index !== activeIndex}
              className="flex h-full w-full shrink-0 items-end justify-center"
            >
              <Link
                to="/product/$id"
                params={{ id: product.id }}
                tabIndex={index === activeIndex ? 0 : -1}
                className="group flex h-full w-44 flex-col items-center justify-end gap-2 sm:w-52"
              >
                <img
                  src={BOTTLE_IMAGES[product.id] || product.image}
                  alt={index === activeIndex ? `BADR ${product.name} attar bottle` : ""}
                  className="min-h-0 w-full flex-1 object-contain transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1"
                  fetchPriority={index === 0 ? "high" : "auto"}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                />
                <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-background/55 transition-colors duration-300 group-hover:text-background">
                  {product.name}
                </span>
              </Link>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={showPrevious}
          disabled={activeIndex === 0}
          aria-label="Previous fragrance"
          className="motion-button absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center border border-background/30 bg-foreground/45 text-background backdrop-blur-sm hover:-translate-x-1 hover:border-background disabled:pointer-events-none disabled:opacity-25 sm:left-6"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={showNext}
          disabled={activeIndex === length - 1}
          aria-label="Next fragrance"
          className="motion-button absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center border border-background/30 bg-foreground/45 text-background backdrop-blur-sm hover:translate-x-1 hover:border-background disabled:pointer-events-none disabled:opacity-25 sm:right-6"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
        </button>

        <span aria-live="polite" className="sr-only">
          Showing {active.name}
        </span>
      </div>
    </section>
  );
}
