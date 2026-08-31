import { Fragment } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PRODUCTS, storefrontProductFromSource, type Product } from "@/lib/products";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { Hero } from "@/components/store/Hero";
import { BrandFilm } from "@/components/store/BrandFilm";
import { ScentChapter } from "@/components/store/ScentChapter";
import { ProductCard } from "@/components/store/ProductCard";
import { listActiveProducts } from "@/services/productService";
import { DEFAULT_HOMEPAGE_FILM_CONFIG, type HomepageFilmPlacement } from "@/lib/homepageFilm";
import type { HomepageLayout } from "@/lib/homepageLayout";
import { HomepageLayoutRenderer } from "@/components/store/HomepageLayoutRenderer";
import {
  DEFAULT_SOCIAL_IMAGE,
  ORGANIZATION_ID,
  SITE_ORIGIN,
  WEBSITE_ID,
  serializeJsonLd,
  socialMeta,
} from "@/lib/seo";

const HOME_TITLE = "Attar Perfume Online India | Unisex Perfume Oils | BADR";
const HOME_DESCRIPTION =
  "Shop concentrated 6 ml attar perfumes online from BADR. Discover oud, rose, fruity, fresh aquatic and vanilla perfume oils from ₹499 with India delivery included.";

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
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESCRIPTION },
      ...socialMeta({
        title: HOME_TITLE,
        description: HOME_DESCRIPTION,
        url: SITE_ORIGIN,
        image: DEFAULT_SOCIAL_IMAGE,
        imageAlt: "BADR concentrated Oud Zafar attar perfume bottle",
      }),
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN }],
  }),
  component: Index,
});

function Index() {
  const { collection } = Route.useLoaderData();
  const filmConfig = useQuery(api.homepage.getFilmConfig, {}) ?? DEFAULT_HOMEPAGE_FILM_CONFIG;
  const publishedLayout = useQuery(api.homepageLayout.getPublishedLayout, {}) as
    HomepageLayout | null | undefined;
  const collectionById = new Map(collection.map((product) => [product.id, product]));
  const chapterProducts = PRODUCTS.flatMap((product) => {
    const current = collectionById.get(product.id);
    return current ? [current] : [];
  });
  const filmAt = (placement: HomepageFilmPlacement) =>
    filmConfig.enabled && filmConfig.placement === placement ? (
      <BrandFilm config={filmConfig} />
    ) : null;
  const homeSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_ORIGIN}/#webpage`,
        url: SITE_ORIGIN,
        name: HOME_TITLE,
        description: HOME_DESCRIPTION,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: DEFAULT_SOCIAL_IMAGE,
        },
        inLanguage: "en-IN",
      },
      {
        "@type": "ItemList",
        name: "BADR attar perfume collection",
        numberOfItems: collection.length,
        itemListElement: collection.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${product.name} attar perfume`,
          url: `${SITE_ORIGIN}/product/${product.id}`,
        })),
      },
    ],
  };
  return (
    <StoreShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeSchema) }}
      />
      {publishedLayout ? (
        <HomepageLayoutRenderer layout={publishedLayout} products={collection} />
      ) : (
        <>
          <Hero products={collection} />

          {filmAt("after_hero")}

          {chapterProducts.map((p, index) => (
            <Fragment key={p.id}>
              <ScentChapter product={p} />
              {filmAt(`after_scent_${index + 1}` as HomepageFilmPlacement)}
            </Fragment>
          ))}

          {filmAt("before_shop")}
          <CollectionSection products={collection} />
          {filmAt("after_shop")}
        </>
      )}

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
