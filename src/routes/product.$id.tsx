import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Star } from "lucide-react";
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

      <main className="pb-18 sm:pb-0">
        <section className="bg-white">
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.12fr)_minmax(390px,0.88fr)]">
            <ProductGallery product={product} />
            <ProductInformation
              product={product}
              related={related}
              quantity={qty}
              onDecrease={() => setQty((value) => Math.max(1, value - 1))}
              onIncrease={() => setQty((value) => value + 1)}
              onAdd={() => cart.add(product.id, qty)}
            />
          </div>
        </section>

        <ProductDescription product={product} />
        <ProductProfile product={product} />
        {product.faqs.length ? <ProductFaqs product={product} /> : null}

        <section className="bg-white px-3 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center font-display text-2xl sm:text-4xl">You may also like</h2>
            <div className="mt-9 grid grid-cols-2 gap-x-2 gap-y-10 lg:grid-cols-4">
              {related.map((candidate) => (
                <ProductCard key={candidate.id} product={candidate} />
              ))}
            </div>
          </div>
        </section>

        {reviews.length ? <ProductReviews reviews={reviews} /> : null}
      </main>

      <SiteFooter />

      <div className="fixed inset-x-0 bottom-0 z-40 grid h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-black/10 bg-white px-5 sm:hidden">
        <div className="min-w-0">
          <p className="truncate text-[9px] uppercase tracking-[0.12em] text-black/55">
            {product.name} · {product.volume || "6 ml"}
          </p>
          <p className="mt-1 text-sm">{inr(product.price)}</p>
        </div>
        <button
          type="button"
          disabled={product.inStock === false}
          onClick={() => cart.add(product.id, qty)}
          className="min-h-12 min-w-40 bg-black px-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-40"
        >
          {product.inStock === false ? "Sold out" : "Add to cart"}
        </button>
      </div>
    </StoreShell>
  );
}

