import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Droplets, MapPin, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { BOTTLE_IMAGES, PRODUCTS, SCENE_IMAGES, inr } from "@/lib/products";
import { useCart } from "@/components/store/CartContext";
import { getProductBySlug } from "@/services/productService";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/store/ProductCard";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { Section, SectionHead } from "@/components/store/Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const SITE_ORIGIN =
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  "https://badr-boutique-studio-v2.thebestofgaming2008.workers.dev";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const staticProduct = PRODUCTS.find((p) => p.id === params.id);
    const liveProduct = await getProductBySlug(params.id);
    const product: Product | undefined = staticProduct
      ? {
          ...staticProduct,
          price:
            liveProduct?.sale_price_inr ??
            liveProduct?.sale_price ??
            liveProduct?.price_inr ??
            staticProduct.price,
          mrp: liveProduct?.price_inr ?? staticProduct.mrp,
          image: liveProduct?.cover_image_url || staticProduct.image,
        }
      : liveProduct
        ? {
            id: liveProduct.slug || liveProduct.id,
            name: liveProduct.name,
            category: liveProduct.category || "Unisex Attar",
            tag: (liveProduct.tags || []).slice(0, 3).join(" · ") || "BADR Attar",
            mood: liveProduct.short_description || "Rare air, crafted for the relentless",
            hook:
              liveProduct.short_description || liveProduct.description || "A BADR signature attar.",
            image: liveProduct.cover_image_url || "",
            story:
              liveProduct.description || liveProduct.short_description || "A BADR signature attar.",
            notes: (liveProduct.tags || []).slice(0, 8),
            price: liveProduct.sale_price_inr ?? liveProduct.sale_price ?? liveProduct.price_inr,
            mrp: liveProduct.price_inr,
            occasion: "everyday",
            intensity: "soft",
            longevity: "Long-lasting",
            faqs: [
              {
                q: "How do I wear this attar?",
                a: "Roll lightly over pulse points and let the oil settle naturally on the skin.",
              },
              { q: "Is it unisex?", a: "Yes. BADR attars are designed for personal, unisex wear." },
            ],
          }
        : undefined;
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

    const pageUrl = `${SITE_ORIGIN}/product/${p.id}`;
    const socialImage = new URL(SCENE_IMAGES[p.id] ?? p.image, SITE_ORIGIN).toString();
    const description = `${p.hook} ${p.category}, 6 ml roll-on, ${inr(p.price)}.`;

    return {
      meta: [
        { title: `${p.name} — BADR Attar` },
        { name: "description", content: description },
        { property: "og:title", content: `${p.name} — BADR Attar` },
        { property: "og:description", content: p.hook },
        { property: "og:type", content: "product" },
        { property: "og:url", content: pageUrl },
        { property: "og:image", content: socialImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${p.name} — BADR Attar` },
        { name: "twitter:description", content: p.hook },
        { name: "twitter:image", content: socialImage },
      ],
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const scene = SCENE_IMAGES[product.id] ?? product.image;
  const bottle = BOTTLE_IMAGES[product.id] ?? product.image;
  const related = PRODUCTS.filter((candidate) => candidate.id !== product.id).slice(0, 4);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [new URL(scene, SITE_ORIGIN).toString()],
    description: product.hook,
    brand: { "@type": "Brand", name: "BADR" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      url: `${SITE_ORIGIN}/product/${product.id}`,
    },
  };

  return (
    <StoreShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <main>
        <section className="bg-[#f1eee8] px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-28">
          <div className="mx-auto max-w-7xl">
            <Link
              to="/"
              className="motion-link mb-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/60 hover:-translate-x-1 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to collection
            </Link>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-start lg:gap-14">
              <ProductGallery
                name={product.name}
                scene={scene}
                packshot={bottle}
                detail={product.image}
              />

              <div className="lg:sticky lg:top-24 lg:py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="eyebrow text-foreground/55">{product.category}</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-white/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                    <Check className="h-3 w-3" /> 6 ml roll-on
                  </span>
                </div>

                <h1 className="mt-6 font-display text-5xl leading-[0.86] sm:text-6xl lg:text-7xl">
                  {product.name}
                </h1>
                <p className="mt-5 max-w-lg text-[11px] font-semibold uppercase leading-relaxed tracking-[0.17em] text-foreground/55">
                  {product.mood}
                </p>
                <p className="mt-7 max-w-lg font-display text-xl leading-tight sm:text-2xl">
                  {product.hook}
                </p>

                <div className="mt-8 flex items-end justify-between gap-4 border-y border-foreground/15 py-5">
                  <div>
                    <p className="font-display text-3xl leading-none">{inr(product.price)}</p>
                    <p className="mt-1.5 text-xs text-foreground/50">6 ml · roll-on attar</p>
                  </div>
                  <p className="text-right text-[10px] uppercase leading-relaxed tracking-[0.14em] text-foreground/50">
                    Made in India
                    <br />
                    Unisex parfum
                  </p>
                </div>

                <div className="mt-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/55">
                    Key notes
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {product.notes.map((note) => (
                      <li
                        key={note}
                        className="rounded-full border border-foreground/20 bg-white/40 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <div className="inline-flex items-center rounded-full border border-foreground/20 bg-white/55 p-1">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => setQty((value) => Math.max(1, value - 1))}
                      className="motion-button grid h-11 w-11 place-items-center rounded-full hover:bg-white"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQty((value) => value + 1)}
                      className="motion-button grid h-11 w-11 place-items-center rounded-full hover:bg-white"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => cart.add(product.id, qty)}
                    className="motion-button rounded-full bg-foreground px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-background hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Add {qty > 1 ? `${qty} to bag` : "to bag"} · {inr(product.price * qty)}
                  </button>
                </div>

                <p className="mt-3 text-center text-xs text-foreground/50">
                  India shipping is included. International shipping is confirmed on WhatsApp at
                  checkout.
                </p>

                <ProductBenefits />

                <Accordion type="single" collapsible className="mt-8 border-t border-foreground/15">
                  <AccordionItem value="story" className="border-foreground/15">
                    <AccordionTrigger className="py-5 text-[11px] font-semibold uppercase tracking-[0.18em] hover:no-underline">
                      The story
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 text-sm leading-relaxed text-foreground/65">
                      {product.meaning ? `${product.meaning} ` : ""}
                      {product.story}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="wear" className="border-foreground/15">
                    <AccordionTrigger className="py-5 text-[11px] font-semibold uppercase tracking-[0.18em] hover:no-underline">
                      How to wear it
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 text-sm leading-relaxed text-foreground/65">
                      Roll lightly over pulse points — wrists, inner elbows and behind the ears. Let
                      the oil settle naturally instead of rubbing it in.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="delivery" className="border-foreground/15">
                    <AccordionTrigger className="py-5 text-[11px] font-semibold uppercase tracking-[0.18em] hover:no-underline">
                      Delivery & returns
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 text-sm leading-relaxed text-foreground/65">
                      India shipping is included in the displayed price. International availability,
                      shipping and payment details are confirmed on WhatsApp before payment.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden bg-foreground text-background">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
            <div className="flex flex-col justify-center px-6 py-20 sm:px-12 sm:py-28 lg:px-16">
              <p className="eyebrow text-background/45">The scent</p>
              <h2 className="mt-5 max-w-lg font-display text-4xl leading-[0.92] sm:text-6xl">
                {product.tag.replaceAll("·", ".")}
              </h2>
              <p className="mt-8 max-w-xl text-sm leading-7 text-background/65 sm:text-base">
                {product.meaning ? `${product.meaning} ` : ""}
                {product.story}
              </p>

              <dl className="mt-12 grid grid-cols-3 gap-px bg-background/15">
                <ScentStat label="Wear" value={product.longevity} />
                <ScentStat label="Character" value={product.intensity} />
                <ScentStat label="Best for" value={product.occasion} />
              </dl>
            </div>
            <div className="relative min-h-[540px] lg:min-h-[760px]">
              <img
                src={scene}
                alt={`${product.name} campaign scene`}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
            </div>
          </div>
        </section>

        <Section className="bg-[#f7f5f0]">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">The composition</p>
              <h2 className="mt-5 font-display text-4xl leading-[0.92] sm:text-6xl">
                Notes that stay with you.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-muted-foreground">
                A compact 6 ml roll-on built for close, deliberate wear. Each note unfolds slowly on
                skin and becomes more personal as the hours pass.
              </p>
            </div>
            <ol className="divide-y divide-border border-y border-border">
              {product.notes.map((note, index) => (
                <li key={note} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center py-6">
                  <span className="text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-2xl sm:text-3xl">{note}</span>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section>
          <SectionHead
            eyebrow="Questions, answered"
            title="Know your attar."
            sub="The essentials before this bottle becomes part of your routine."
          />
          <Accordion
            type="single"
            collapsible
            defaultValue="faq-0"
            className="mx-auto mt-12 max-w-3xl border-t border-border"
          >
            {product.faqs.map((faq, index) => (
              <AccordionItem key={faq.q} value={`faq-${index}`}>
                <AccordionTrigger className="py-6 text-left text-base font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="max-w-2xl pb-6 text-sm leading-7 text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>

        <Section dark bordered={false}>
          <SectionHead
            eyebrow="The BADR collection"
            title="Choose your next mood."
            sub="Five distinct scents. One signature bottle."
            dark
          />
          <div className="mt-14 grid gap-px bg-background/15 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((candidate) => (
              <ProductCard key={candidate.id} product={candidate} />
            ))}
          </div>
        </Section>
      </main>

      <SiteFooter />

      <div className="sticky bottom-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:hidden">
        <div className="min-w-0">
          <p className="truncate font-display text-sm leading-none">{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{inr(product.price)} · 6 ml</p>
        </div>
        <button
          type="button"
          onClick={() => cart.add(product.id, qty)}
          className="motion-button shrink-0 rounded-full bg-foreground px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-background hover:-translate-y-0.5 hover:shadow-lg"
        >
          Add to bag
        </button>
      </div>
    </StoreShell>
  );
}

function ProductGallery({
  name,
  scene,
  packshot,
  detail,
}: {
  name: string;
  scene: string;
  packshot: string;
  detail: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <figure className="relative col-span-2 aspect-square overflow-hidden bg-foreground sm:aspect-[4/5]">
        <img
          src={scene}
          alt={`${name} luxury attar campaign`}
          className="h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.025]"
          fetchPriority="high"
          decoding="async"
        />
        <figcaption className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
          BADR · Made in India
        </figcaption>
      </figure>
      <figure className="aspect-square overflow-hidden bg-white p-8 sm:p-10">
        <img
          src={packshot}
          alt={`${name} bottle front view`}
          className="h-full w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      </figure>
      <figure className="aspect-square overflow-hidden bg-[#e7e1d8]">
        <img
          src={detail}
          alt={`${name} product detail`}
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      </figure>
    </div>
  );
}

function ProductBenefits() {
  const benefits = [
    { icon: Droplets, label: "6 ml roll-on" },
    { icon: MapPin, label: "Made in India" },
    { icon: Truck, label: "India ship included" },
    { icon: ShieldCheck, label: "7-day returns" },
  ];

  return (
    <ul className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-foreground/10 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
      {benefits.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex min-h-24 flex-col items-center justify-center gap-2 bg-white/45 p-3 text-center"
        >
          <Icon className="h-4 w-4" strokeWidth={1.6} />
          <span className="text-[9px] font-semibold uppercase leading-relaxed tracking-[0.13em]">
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ScentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-foreground px-4 py-5">
      <dt className="text-[9px] uppercase tracking-[0.2em] text-background/40">{label}</dt>
      <dd className="mt-2 font-display text-sm capitalize leading-tight text-background">
        {value}
      </dd>
    </div>
  );
}
