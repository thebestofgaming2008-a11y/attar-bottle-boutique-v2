import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  homepageSectionName,
  type HomepageLayout,
  type HomepageSection,
  type HomepageVideoSection,
} from "@/lib/homepageLayout";
import type { HomepageFilmConfig } from "@/lib/homepageFilm";
import type { Product } from "@/lib/products";
import { Hero } from "./Hero";
import { BrandFilm } from "./BrandFilm";
import { ScentChapter } from "./ScentChapter";
import { ProductCard } from "./ProductCard";
import { PromoBanner } from "./PromoBanner";

export type HomepageEditingContext = {
  selectedId: string | null;
  onSelect: (sectionId: string) => void;
};

function SectionFrame({
  section,
  editing,
  children,
}: {
  section: HomepageSection;
  editing?: HomepageEditingContext;
  children: ReactNode;
}) {
  if (!editing) return children;
  const selected = editing.selectedId === section.id;
  return (
    <div
      className={`group/editor relative cursor-pointer outline-offset-[-3px] ${
        selected
          ? "outline outline-3 outline-sky-500"
          : "hover:outline hover:outline-2 hover:outline-sky-400"
      } ${section.visible ? "" : "opacity-45"}`}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${homepageSectionName(section)}`}
      onClickCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
        editing.onSelect(section.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          editing.onSelect(section.id);
        }
      }}
    >
      {children}
      <span className="pointer-events-none absolute left-3 top-3 z-40 bg-sky-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white opacity-0 shadow-lg transition-opacity group-hover/editor:opacity-100">
        Edit {homepageSectionName(section)}
      </span>
    </div>
  );
}

function videoConfig(section: HomepageVideoSection): HomepageFilmConfig {
  return {
    enabled: section.visible,
    posterUrl: section.poster.imageUrl,
    videoWebmUrl: section.videoWebmUrl,
    videoMp4Url: section.videoMp4Url,
    placement: "after_hero",
    mobileFit: section.mobileFit,
    desktopFit: section.desktopFit,
    focalPosition: section.focalPosition,
    posterFit: "cover",
    posterPositionX: section.poster.mobileCrop.x,
    posterPositionY: section.poster.mobileCrop.y,
    posterZoom: section.poster.mobileCrop.zoom,
  };
}

export function HomepageLayoutRenderer({
  layout,
  products,
  editing,
}: {
  layout: HomepageLayout;
  products: Product[];
  editing?: HomepageEditingContext;
}) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const sectionNodes = layout.sections.flatMap((section) => {
    if (!section.visible && !editing) return [];
    let node: ReactNode = null;
    if (section.type === "hero") {
      const selected = section.productIds.flatMap((id) => {
        const product = productMap.get(id);
        return product ? [product] : [];
      });
      node = <Hero products={selected.length ? selected : products} config={section} />;
    } else if (section.type === "video") {
      node = <BrandFilm config={videoConfig(section)} posterMedia={section.poster} />;
    } else if (section.type === "scent") {
      const product = productMap.get(section.productId);
      if (!product) return [];
      node = <ScentChapter product={product} section={section} />;
    } else if (section.type === "promo") {
      node = (
        <PromoBanner
          section={section}
          product={section.productId ? productMap.get(section.productId) : undefined}
        />
      );
    } else {
      const selected = section.productIds.flatMap((id) => {
        const product = productMap.get(id);
        return product ? [product] : [];
      });
      node = (
        <HomepageCollection section={section} products={selected.length ? selected : products} />
      );
    }
    return [
      <SectionFrame key={section.id} section={section} editing={editing}>
        {node}
      </SectionFrame>,
    ];
  });
  return <>{sectionNodes}</>;
}

function HomepageCollection({
  section,
  products,
}: {
  section: Extract<HomepageSection, { type: "collection" }>;
  products: Product[];
}) {
  return (
    <section id="shop" className="scroll-mt-14 bg-black px-3 py-14 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-7xl">
        {section.eyebrow ? (
          <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
            {section.eyebrow}
          </p>
        ) : null}
        <h2 className="text-center font-display text-2xl leading-none sm:text-4xl">
          {section.headline || "Shop the collection"}
        </h2>
        {section.subtext ? (
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-white/65">
            {section.subtext}
          </p>
        ) : null}
        <div className="mt-8 grid grid-cols-2 gap-x-1 gap-y-9 sm:gap-x-2 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} dark />
          ))}
        </div>
        {section.ctaLabel ? (
          <div className="mt-12 text-center">
            <Link
              to={section.ctaHref.startsWith("/") ? section.ctaHref : "/shop"}
              className="inline-flex min-h-11 items-center bg-white px-7 text-[10px] font-semibold uppercase tracking-[0.1em] text-black hover:bg-white/75"
            >
              {section.ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
