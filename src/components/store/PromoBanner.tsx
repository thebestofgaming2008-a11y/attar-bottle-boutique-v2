import type { CSSProperties } from "react";
import type { HomepagePromoSection } from "@/lib/homepageLayout";
import type { Product } from "@/lib/products";

export function PromoBanner({
  section,
  product,
}: {
  section: HomepagePromoSection;
  product?: Product;
}) {
  const image =
    section.media.imageUrl || product?.socialImage || product?.gallery?.[1] || product?.image;
  const mobileImage = section.media.mobileImageUrl || image;
  const headline = section.headline || product?.name || "BADR";
  const subtext = section.subtext || product?.tag || "";
  const href = section.ctaHref || (product ? `/product/${product.id}` : "#shop");
  const cropStyle = {
    "--homepage-mobile-position": `${section.media.mobileCrop.x}% ${section.media.mobileCrop.y}%`,
    "--homepage-desktop-position": `${section.media.desktopCrop.x}% ${section.media.desktopCrop.y}%`,
    "--homepage-mobile-zoom": section.media.mobileCrop.zoom / 100,
    "--homepage-desktop-zoom": section.media.desktopCrop.zoom / 100,
  } as CSSProperties;
  const alignClass =
    section.textAlign === "left"
      ? "items-start text-left"
      : section.textAlign === "right"
        ? "items-end text-right"
        : "items-center text-center";

  return (
    <section className="relative overflow-hidden bg-black text-white">
      <a href={href} className="group relative block aspect-[4/5] w-full sm:aspect-[16/10]">
        {image ? (
          <picture>
            {mobileImage ? <source media="(max-width: 639px)" srcSet={mobileImage} /> : null}
            <img
              src={image}
              alt=""
              className="homepage-cropped-media absolute inset-0 h-full w-full object-cover"
              style={cropStyle}
              loading="lazy"
              decoding="async"
            />
          </picture>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/30" />
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col gap-3 p-8 sm:p-12 ${alignClass}`}
        >
          {section.eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
              {section.eyebrow}
            </p>
          ) : null}
          <h2 className="max-w-3xl font-display text-4xl leading-[0.9] sm:text-6xl">{headline}</h2>
          {subtext ? <p className="max-w-xl text-sm leading-6 text-white/80">{subtext}</p> : null}
          {section.ctaLabel ? (
            <span className="mt-2 inline-flex border border-white/65 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]">
              {section.ctaLabel}
            </span>
          ) : null}
        </div>
      </a>
    </section>
  );
}
