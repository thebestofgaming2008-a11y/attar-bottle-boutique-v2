import { createFileRoute, Link } from "@tanstack/react-router";
import { PRODUCTS, storefrontProductFromSource, type Product } from "@/lib/products";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { Hero } from "@/components/store/Hero";
import { BrandFilm } from "@/components/store/BrandFilm";
import { ScentChapter } from "@/components/store/ScentChapter";
import { ProductCard } from "@/components/store/ProductCard";
import { listActiveProducts } from "@/services/productService";

const SITE_ORIGIN = import.meta.env.VITE_PUBLIC_SITE_URL || "https://houseofbadr.com";

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
  return (
    <StoreShell>
      <Hero products={collection} />

      <BrandFilm />

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
    <section id="shop" className="scroll-mt-14 bg-black px-3 py-14 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center font-display text-2xl leading-none sm:text-4xl">
          Shop the collection
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-x-1 gap-y-9 sm:gap-x-2 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} dark />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            to="/shop"
            className="inline-flex min-h-11 items-center bg-white px-7 text-[10px] font-semibold uppercase tracking-[0.1em] text-black hover:bg-white/75"
          >
            View all products
          </Link>
        </div>
      </div>
    </section>
  );
}
