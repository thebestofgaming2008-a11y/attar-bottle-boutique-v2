import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { BundleContents, bundleSummary } from "@/components/store/BundleContents";
import { BundleBuilder } from "@/components/store/BundleBuilder";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, Star } from "lucide-react";
import {
  BOTTLE_IMAGES,
  PRODUCTS,
  resolveStoreProduct,
  storefrontProductFromSource,
  type Product,
} from "@/lib/products";
import { productSeo } from "@/lib/productSeo";
import { useCart } from "@/components/store/CartContext";
import { ProductCard } from "@/components/store/ProductCard";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { loadPublicCatalog, loadPublicProduct } from "@/services/publicPageService";
import { listPublishedReviews, type ProductReview } from "@/services/reviewService";
import { SearchSelect } from "@/components/ui/search-select";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  ORGANIZATION_ID,
  SITE_ORIGIN,
  WEBSITE_ID,
  absoluteUrl,
  serializeJsonLd,
  socialMeta,
} from "@/lib/seo";

const PRODUCT_DATA_TIMEOUT_MS = 3500;

async function withProductFallback<T>(request: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), PRODUCT_DATA_TIMEOUT_MS);
      }),
    ]).catch(() => fallback);
  } finally {
    clearTimeout(timer);
  }
}

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const [liveProduct, activeProducts] = await Promise.all([
      loadPublicProduct(params.id),
      withProductFallback(loadPublicCatalog(), []),
    ]);
    if (!liveProduct) throw notFound();
    if (liveProduct.slug && liveProduct.slug !== params.id) {
      throw redirect({ to: "/product/$id", params: { id: liveProduct.slug }, statusCode: 301 });
    }
    const staticProduct = PRODUCTS.find((product) => product.id === params.id);
    const product = resolveStoreProduct(
      liveProduct as unknown as Record<string, unknown>,
      staticProduct,
    );

    const liveCatalog = activeProducts.map((item) =>
      storefrontProductFromSource(item as unknown as Record<string, unknown>),
    );
    const related = liveCatalog.filter((item) => item.id !== product.id).slice(0, 4);
    const reviews = liveProduct?.id
      ? await withProductFallback(listPublishedReviews(liveProduct.id), [])
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

    const pageUrl = `${SITE_ORIGIN}/product/${encodeURIComponent(product.id)}`;
    const { title, description, image } = productSeo(product);
    const socialImage = absoluteUrl(image);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        ...socialMeta({
          title,
          description,
          url: pageUrl,
          image: socialImage,
          imageAlt: `${product.name} concentrated attar perfume bottle by BADR`,
          type: "product",
        }),
        { property: "product:brand", content: "BADR" },
        { property: "product:price:amount", content: String(product.price) },
        { property: "product:price:currency", content: "INR" },
        {
          property: "product:availability",
          content: product.inStock === false ? "out of stock" : "in stock",
        },
      ],
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, related, reviews } = Route.useLoaderData();
  const cart = useCart();
  const { format } = useCurrency();
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState(product.colorOptions?.[0] || "");
  const [selectedSize, setSelectedSize] = useState(
    product.sizeOptions?.[0] || `${product.volume || "6 ml"} roll-on`,
  );
  const [added, setAdded] = useState(false);
  const [showStickyPurchase, setShowStickyPurchase] = useState(false);
  const purchaseActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQty(1);
    setSelectedColor(product.colorOptions?.[0] || "");
    setSelectedSize(product.sizeOptions?.[0] || `${product.volume || "6 ml"} roll-on`);
    setAdded(false);
  }, [product.id, product.colorOptions, product.sizeOptions, product.volume]);

  useEffect(() => {
    if (!added) return;
    const timeout = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [added]);

  useEffect(() => {
    const purchaseActions = purchaseActionsRef.current;
    if (!purchaseActions) return;
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setShowStickyPurchase(purchaseActions.getBoundingClientRect().bottom < 0);
        frame = 0;
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [product.id]);

  const addCurrentProduct = () => {
    cart.addProduct(
      {
        productId: product.backendId,
        slug: product.id,
        name: product.name,
        bundleSummary: bundleSummary(product.bundleContents),
        image: product.image,
        price: product.price,
        mrp: product.mrp,
        selectedColor: selectedColor || null,
        selectedSize: selectedSize || null,
      },
      qty,
    );
    setAdded(true);
  };
  const productGraph = useMemo(() => {
    const seo = productSeo(product);
    const socialImage = seo.image;
    const productUrl = `${SITE_ORIGIN}/product/${encodeURIComponent(product.id)}`;
    const productImages = Array.from(
      new Set([socialImage, product.image, ...(product.gallery || [])].filter(Boolean)),
    ).map(absoluteUrl);
    const ratingValue = reviews.length
      ? Number(
          (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(2),
        )
      : null;
    const productSchema = {
      "@type": "Product",
      "@id": `${productUrl}/#product`,
      mainEntityOfPage: `${productUrl}/#webpage`,
      name: product.name,
      url: productUrl,
      image: productImages,
      description: seo.description,
      category: product.category,
      brand: { "@type": "Brand", name: "BADR" },
      manufacturer: { "@id": ORGANIZATION_ID },
      countryOfOrigin: { "@type": "Country", name: product.countryOfOrigin || "India" },
      audience: { "@type": "PeopleAudience", suggestedGender: "unisex" },
      size: product.volume || "6 ml",
      ...(product.sku ? { sku: product.sku } : {}),
      additionalProperty: [
        { "@type": "PropertyValue", name: "Format", value: product.format || "Roll-on attar" },
        { "@type": "PropertyValue", name: "Volume", value: product.volume || "6 ml" },
        { "@type": "PropertyValue", name: "Fragrance notes", value: product.notes.join(", ") },
        { "@type": "PropertyValue", name: "Longevity", value: product.longevity },
        { "@type": "PropertyValue", name: "Intensity", value: product.intensity },
      ],
      offers: {
        "@type": "Offer",
        "@id": `${productUrl}/#offer`,
        url: productUrl,
        priceCurrency: "INR",
        price: product.price.toFixed(2),
        availability:
          product.inStock === false
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@id": ORGANIZATION_ID },
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "INR" },
          shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
        },
      },
      ...(reviews.length
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue,
              reviewCount: reviews.length,
            },
            review: reviews.slice(0, 6).map((review) => ({
              "@type": "Review",
              name: review.title || `Verified review of ${product.name}`,
              reviewBody: review.body || review.title || "Verified BADR purchase.",
              reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
              author: {
                "@type": "Person",
                name: review.customer_name || "Verified customer",
              },
              ...(review.created_at ? { datePublished: review.created_at.slice(0, 10) } : {}),
            })),
          }
        : {}),
    };
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": `${productUrl}/#webpage`,
          url: productUrl,
          name: seo.title,
          description: seo.description,
          isPartOf: { "@id": WEBSITE_ID },
          about: { "@id": `${productUrl}/#product` },
          primaryImageOfPage: { "@type": "ImageObject", url: productImages[0] },
          inLanguage: "en-IN",
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
            { "@type": "ListItem", position: 2, name: "Shop attars", item: `${SITE_ORIGIN}/shop` },
            { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
          ],
        },
        productSchema,
        ...(product.faqs.length
          ? [
              {
                "@type": "FAQPage",
                mainEntity: product.faqs.map((faq) => ({
                  "@type": "Question",
                  name: faq.q,
                  acceptedAnswer: { "@type": "Answer", text: faq.a },
                })),
              },
            ]
          : []),
      ],
    };
  }, [product, reviews]);

  return (
    <StoreShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productGraph) }}
      />

      <main className="bg-white pb-18 sm:pb-0">
        <section className="bg-white pt-24">
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(410px,0.92fr)]">
            <ProductGallery product={product} />
            <ProductInformation
              product={product}
              quantity={qty}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              purchaseActionsRef={purchaseActionsRef}
              onColorChange={setSelectedColor}
              onSizeChange={setSelectedSize}
              onDecrease={() => setQty((value) => Math.max(1, value - 1))}
              onIncrease={() => setQty((value) => value + 1)}
              onAdd={addCurrentProduct}
              added={added}
            />
          </div>
        </section>

        <ProductStory product={product} />
        {product.faqs.length ? <ProductFaqs product={product} /> : null}

        <section className="border-t border-black/10 bg-white px-3 py-16 sm:px-6 sm:py-24">
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

      <div
        data-testid="product-sticky-purchase"
        aria-hidden={!showStickyPurchase}
        className={`fixed inset-x-0 bottom-0 z-40 grid min-h-20 grid-cols-[minmax(0,0.72fr)_minmax(190px,1.28fr)] items-center gap-4 bg-[#f7f6f2]/96 px-4 py-3 shadow-[0_-14px_45px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:hidden ${
          showStickyPurchase ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-xs text-black/55">
            {product.name} · {product.volume || "6 ml"}
          </p>
          <p className="mt-1 text-sm">{format(product.price)}</p>
        </div>
        <button
          type="button"
          disabled={product.inStock === false}
          onClick={addCurrentProduct}
          className={`motion-button flex min-h-13 items-center justify-center gap-2 px-5 font-display text-base text-white disabled:opacity-40 ${
            added ? "bg-[#254a36]" : "bg-black hover:bg-[#292929]"
          }`}
        >
          {product.inStock === false ? "Sold out" : added ? "Added to bag" : "Add to bag"}
        </button>
      </div>
    </StoreShell>
  );
}

function ProductInformation({
  product,
  quantity,
  selectedColor,
  selectedSize,
  purchaseActionsRef,
  onColorChange,
  onSizeChange,
  onDecrease,
  onIncrease,
  onAdd,
  added,
}: {
  product: Product;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  purchaseActionsRef: RefObject<HTMLDivElement | null>;
  onColorChange: (value: string) => void;
  onSizeChange: (value: string) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onAdd: () => void;
  added: boolean;
}) {
  const { detectedCountry, format } = useCurrency();

  return (
    <div className="min-w-0 px-6 pb-12 pt-8 sm:px-10 sm:py-12 lg:sticky lg:top-24 lg:self-start lg:px-12 xl:px-16">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-black/60">
        {product.category}
      </p>

      <h1 className="mt-3 font-display text-4xl leading-[1.08] sm:text-5xl xl:text-[3.5rem]">
        {product.name}
      </h1>

      {product.tag ? (
        <p className="mt-4 text-sm font-medium uppercase leading-6 tracking-[0.06em] text-black/75">
          {product.tag}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-medium">{format(product.price)}</span>
          {product.mrp > product.price ? (
            <span className="text-base text-black/55 line-through">{format(product.mrp)}</span>
          ) : null}
        </div>
        {product.inStock === false ? <p className="text-sm text-black/65">Sold out</p> : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-black/60">
        Taxes included.{" "}
        {detectedCountry === "IN"
          ? "Delivery included in India."
          : "International shipping is confirmed at checkout."}
      </p>

      <p className="mt-6 max-w-xl text-base leading-7 text-black/80">{product.hook}</p>
      <p className="mt-4 text-sm leading-6 text-black/65">
        {product.volume || "6 ml"} · {product.format || "Roll-on perfume oil"}
      </p>
      <BundleContents items={product.bundleContents} />

      {(product.sizeOptions?.length ?? 0) > 1 || (product.colorOptions?.length ?? 0) > 1 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(product.sizeOptions?.length ?? 0) > 1 ? (
            <SearchSelect
              label="Size / format"
              value={selectedSize}
              options={(product.sizeOptions ?? []).map((value) => ({ value, label: value }))}
              searchPlaceholder="Search sizes…"
              onValueChange={onSizeChange}
              triggerClassName="bg-transparent"
            />
          ) : null}
          {(product.colorOptions?.length ?? 0) > 1 ? (
            <SearchSelect
              label="Variant"
              value={selectedColor}
              options={(product.colorOptions ?? []).map((value) => ({ value, label: value }))}
              searchPlaceholder="Search variants…"
              onValueChange={onColorChange}
              triggerClassName="bg-transparent"
            />
          ) : null}
        </div>
      ) : null}

      <div
        ref={purchaseActionsRef}
        data-testid="product-primary-purchase"
        className="mt-7 grid grid-cols-[120px_minmax(0,1fr)] gap-3"
      >
        <div className="grid min-h-14 grid-cols-3 bg-[#f1efe9]">
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
          className={`motion-button flex min-h-14 items-center justify-center gap-2 px-5 font-display text-base text-white disabled:cursor-not-allowed disabled:opacity-40 sm:text-lg ${
            added ? "bg-[#254a36]" : "bg-black hover:bg-[#292929]"
          }`}
        >
          {product.inStock === false ? "Sold out" : added ? "Added to bag" : "Add to bag"}
        </button>
      </div>

      {!product.bundleContents?.length ? (
        <BundleBuilder initialProductId={product.backendId} />
      ) : null}
    </div>
  );
}

function ProductGallery({ product }: { product: Product }) {
  const images = Array.from(
    new Set(
      [product.image, ...(product.gallery || []), BOTTLE_IMAGES[product.id]].filter(
        (image): image is string => Boolean(image),
      ),
    ),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [thumbnailStart, setThumbnailStart] = useState(0);
  const visibleThumbnailCount = 4;

  useEffect(() => {
    setActiveIndex(0);
    setThumbnailStart(0);
  }, [product.id]);

  const visibleThumbnails = images.slice(thumbnailStart, thumbnailStart + visibleThumbnailCount);
  const canMoveBack = thumbnailStart > 0;
  const canMoveForward = thumbnailStart + visibleThumbnailCount < images.length;
  const selectedImage = images[activeIndex] || product.image;

  return (
    <div
      className="min-w-0 bg-white lg:border-r lg:border-black/10 lg:p-3"
      role="region"
      aria-label={`${product.name} product images`}
    >
      <figure className="aspect-[4/5] overflow-hidden bg-white p-7 sm:aspect-square sm:p-12 lg:p-16">
        <img
          key={selectedImage}
          src={selectedImage}
          alt={
            activeIndex === 0
              ? `${product.name} attar`
              : `${product.name} product view ${activeIndex + 1}`
          }
          className="h-full w-full object-contain"
          fetchPriority={activeIndex === 0 ? "high" : undefined}
          decoding="async"
        />
      </figure>

      {images.length > 1 ? (
        <div className="flex items-center justify-center gap-2 px-3 pb-4 pt-2 sm:gap-3 sm:px-5">
          <button
            type="button"
            onClick={() => setThumbnailStart((start) => Math.max(0, start - 1))}
            disabled={!canMoveBack}
            className="grid h-10 w-8 shrink-0 place-items-center text-black transition-opacity disabled:pointer-events-none disabled:opacity-0"
            aria-label="Show previous product thumbnails"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex min-w-0 gap-2 sm:gap-3">
            {visibleThumbnails.map((image, visibleIndex) => {
              const imageIndex = thumbnailStart + visibleIndex;
              return (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveIndex(imageIndex)}
                  className={`h-14 w-12 shrink-0 bg-[#f7f6f2] p-1.5 transition-colors min-[375px]:h-16 min-[375px]:w-16 sm:h-18 sm:w-18 ${
                    activeIndex === imageIndex
                      ? "border border-black"
                      : "border border-transparent hover:border-black/30"
                  }`}
                  aria-label={`Show ${product.name} product image ${imageIndex + 1}`}
                  aria-current={activeIndex === imageIndex ? "true" : undefined}
                >
                  <img src={image} alt="" className="h-full w-full object-contain" loading="lazy" />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              setThumbnailStart((start) =>
                Math.min(images.length - visibleThumbnailCount, start + 1),
              )
            }
            disabled={!canMoveForward}
            className="grid h-10 w-8 shrink-0 place-items-center text-black transition-opacity disabled:pointer-events-none disabled:opacity-0"
            aria-label="Show more product thumbnails"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProductStory({ product }: { product: Product }) {
  const scene = BOTTLE_IMAGES[product.id] || product.image;

  return (
    <section className="overflow-hidden border-t border-black/10 bg-white text-black">
      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 sm:py-20 lg:px-16">
          <h2 className="max-w-2xl font-display text-3xl leading-[1.15] sm:text-4xl">The scent</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-black/75">
            {product.meaning ? `${product.meaning} ` : ""}
            {product.story}
          </p>

          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em]">Key notes</h3>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {product.notes.map((note) => (
                <li key={note} className="text-base leading-7 text-black/75">
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <dl className="mt-8 divide-y divide-black/10 bg-[#f7f6f2] px-5">
            <ProductStat label="Intensity" value={product.intensity} />
            <ProductStat label="Lasts" value={product.longevity} />
            <ProductStat label="Best worn" value={product.occasion} />
          </dl>
          <nav
            aria-label="Fragrance guides"
            className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-black/65"
          >
            <Link
              to="/journal/$slug"
              params={{ slug: "how-to-apply-attar" }}
              className="underline underline-offset-4"
            >
              How to apply attar
            </Link>
            <Link
              to="/journal/$slug"
              params={{ slug: "choose-attar-by-scent" }}
              className="underline underline-offset-4"
            >
              Choose your scent
            </Link>
          </nav>
        </div>

        <figure className="relative min-h-[480px] bg-white sm:min-h-[620px] lg:min-h-[720px] lg:border-l lg:border-black/10">
          <img
            src={scene}
            alt={`${product.name} BADR attar bottle`}
            className="absolute inset-0 h-full w-full object-contain p-14 sm:p-20 lg:p-24"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
    </section>
  );
}

function ProductStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(90px,0.7fr)_minmax(0,1.3fr)] items-baseline gap-5 py-4">
      <dt className="text-sm font-medium text-black/80">{label}</dt>
      <dd className="text-sm capitalize leading-6 text-black/70">{value}</dd>
    </div>
  );
}

function ProductFaqs({ product }: { product: Product }) {
  return (
    <section className="border-t border-black/10 bg-white px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-20">
        <div>
          <h2 className="font-display text-3xl leading-tight sm:text-4xl">Product information</h2>
        </div>
        <Accordion type="single" collapsible className="border-t border-black/18">
          {product.faqs.map((faq, index) => (
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
