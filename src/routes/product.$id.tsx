import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Minus, Plus, Star } from "lucide-react";
import {
  BOTTLE_IMAGES,
  PRODUCTS,
  SCENE_IMAGES,
  inr,
  resolveStoreProduct,
  storefrontProductFromSource,
  type Product,
} from "@/lib/products";
import { useCart } from "@/components/store/CartContext";
import { ProductCard } from "@/components/store/ProductCard";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getProductBySlug, listActiveProducts } from "@/services/productService";
import { listPublishedReviews, type ProductReview } from "@/services/reviewService";

const SITE_ORIGIN =
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  "https://badr-boutique-studio-v2.thebestofgaming2008.workers.dev";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const [liveProduct, activeProducts] = await Promise.all([
      getProductBySlug(params.id),
      listActiveProducts(),
    ]);
    const staticProduct = PRODUCTS.find((product) => product.id === params.id);
    const product = liveProduct
      ? resolveStoreProduct(liveProduct as unknown as Record<string, unknown>, staticProduct)
      : staticProduct;
    if (!product) throw notFound();

    const liveCatalog = activeProducts.map((item) =>
      storefrontProductFromSource(item as unknown as Record<string, unknown>),
    );
    const catalogIds = new Set(liveCatalog.map((item) => item.id));
    const completeCatalog = [
      ...liveCatalog,
      ...PRODUCTS.filter((item) => !catalogIds.has(item.id)),
    ];
    const related = completeCatalog.filter((item) => item.id !== product.id).slice(0, 4);
    const reviews = liveProduct?.id
      ? await listPublishedReviews(liveProduct.id).catch(() => [])
      : [];

    return { product, related, reviews };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product;
    if (!product) {
      return {
        meta: [{ title: "Unavailable — BADR" }, { name: "robots", content: "noindex" }],
      };
    }

    const pageUrl = `${SITE_ORIGIN}/product/${product.id}`;
    const socialImage = new URL(
      product.socialImage || SCENE_IMAGES[product.id] || product.image,
      SITE_ORIGIN,
    ).toString();
    const description =
      product.seoDescription ||
      `${product.hook} ${product.category}, ${product.volume || "6 ml"}, ${inr(product.price)}.`;

    return {
      meta: [
        { title: product.seoTitle || `${product.name} Attar — BADR` },
        { name: "description", content: description },
        {
          name: "keywords",
          content: (product.seoKeywords?.length
            ? product.seoKeywords
            : [product.name, product.category, ...product.notes, "BADR attar"]
          ).join(", "),
        },
        { property: "og:title", content: product.seoTitle || `${product.name} Attar — BADR` },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: pageUrl },
        { property: "og:image", content: socialImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: product.seoTitle || `${product.name} Attar — BADR` },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: socialImage },
      ],
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, related, reviews } = Route.useLoaderData();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const socialImage = product.socialImage || SCENE_IMAGES[product.id] || product.image;
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: (product.gallery?.length ? product.gallery : [socialImage]).map((image) =>
      new URL(image, SITE_ORIGIN).toString(),
    ),
    description: product.seoDescription || product.hook,
    category: product.category,
    brand: { "@type": "Brand", name: "BADR" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability:
        product.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `${SITE_ORIGIN}/product/${product.id}`,
    },
    ...(reviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue:
              reviews.reduce((total, review) => total + review.rating, 0) / reviews.length,
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  return (
    <StoreShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <main>
        <section className="bg-[#f3f0e9] px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-28">
          <div className="mx-auto max-w-7xl">
            <Link
              to="/shop"
              className="motion-link mb-7 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55 hover:-translate-x-1 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All scents
            </Link>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] lg:items-start lg:gap-20">
              <ProductGallery product={product} />

              <div className="min-w-0 lg:sticky lg:top-24 lg:py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/50">
                  {product.category}
                </p>
                <h1 className="mt-4 font-display text-5xl leading-[0.86] sm:text-7xl">
                  {product.name}
                </h1>
                <p className="mt-5 text-[11px] font-semibold uppercase leading-5 tracking-[0.16em] text-foreground/52">
                  {product.mood}
                </p>
                <p className="mt-8 max-w-xl font-display text-2xl leading-[1.02] sm:text-3xl">
                  {product.hook}
                </p>
                <p className="mt-7 max-w-xl text-sm leading-7 text-foreground/68">
                  {product.meaning ? `${product.meaning} ` : ""}
                  {product.story}
                </p>

                {product.notes.length ? (
                  <div className="mt-8">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
                      Key notes
                    </p>
                    <p className="mt-2 font-display text-xl leading-relaxed">
                      {product.notes.join(" · ")}
                    </p>
                  </div>
                ) : null}

                <div className="mt-9 flex items-baseline gap-3">
                  <span className="font-display text-4xl">{inr(product.price)}</span>
                  {product.mrp > product.price ? (
                    <span className="text-sm text-foreground/38 line-through">
                      {inr(product.mrp)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-foreground/48">
                  {product.volume || "6 ml"} · {product.format || "Roll-on attar"} · Made in{" "}
                  {product.countryOfOrigin || "India"}
                </p>

                <div className="mt-8 grid grid-cols-[112px_minmax(0,1fr)] gap-3">
                  <div className="grid grid-cols-3 bg-white/70">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => setQty((value) => Math.max(1, value - 1))}
                      className="motion-button grid min-h-14 place-items-center"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span
                      className="grid min-h-14 place-items-center text-sm font-semibold"
                      aria-live="polite"
                    >
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQty((value) => value + 1)}
                      className="motion-button grid min-h-14 place-items-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={product.inStock === false}
                    onClick={() => cart.add(product.id, qty)}
                    className="motion-button min-h-14 bg-foreground px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-background hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {product.inStock === false
                      ? "Sold out"
                      : `Add to bag · ${inr(product.price * qty)}`}
                  </button>
                </div>

                <p className="mt-4 text-xs leading-5 text-foreground/48">
                  India shipping included. International shipping and payment are confirmed on
                  WhatsApp at checkout.
                </p>
                <MobileProductGallery product={product} />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-foreground px-5 py-20 text-background sm:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-background/45">
              {product.longevity} · {product.occasion}
            </p>
            <h2 className="mx-auto mt-6 max-w-3xl font-display text-4xl leading-[0.94] sm:text-6xl">
              {product.tag
                .split("·")
                .map((word) => word.trim())
                .join(". ")}
              .
            </h2>
          </div>
        </section>

        {product.faqs.length ? <ProductFaqs product={product} /> : null}
        {reviews.length ? <ProductReviews reviews={reviews} /> : null}

        <section className="bg-[#ece8df] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="eyebrow">More from BADR</p>
                <h2 className="mt-4 font-display text-4xl leading-none sm:text-6xl">
                  Find another mood.
                </h2>
              </div>
              <Link
                to="/shop"
                className="motion-link text-[10px] font-semibold uppercase tracking-[0.18em]"
              >
                Shop the collection
              </Link>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((candidate) => (
                <ProductCard key={candidate.id} product={candidate} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <div className="sticky bottom-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 bg-background/96 px-4 py-3 shadow-[0_-12px_30px_rgba(0,0,0,0.09)] backdrop-blur-xl sm:hidden">
        <div className="min-w-0">
          <p className="truncate font-display text-sm leading-none">{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{inr(product.price)}</p>
        </div>
        <button
          type="button"
          disabled={product.inStock === false}
          onClick={() => cart.add(product.id, qty)}
          className="motion-button shrink-0 bg-foreground px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-background disabled:opacity-40"
        >
          {product.inStock === false ? "Sold out" : "Add to bag"}
        </button>
      </div>
    </StoreShell>
  );
}

function ProductGallery({ product }: { product: Product }) {
  const fallbackImages = [
    product.image,
    SCENE_IMAGES[product.id],
    BOTTLE_IMAGES[product.id],
  ].filter((image): image is string => Boolean(image));
  const images = Array.from(new Set(product.gallery?.length ? product.gallery : fallbackImages));
  const [featuredImage, ...supportingImages] = images;

  return (
    <div className="min-w-0 space-y-3">
      <figure className="aspect-[4/5] overflow-hidden bg-white p-8 sm:p-14">
        <img
          src={featuredImage || product.image}
          alt={`${product.name} attar`}
          className="h-full w-full object-contain transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.025]"
          fetchPriority="high"
          decoding="async"
        />
      </figure>
      {supportingImages.length ? (
        <div className="hidden grid-cols-2 gap-3 lg:grid">
          {supportingImages.slice(0, 4).map((image, index) => (
            <figure key={image} className="aspect-square overflow-hidden bg-[#e7e1d8]">
              <img
                src={image}
                alt={`${product.name} ${index === 0 ? "campaign" : "detail"}`}
                className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.035]"
                loading="lazy"
                decoding="async"
              />
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileProductGallery({ product }: { product: Product }) {
  const images = Array.from(
    new Set(
      [...(product.gallery || []), SCENE_IMAGES[product.id], BOTTLE_IMAGES[product.id]].filter(
        (image): image is string => Boolean(image) && image !== product.image,
      ),
    ),
  );
  if (!images.length) return null;

  return (
    <div className="no-scrollbar -mx-4 mt-10 flex snap-x gap-3 overflow-x-auto px-4 lg:hidden">
      {images.map((image, index) => (
        <figure
          key={image}
          className="aspect-square w-[78vw] shrink-0 snap-center overflow-hidden bg-white"
        >
          <img
            src={image}
            alt={`${product.name} ${index === 0 ? "campaign" : "detail"}`}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </figure>
      ))}
    </div>
  );
}

function ProductFaqs({ product }: { product: Product }) {
  return (
    <section className="bg-[#faf8f3] px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.65fr_1.35fr]">
        <div>
          <p className="eyebrow">Questions</p>
          <h2 className="mt-4 font-display text-4xl leading-none sm:text-5xl">
            Before you wear it.
          </h2>
        </div>
        <Accordion type="single" collapsible defaultValue="faq-0" className="space-y-3">
          {product.faqs.slice(0, 3).map((faq, index) => (
            <AccordionItem
              key={faq.q}
              value={`faq-${index}`}
              className="border-0 bg-white px-5 sm:px-7"
            >
              <AccordionTrigger className="py-6 text-left text-sm font-semibold hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl pb-7 text-sm leading-7 text-foreground/62">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function ProductReviews({ reviews }: { reviews: ProductReview[] }) {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <Star className="h-4 w-4 fill-current" />
          <p className="eyebrow">Verified customers</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 6).map((review) => (
            <blockquote key={review.id} className="bg-[#f5f2eb] p-6 sm:p-8">
              <p className="text-sm leading-7">
                “{review.body || review.title || "A verified BADR purchase."}”
              </p>
              <footer className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/50">
                {review.customer_name || "Verified customer"} · {review.rating}/5
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
