import { createFileRoute, Link } from "@tanstack/react-router";
import { PRODUCTS, storefrontProductFromSource, type Product } from "@/lib/products";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { Hero } from "@/components/store/Hero";
import { VideoBand } from "@/components/store/VideoBand";
import { ScentChapter } from "@/components/store/ScentChapter";
import { ProductCard } from "@/components/store/ProductCard";
import { listActiveProducts } from "@/services/productService";

const SITE_ORIGIN =
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  "https://badr-boutique-studio-v2.thebestofgaming2008.workers.dev";

export const Route = createFileRoute("/")({
  loader: async () => {
    const liveProducts = await listActiveProducts().catch(() => []);
    const collection = (
      liveProducts.length
        ? liveProducts.map((product) =>
            storefrontProductFromSource(product as unknown as Record<string, unknown>),
          )
        : PRODUCTS
    ).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
    return { collection };
  },
  head: () => ({
    meta: [
      { title: "BADR Attar — Shop Your Scent" },
      {
        name: "description",
        content:
          "Five unisex attars in one signature 6 ml bottle. Oud Zafar, Oud Gulaab, Fitoor, Dariya and Ulfat — from ₹499 with India shipping included.",
      },
      {
        name: "keywords",
        content:
          "BADR attar, attar perfume India, unisex attar, oud attar, perfume oil, 6 ml roll-on attar",
      },
      { property: "og:title", content: "BADR Attar — Shop Your Scent" },
      {
        property: "og:description",
        content: "Rare air. Crafted for the relentless. Five unisex attars, one signature bottle.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: SITE_ORIGIN,
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN }],
  }),
  component: Index,
});

function Index() {
  const { collection } = Route.useLoaderData();
  const collectionById = new Map(collection.map((product) => [product.id, product]));
  const chapterProducts = PRODUCTS.flatMap((product) => {
    const current = collectionById.get(product.id);
    return current ? [current] : [];
  });
  const scrollToShop = () =>
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });

  return (
    <StoreShell>
      <Hero onCta={scrollToShop} />

      <VideoBand />

      {chapterProducts.map((p) => (
        <div key={p.id}>
          <ScentChapter product={p} />
        </div>
      ))}

      <CollectionSection products={collection} />

      <SiteFooter />
    </StoreShell>
  );
}

function CollectionSection({ products }: { products: Product[] }) {
  return (
    <section id="shop" className="scroll-mt-20 bg-[#eeeae2] px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">The collection</p>
            <h2 className="mt-4 max-w-3xl font-display text-5xl leading-[0.9] sm:text-7xl">
              Five scents. Choose yours.
            </h2>
          </div>
          <Link
            to="/shop"
            className="motion-link text-[10px] font-semibold uppercase tracking-[0.18em]"
          >
            View all products
          </Link>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
