import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/products";
import { SCENE_IMAGES } from "@/lib/products";
import { Reveal } from "./Reveal";

/**
 * Full-bleed cinematic poster per scent — images stacked edge to edge with no
 * gap, each carrying only the SKU name and its three descriptor words.
 */
export function ScentChapter({ product }: { product: Product }) {
  const words = product.tag.split("·").map((w) => w.trim().toUpperCase());
  const scene =
    product.socialImage || product.gallery?.[1] || SCENE_IMAGES[product.id] || product.image;

  return (
    <section className="relative block overflow-hidden bg-foreground text-background">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="group relative block aspect-[4/5] w-full sm:aspect-[16/10]"
        aria-label={`Explore ${product.name}`}
      >
        <img
          src={scene}
          alt={`${product.name} attar — cinematic campaign poster`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-8 text-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2 sm:p-12">
          <Reveal>
            <h2 className="font-display text-4xl leading-[0.9] text-white sm:text-6xl">
              {product.name}
            </h2>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
              {words.join(". ")}.
            </p>
          </Reveal>
        </div>
      </Link>
    </section>
  );
}
