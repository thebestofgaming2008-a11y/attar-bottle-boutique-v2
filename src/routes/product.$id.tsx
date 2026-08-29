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
import { ProductScentMap } from "@/components/store/ProductScentMap";
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
        <section className="bg-[#f3efe7]">
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(410px,0.92fr)]">
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

        <ProductScentMap product={product} />
        <ProductStory product={product} />
        {product.faqs.length ? <ProductFaqs product={product} /> : null}

        <section className="bg-[#f3efe7] px-3 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <p className="text-center text-xs text-black/48">The BADR collection</p>
            <h2 className="mt-2 text-center font-display text-3xl sm:text-5xl">
              You may also like
            </h2>
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

      <div className="fixed inset-x-0 bottom-0 z-40 grid h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-black/10 bg-[#f3efe7] px-5 sm:hidden">
        <div className="min-w-0">
          <p className="truncate text-xs text-black/55">
            {product.name} · {product.volume || "6 ml"}
          </p>
          <p className="mt-1 text-sm">{inr(product.price)}</p>
        </div>
        <button
          type="button"
          disabled={product.inStock === false}
          onClick={() => cart.add(product.id, qty)}
          className="min-h-12 min-w-40 bg-black px-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#292929] disabled:opacity-40"
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
  return (
    <div className="min-w-0 px-5 py-8 sm:px-10 sm:py-10 lg:sticky lg:top-13 lg:self-start lg:px-12 lg:py-10 xl:px-16">
      <div className="flex items-center justify-between gap-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/50">
          {product.category}
        </p>
        <p className="shrink-0 text-xs text-black/52">
          {product.inStock === false ? "Sold out" : "In stock"}
        </p>
      </div>

      <h1 className="mt-4 font-display text-[2.5rem] leading-[0.92] sm:text-5xl xl:text-[3.5rem]">
        {product.name}
      </h1>

      <p className="mt-4 max-w-xl text-[15px] leading-6 text-black/72 sm:text-base sm:leading-7">
        {product.hook}
      </p>
      <p className="mt-2 max-w-xl text-[11px] font-medium uppercase leading-5 tracking-[0.06em] text-black/50">
        {product.mood}
      </p>

      <div className="mt-7 flex items-end justify-between gap-5">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl">{inr(product.price)}</span>
          {product.mrp > product.price ? (
            <span className="text-sm text-black/35 line-through">{inr(product.mrp)}</span>
          ) : null}
        </div>
        <p className="text-right text-[9px] leading-4 text-black/48">
          Incl. of all taxes
          <br />
          India delivery included
        </p>
      </div>

      {product.notes.length ? (
        <section aria-labelledby="scent-notes-heading" className="mt-7 bg-white/55 px-4 py-4">
          <h2 id="scent-notes-heading" className="text-xs font-medium text-black/52">
            Key notes
          </h2>
          <p className="mt-2 text-sm leading-6 sm:text-[15px]">{product.notes.join(" · ")}</p>
        </section>
      ) : null}

      {related.length ? (
        <section aria-labelledby="other-scents-heading" className="mt-7">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="other-scents-heading" className="text-xs font-medium">
              Choose another scent
            </h2>
            <Link to="/shop" className="text-[10px] text-black/48 underline underline-offset-4">
              See all
            </Link>
          </div>
          <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
            {related.map((candidate) => (
              <Link
                key={candidate.id}
                to="/product/$id"
                params={{ id: candidate.id }}
                className="group w-22 shrink-0"
              >
                <span className="block aspect-square border border-black/20 bg-white transition-colors group-hover:border-black">
                  <img
                    src={candidate.image}
                    alt={candidate.name}
                    className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="eager"
                    decoding="async"
                  />
                </span>
                <span className="mt-2 block text-[10px] font-medium leading-3">
                  {candidate.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-7 grid grid-cols-[104px_minmax(0,1fr)] gap-2">
        <div className="grid min-h-13 grid-cols-3 border border-black/45 bg-transparent">
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
          className="min-h-13 bg-black px-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {product.inStock === false
            ? "Sold out"
            : `Add to cart · ${inr(product.price * quantity)}`}
        </button>
      </div>

      <dl className="mt-7 grid grid-cols-3 gap-4 bg-black px-4 py-5 text-white">
        <ProductFact label="Size" value={product.volume || "6 ml"} />
        <ProductFact label="Wear" value={product.longevity} />
        <ProductFact label="Format" value={product.format || "Roll-on"} />
      </dl>

      <Accordion type="single" collapsible className="mt-6 border-y border-black/18">
        <AccordionItem value="story" className="border-black/18">
          <AccordionTrigger className="py-4 text-left text-[13px] font-medium hover:no-underline">
            The story behind {product.name}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-sm leading-7 text-black/62">
            {product.meaning ? `${product.meaning} ` : ""}
            {product.story}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="wear" className="border-black/18">
          <AccordionTrigger className="py-4 text-left text-[13px] font-medium hover:no-underline">
            How to wear it
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-sm leading-7 text-black/62">
            Roll lightly over pulse points—wrists, inner elbows and behind the ears. Let the oil
            settle naturally instead of rubbing it in.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="delivery" className="border-0">
          <AccordionTrigger className="py-4 text-left text-[13px] font-medium hover:no-underline">
            Delivery & international orders
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-sm leading-7 text-black/62">
            India delivery is included in the displayed price. International availability, shipping
            and payment are confirmed on WhatsApp at checkout.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function ProductFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] font-medium uppercase tracking-[0.08em] text-white/48">{label}</dt>
      <dd className="mt-2 text-xs leading-4 text-white/90">{value}</dd>
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
    <div className="min-w-0 bg-[#e8e2d7] lg:p-3">
      <figure className="relative aspect-[1/1.05] overflow-hidden bg-[#f8f6f1] p-10 sm:p-14 lg:aspect-[1.16/1] lg:p-16">
        <img
          src={featuredImage || product.image}
          alt={`${product.name} attar`}
          className="h-full w-full object-contain transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.025]"
          fetchPriority="high"
          decoding="async"
        />
        <figcaption className="absolute bottom-4 left-4 text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">
          BADR concentrated perfume oil · Made in {product.countryOfOrigin || "India"}
        </figcaption>
      </figure>
      {supportingImages.length ? (
        <div className="hidden grid-cols-2 gap-3 pt-3 lg:grid">
          {supportingImages.slice(0, 4).map((image, index) => (
            <figure key={image} className="aspect-[4/5] overflow-hidden bg-[#d8d1c5]">
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

function ProductStory({ product }: { product: Product }) {
  const scene = product.socialImage || SCENE_IMAGES[product.id] || product.image;

  return (
    <section className="overflow-hidden bg-black text-white">
      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col justify-center px-5 py-16 sm:px-10 sm:py-24 lg:px-16">
          <p className="text-xs text-white/48">About {product.name}</p>
          <h2 className="mt-3 max-w-xl font-display text-4xl leading-[0.94] sm:text-5xl">
            The story
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/68 sm:text-base sm:leading-8">
            {product.meaning ? `${product.meaning} ` : ""}
            {product.story}
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-5">
            <ProductStat label="Intensity" value={product.intensity} />
            <ProductStat label="Lasts" value={product.longevity} />
            <ProductStat label="Best worn" value={product.occasion} />
          </dl>
        </div>

        <figure className="relative min-h-[480px] sm:min-h-[620px] lg:min-h-[720px]">
          <img
            src={scene}
            alt={`${product.name} campaign scene`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
        </figure>
      </div>
    </section>
  );
}

function ProductStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-white/45">{label}</dt>
      <dd className="mt-2 text-sm font-medium capitalize leading-5 sm:text-base">{value}</dd>
    </div>
  );
}

function ProductFaqs({ product }: { product: Product }) {
  return (
    <section className="bg-[#f8f6f1] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-20">
        <div>
          <p className="text-xs text-black/48">Product information</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl">FAQs</h2>
        </div>
        <Accordion type="single" collapsible className="border-t border-black/18">
          {product.faqs.slice(0, 3).map((faq, index) => (
            <AccordionItem key={faq.q} value={`faq-${index}`} className="border-black/18">
              <AccordionTrigger className="py-6 text-left text-sm font-medium hover:no-underline sm:text-base">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl pb-7 text-sm leading-7 text-black/62">
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
