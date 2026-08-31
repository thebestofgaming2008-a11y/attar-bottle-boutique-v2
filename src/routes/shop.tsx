import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StoreShell, SiteFooter } from "@/components/store/StoreShell";
import { useCart } from "@/components/store/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { listActiveProducts } from "@/services/productService";
import { BOTTLE_IMAGES } from "@/lib/products";
import { SearchSelect } from "@/components/ui/search-select";
import {
  DEFAULT_SOCIAL_IMAGE,
  ORGANIZATION_ID,
  SITE_ORIGIN,
  WEBSITE_ID,
  serializeJsonLd,
  socialMeta,
} from "@/lib/seo";

const SHOP_URL = `${SITE_ORIGIN}/shop`;
const SHOP_TITLE = "Shop Attar Perfume Online | Oud, Rose & Vanilla Oils | BADR";
const SHOP_DESCRIPTION =
  "Shop BADR concentrated 6 ml attar perfume oils online in India. Explore oud, rose, fruity, aquatic and vanilla scents for all genders from ₹499.";
const SHOP_FAQS = [
  {
    question: "What is a BADR attar?",
    answer:
      "BADR attars are concentrated perfume oils supplied in a compact 6 ml roll-on bottle. Apply a small amount to pulse points and let the fragrance settle naturally on the skin.",
  },
  {
    question: "Are BADR attars for men or women?",
    answer:
      "Every BADR fragrance is designed for all genders. Choose by scent profile: oud and saffron, rose and oud, fruity woods, fresh aquatic citrus, or vanilla and amber.",
  },
  {
    question: "Is delivery included in the displayed price?",
    answer:
      "India delivery is included in the displayed product price. International availability, shipping and payment details are confirmed through WhatsApp at checkout.",
  },
];

export const Route = createFileRoute("/shop")({
  loader: async () => ({ products: await listActiveProducts() }),
  head: () => ({
    meta: [
      { title: SHOP_TITLE },
      { name: "description", content: SHOP_DESCRIPTION },
      ...socialMeta({
        title: SHOP_TITLE,
        description: SHOP_DESCRIPTION,
        url: SHOP_URL,
        image: DEFAULT_SOCIAL_IMAGE,
        imageAlt: "BADR concentrated attar perfume collection",
      }),
    ],
    links: [
      {
        rel: "canonical",
        href: SHOP_URL,
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { products } = Route.useLoaderData();
  const cart = useCart();
  const { format } = useCurrency();
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("all");
  const collections = useMemo(
    () =>
      Array.from(
        new Set(products.map((product) => product.category_id).filter(Boolean)),
      ) as string[],
    [products],
  );
  const collectionOptions = useMemo(
    () => [
      { value: "all", label: "All collections" },
      ...collections.map((value) => ({
        value,
        label: value.replace(
          /(^|-)([a-z])/g,
          (_, separator, letter) => `${separator === "-" ? " " : ""}${letter.toUpperCase()}`,
        ),
      })),
    ],
    [collections],
  );
  const filtered = products.filter((product) => {
    const matchesCollection = collection === "all" || product.category_id === collection;
    const haystack = [product.name, product.category, product.category_id, ...(product.tags || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesCollection && haystack.includes(search.trim().toLowerCase());
  });
  const shopSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${SHOP_URL}/#webpage`,
          url: SHOP_URL,
          name: SHOP_TITLE,
          description: SHOP_DESCRIPTION,
          isPartOf: { "@id": WEBSITE_ID },
          about: { "@id": ORGANIZATION_ID },
          inLanguage: "en-IN",
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
            { "@type": "ListItem", position: 2, name: "Shop attars", item: SHOP_URL },
          ],
        },
        {
          "@type": "ItemList",
          name: "BADR attar perfume collection",
          numberOfItems: products.length,
          itemListElement: products.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${product.name} attar perfume`,
            url: `${SITE_ORIGIN}/product/${product.slug || product.id}`,
            image: product.cover_image_url || undefined,
          })),
        },
        {
          "@type": "FAQPage",
          mainEntity: SHOP_FAQS.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        },
      ],
    }),
    [products],
  );
  return (
    <StoreShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(shopSchema) }}
      />
      <main className="min-h-screen bg-white px-3 pb-24 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-center font-display text-3xl sm:text-5xl">Shop the collection</h1>
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="flex h-12 items-center gap-3 border border-foreground/20 bg-background px-4">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search scents and notes"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <SearchSelect
              value={collection}
              onValueChange={setCollection}
              options={collectionOptions}
              searchPlaceholder="Search collections…"
            />
          </div>

          {filtered.length ? (
            <div className="mt-12 grid grid-cols-2 gap-x-2 gap-y-12 lg:grid-cols-4">
              {filtered.map((product) => {
                const price = product.sale_price_inr ?? product.sale_price ?? product.price_inr;
                const slug = product.slug || product.id;
                const sourceImage = product.cover_image_url || "";
                const displayImage = sourceImage.includes(`/products/sku-${slug}.webp`)
                  ? BOTTLE_IMAGES[slug] || sourceImage
                  : sourceImage;
                return (
                  <article
                    key={product.id}
                    className="group flex h-full min-w-0 flex-col text-center"
                  >
                    <div className="relative aspect-square overflow-hidden bg-white">
                      <Link to="/product/$id" params={{ id: slug }} className="block h-full">
                        <img
                          src={displayImage}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-[8%] transition-transform duration-700 group-hover:scale-[1.045]"
                        />
                      </Link>
                    </div>
                    <div className="flex flex-1 flex-col items-center px-1 pt-4">
                      <Link to="/product/$id" params={{ id: slug }}>
                        <h2 className="font-display text-[15px] leading-tight sm:text-lg">
                          {product.name}{" "}
                          <span className="whitespace-nowrap">
                            ({product.volume_label || "6 ml"})
                          </span>
                        </h2>
                      </Link>
                      <p className="mt-2 text-[9px] uppercase tracking-[0.1em] text-black/50">
                        {product.product_type || product.category_id || "Attar"}
                      </p>
                      <div className="mt-3 flex items-baseline gap-2 text-xs sm:text-sm">
                        <span>{format(price)}</span>
                        {product.sale_price_inr ? (
                          <span className="text-xs text-muted-foreground line-through">
                            {format(product.price_inr)}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={!product.in_stock || (product.stock_quantity ?? 0) < 1}
                        onClick={() =>
                          cart.addProduct({
                            productId: product.id,
                            slug,
                            name: product.name,
                            image: displayImage,
                            price,
                            mrp: product.price_inr,
                            selectedSize: product.size_options?.[0] || null,
                          })
                        }
                        className="mt-4 min-h-10 bg-black px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {product.in_stock ? "Add to cart" : "Sold out"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-14 border border-foreground/15 bg-background p-8 text-center text-sm text-muted-foreground">
              No scents match those filters.
            </p>
          )}

          <section className="mx-auto mt-20 max-w-4xl border-t border-black/10 py-16 sm:mt-28 sm:py-20">
            <p className="text-center text-xs text-black/45">Buying BADR attar online</p>
            <h2 className="mt-3 text-center font-display text-3xl sm:text-5xl">
              Attar perfume, made simple
            </h2>
            <div className="mt-10 grid gap-px bg-black/10 md:grid-cols-3">
              {SHOP_FAQS.map((faq) => (
                <article key={faq.question} className="bg-white p-6 sm:p-8">
                  <h3 className="text-sm font-semibold leading-5">{faq.question}</h3>
                  <p className="mt-4 text-sm leading-7 text-black/62">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}
