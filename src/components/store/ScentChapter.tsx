import type { Product } from "@/lib/products";
import { SCENE_IMAGES } from "@/lib/products";
import type { CSSProperties } from "react";
import type { HomepageScentSection } from "@/lib/homepageLayout";
import { Reveal } from "./Reveal";

/**
 * Full-bleed cinematic poster per scent — images stacked edge to edge with no
 * gap, each carrying only the SKU name and its three descriptor words.
 */
export function ScentChapter({
  product,
  section,
}: {
  product: Product;
  section?: HomepageScentSection;
}) {
  const words = product.tag.split("·").map((w) => w.trim().toUpperCase());
  const scene =
    section?.media.imageUrl ||
    product.socialImage ||
    product.gallery?.[1] ||
    SCENE_IMAGES[product.id] ||
    product.image;
  const mobileScene = section?.media.mobileImageUrl || scene;
  const headline = section?.headline || product.name;
  const subtext = section?.subtext || `${words.join(". ")}.`;
  const href = section?.ctaHref || `/product/${product.id}`;
  const alignment = section?.textAlign ?? "center";
  const cropStyle = section
    ? ({
        "--homepage-mobile-position": `${section.media.mobileCrop.x}% ${section.media.mobileCrop.y}%`,
        "--homepage-desktop-position": `${section.media.desktopCrop.x}% ${section.media.desktopCrop.y}%`,
        "--homepage-mobile-zoom": section.media.mobileCrop.zoom / 100,
        "--homepage-desktop-zoom": section.media.desktopCrop.zoom / 100,
      } as CSSProperties)
    : undefined;

  return (
    <section className="relative block overflow-hidden bg-foreground text-background">
      <a
        href={href}
        className="group relative block aspect-[4/5] w-full sm:aspect-[16/10]"
        aria-label={`Explore ${headline}`}
      >
        <picture>
          <source media="(max-width: 639px)" srcSet={mobileScene} />
          <img
            src={scene}
            alt={`${headline} — cinematic campaign poster`}
            className="homepage-cropped-media absolute inset-0 h-full w-full object-cover"
            style={cropStyle}
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col gap-3 p-8 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2 sm:p-12 ${
            alignment === "left"
              ? "items-start text-left"
              : alignment === "right"
                ? "items-end text-right"
                : "items-center text-center"
          }`}
        >
          <Reveal>
            {section?.eyebrow ? (
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                {section.eyebrow}
              </p>
            ) : null}
            <h2 className="font-display text-4xl leading-[0.9] text-white sm:text-6xl">
              {headline}
            </h2>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
              {subtext}
            </p>
            {section?.ctaLabel ? (
              <span className="mt-5 inline-flex border border-white/65 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                {section.ctaLabel}
              </span>
            ) : null}
          </Reveal>
        </div>
      </a>
    </section>
  );
}
