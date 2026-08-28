import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { PRODUCTS, inr } from "@/lib/products";
import { useCart } from "@/components/store/CartContext";
import { StoreShell, SiteFooter } from "@/components/store/StoreShell";
import { Hero } from "@/components/store/Hero";
import { VideoBand } from "@/components/store/VideoBand";
import { Section, SectionHead } from "@/components/store/Section";
import { Reveal } from "@/components/store/Reveal";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = PRODUCTS.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) {
      return {
        meta: [{ title: "Unavailable — BADR" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: `${p.name} — BADR Attar` },
        { name: "description", content: `${p.hook} ${p.category}, 6 ml roll-on, ${inr(p.price)}.` },
        { property: "og:title", content: `${p.name} — BADR Attar` },
        { property: "og:description", content: p.hook },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <StoreShell>
      <Hero headline={product.name} ctaLabel="Add to bag" onCta={() => cart.add(product.id, qty)} />

      <VideoBand />

      <Section bordered={false}>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <Reveal>
            <div className="bg-secondary px-8 py-16">
              <img
                src={product.image}
                alt={`${product.name} attar, 6 ml roll-on`}
                className="mx-auto w-full max-w-[280px]"
              />
            </div>
          </Reveal>

          <Reveal delay={100}>
            <p className="eyebrow">{product.category}</p>
            <h1 className="mt-4 font-display text-4xl leading-[0.95] sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {product.mood}
            </p>
            <p className="mt-6 font-display text-lg leading-snug">{product.hook}</p>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {product.meaning ? `${product.meaning} ` : ""}
              {product.story}
            </p>

            <p className="eyebrow mt-7">Key notes</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {product.notes.map((n) => (
                <li
                  key={n}
                  className="border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em]"
                >
                  {n}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-baseline gap-3">
              <span className="font-display text-2xl">{inr(product.price)}</span>
            </div>

            <div className="mt-6 flex items-stretch gap-3">
              <div className="inline-flex items-center border border-border">
                <button
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-3"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-8 text-center text-sm">{qty}</span>
                <button
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3.5 py-3"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => cart.add(product.id, qty)}
                className="flex-1 bg-foreground px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-85"
              >
                Add to bag
              </button>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section>
        <SectionHead title="FAQs" />
        <div className="mx-auto mt-12 max-w-2xl border-t border-border">
          {product.faqs.map((f, i) => (
            <div key={f.q} className="border-b border-border">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="text-sm font-semibold">{f.q}</span>
                <Plus
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                    openFaq === i ? "rotate-45" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  openFaq === i ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <p className="overflow-hidden text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <SiteFooter />

      {/* Sticky mobile add-to-bag */}
      <div className="sticky bottom-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border bg-background/95 px-5 py-3 backdrop-blur sm:hidden">
        <div className="min-w-0">
          <p className="truncate font-display text-sm leading-none">{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{inr(product.price)} · 6 ml</p>
        </div>
        <button
          onClick={() => cart.add(product.id, qty)}
          className="shrink-0 bg-foreground px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-background"
        >
          Add to bag
        </button>
      </div>
    </StoreShell>
  );
}
