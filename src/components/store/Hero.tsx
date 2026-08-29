import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BOTTLE_IMAGES, type Product } from "@/lib/products";

function cycleIndex(index: number, length: number) {
  return (index + length) % length;
}

function ProductBottle({
  product,
  position,
}: {
  product: Product;
  position: "previous" | "active" | "next";
}) {
  const image = BOTTLE_IMAGES[product.id] || product.image;
  const positionClass = {
    previous: "left-[-25%] w-[52%] opacity-75 sm:left-[3%] sm:w-[28%] sm:opacity-90 lg:left-[6%]",
    active: "left-1/2 z-10 w-[70%] -translate-x-1/2 sm:w-[38%] lg:w-[34%]",
    next: "right-[-25%] w-[52%] opacity-75 sm:right-[3%] sm:w-[28%] sm:opacity-90 lg:right-[6%]",
  }[position];

  return (
    <div
      aria-hidden={position !== "active"}
      className={`absolute inset-y-0 flex items-center justify-center transition-[left,right,width,opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${positionClass}`}
    >
      <img
        key={`${product.id}-${position}`}
        src={image}
        alt={position === "active" ? `${product.name} BADR attar bottle` : ""}
        className={`hero-bottle-enter h-full w-full object-contain ${
          position === "active" ? "scale-100" : "scale-[0.78]"
        }`}
        fetchPriority={position === "active" ? "high" : "auto"}
        decoding="async"
      />
    </div>
  );
}

export function Hero({ products }: { products: Product[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const length = products.length;

  const showPrevious = useCallback(() => {
    setActiveIndex((index) => cycleIndex(index - 1, length));
  }, [length]);
  const showNext = useCallback(() => {
    setActiveIndex((index) => cycleIndex(index + 1, length));
  }, [length]);

  useEffect(() => {
    if (activeIndex >= length) setActiveIndex(0);
  }, [activeIndex, length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showNext, showPrevious]);

  if (!length) return null;

  const active = products[activeIndex];
  const previous = products[cycleIndex(activeIndex - 1, length)];
  const next = products[cycleIndex(activeIndex + 1, length)];
  const scentLine = active.tag
    .split("·")
    .map((word) => word.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-roledescription="carousel"
      aria-label="BADR fragrance collection"
      className="relative flex h-[100svh] min-h-[650px] max-h-[860px] flex-col overflow-hidden bg-[#fbfbfa] pb-8 pt-18 text-black sm:pb-10 sm:pt-20"
    >
      <div className="relative mx-auto h-[410px] w-full max-w-[1700px] flex-1 sm:h-[540px]">
        <ProductBottle product={previous} position="previous" />
        <ProductBottle product={active} position="active" />
        <ProductBottle product={next} position="next" />

        <button
          type="button"
          onClick={showPrevious}
          aria-label="Previous fragrance"
          className="motion-button absolute left-2 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center text-black hover:-translate-x-1 sm:left-5 lg:left-8"
        >
          <ChevronLeft className="h-8 w-8" strokeWidth={1.45} />
        </button>
        <button
          type="button"
          onClick={showNext}
          aria-label="Next fragrance"
          className="motion-button absolute right-2 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center text-black hover:translate-x-1 sm:right-5 lg:right-8"
        >
          <ChevronRight className="h-8 w-8" strokeWidth={1.45} />
        </button>
      </div>

      <div
        key={active.id}
        aria-live="polite"
        className="hero-copy-enter relative z-20 px-6 text-center"
      >
        <h1 className="font-display text-[2rem] leading-none sm:text-[2.65rem]">{active.name}</h1>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/58 sm:text-[11px]">
          {scentLine}
        </p>
        <Link
          to="/product/$id"
          params={{ id: active.id }}
          className="motion-button mt-5 inline-flex min-h-10 items-center bg-black px-6 font-display text-sm text-white hover:-translate-y-0.5 hover:bg-[#262626]"
        >
          Discover the scent
        </Link>
      </div>
    </section>
  );
}