function ProductInformation({
  product,
  related,
  quantity,
  onDecrease,
  onIncrease,
  onAdd,
}: {
  product: Product;
  related: Product[];
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onAdd: () => void;
}) {
  const categoryTokens = product.category.split(/\s+/).filter(Boolean).slice(0, 4);

  return (
    <div className="min-w-0 px-5 py-6 sm:px-8 lg:sticky lg:top-13 lg:self-start lg:px-12 lg:py-8 xl:px-16">
      <h1 className="font-display text-[2rem] leading-none sm:text-4xl">
        {product.name}{" "}
        <span className="whitespace-nowrap text-[0.52em]">({product.volume || "6 ml"})</span>
      </h1>

      <div className="mt-3 flex flex-wrap gap-2">
        {categoryTokens.map((token) => (
          <span
            key={token}
            className="bg-black/10 px-3 py-1 text-[8px] font-semibold uppercase tracking-[0.08em]"
          >
            {token}
          </span>
        ))}
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase leading-5 tracking-[0.08em]">
        {product.mood}
      </p>
      <p className="mt-1 text-sm leading-6 text-black/68">{product.hook}</p>

      {product.notes.length ? (
        <div className="mt-5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/40">
            Key notes
          </p>
          <p className="mt-2 text-sm leading-6">{product.notes.join(" · ")}</p>
        </div>
      ) : null}

      <div className="mt-5 flex items-baseline gap-3">
        <span className="text-2xl">{inr(product.price)}</span>
        {product.mrp > product.price ? (
          <span className="text-sm text-black/35 line-through">{inr(product.mrp)}</span>
        ) : null}
      </div>
      <p className="mt-1 text-[10px] text-black/55">Incl. of all taxes</p>
      <p className="mt-1 text-[10px] text-black/45">
        {product.volume || "6 ml"} · {product.format || "Roll-on attar"} · Made in{" "}
        {product.countryOfOrigin || "India"}
      </p>

      {related.length ? (
        <div className="mt-5">
          <h2 className="text-xs">Choose variants</h2>
          <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
            {related.map((candidate) => (
              <Link
                key={candidate.id}
                to="/product/$id"
                params={{ id: candidate.id }}
                className="w-24 shrink-0 text-center"
              >
                <span className="block aspect-square border border-black/35 bg-white">
                  <img
                    src={candidate.image}
                    alt={candidate.name}
                    className="h-full w-full object-contain p-2"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="mt-2 block text-[9px] font-semibold uppercase leading-3 tracking-[0.06em]">
                  {candidate.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-[106px_minmax(0,1fr)] gap-3">
        <div className="grid min-h-12 grid-cols-3 border border-black/60">
          <button type="button" aria-label="Decrease quantity" onClick={onDecrease}>
            <Minus className="mx-auto h-3.5 w-3.5" />
          </button>
          <span className="grid place-items-center text-xs" aria-live="polite">
            {quantity}
          </span>
          <button type="button" aria-label="Increase quantity" onClick={onIncrease}>
            <Plus className="mx-auto h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          disabled={product.inStock === false}
          onClick={onAdd}
          className="min-h-12 bg-black px-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {product.inStock === false ? "Sold out" : "Add to cart"}
        </button>
      </div>

      <p className="mt-5 text-[10px] leading-5 text-black/65">
        * India shipping is included. International shipping and payment are confirmed on WhatsApp
        at checkout.
      </p>
    </div>
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
    <div className="min-w-0 bg-white">
      <div className="aspect-square overflow-hidden bg-white p-8 sm:p-12 lg:aspect-[1.35/1] lg:p-14">
        <img
          src={featuredImage || product.image}
          alt={`${product.name} attar`}
          className="h-full w-full object-contain transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.025]"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      {supportingImages.length ? (
        <div className="hidden grid-cols-2 gap-2 px-2 pb-2 lg:grid">
          {supportingImages.slice(0, 4).map((image, index) => (
            <figure key={image} className="aspect-square overflow-hidden bg-[#f1f1f1]">
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

function ProductDescription({ product }: { product: Product }) {
  return (
    <section className="border-t border-black/12 bg-white px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <h2 className="font-display text-3xl sm:text-5xl">Product description</h2>
        <div>
          <p className="max-w-3xl text-base leading-8 text-black/72 sm:text-lg sm:leading-9">
            {product.meaning ? `${product.meaning} ` : ""}
            {product.story}
          </p>
          <div className="mt-9 grid gap-7 border-t border-black/15 pt-7 sm:grid-cols-3">
            <Detail label="Key notes" value={product.notes.join(", ")} />
            <Detail label="Wear it" value={`${product.occasion} · ${product.intensity}`} />
            <Detail
              label="Details"
              value={`${product.longevity} · ${product.format || "Roll-on attar"} · Made in ${product.countryOfOrigin || "India"}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductProfile({ product }: { product: Product }) {
  return (
    <section className="bg-black px-5 py-12 text-white sm:px-8 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3 sm:gap-12">
        <Detail label="Scent profile" value={product.tag} inverted />
        <Detail label="Longevity" value={product.longevity} inverted />
        <Detail label="Best worn" value={product.occasion} inverted />
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
  inverted = false,
}: {
  label: string;
  value: string;
  inverted?: boolean;
}) {
  return (
    <div>
      <h3
        className={`text-[9px] font-semibold uppercase tracking-[0.15em] ${inverted ? "text-white/45" : "text-black/45"}`}
      >
        {label}
      </h3>
      <p className={`mt-3 leading-6 ${inverted ? "font-display text-2xl" : "text-sm"}`}>{value}</p>
    </div>
  );
}

function ProductFaqs({ product }: { product: Product }) {
  return (
    <section className="border-t border-black/12 bg-white px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl sm:text-5xl">FAQs</h2>
        <Accordion type="single" collapsible className="mt-8 border-t border-black/20">
          {product.faqs.slice(0, 3).map((faq, index) => (
            <AccordionItem key={faq.q} value={`faq-${index}`} className="border-black/20">
              <AccordionTrigger className="py-6 text-left text-sm font-medium hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="max-w-3xl pb-7 text-sm leading-7 text-black/62">
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
    <section className="border-t border-black/12 bg-white px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <Star className="h-4 w-4 fill-current" />
          <h2 className="font-display text-2xl sm:text-4xl">Customer reviews</h2>
        </div>
        <div className="mt-9 grid gap-px bg-black/15 md:grid-cols-3">
          {reviews.slice(0, 6).map((review) => (
            <blockquote key={review.id} className="bg-white p-6 sm:p-8">
              <p className="text-sm leading-7">
                “{review.body || review.title || "A verified BADR purchase."}”
              </p>
              <footer className="mt-6 text-[9px] font-semibold uppercase tracking-[0.12em] text-black/45">
                {review.customer_name || "Verified customer"} · Verified · {review.rating}/5
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
