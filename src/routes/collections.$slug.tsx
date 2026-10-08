import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ProductCard } from "@/components/store/ProductCard";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { storefrontProductFromSource } from "@/lib/products";
import { SEO_COLLECTION_BY_SLUG } from "@/lib/seoCollections";
import { ORGANIZATION_ID, SITE_ORIGIN, WEBSITE_ID, serializeJsonLd, socialMeta } from "@/lib/seo";
import { loadPublicCatalog } from "@/services/publicPageService";

export const Route = createFileRoute("/collections/$slug")({
  loader: async ({ params }) => {
    const collection = SEO_COLLECTION_BY_SLUG.get(params.slug);
    if (!collection) throw notFound();
    const catalog = await loadPublicCatalog();
    const allowed = new Set(collection.productIds);
    const products = catalog
      .map((product) => storefrontProductFromSource(product as unknown as Record<string, unknown>))
      .filter((product) => allowed.has(product.id));
    return { collection, products };
  },
  head: ({ loaderData }) => {
    const collection = loaderData?.collection;
    if (!collection) {
      return {
        meta: [{ title: "Collection not found — BADR" }, { name: "robots", content: "noindex" }],
      };
    }
    const url = `${SITE_ORIGIN}/collections/${collection.slug}`;
    return {
      meta: [
        { title: collection.title },
        { name: "description", content: collection.description },
        ...socialMeta({
          title: collection.title,
          description: collection.description,
          url,
          imageAlt: `${collection.name} by BADR`,
        }),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: SeoCollectionPage,
});

function SeoCollectionPage() {
  const { collection, products } = Route.useLoaderData();
  const url = `${SITE_ORIGIN}/collections/${collection.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}/#webpage`,
        url,
        name: collection.title,
        description: collection.description,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        inLanguage: "en-IN",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
          { "@type": "ListItem", position: 2, name: "Shop attars", item: `${SITE_ORIGIN}/shop` },
          { "@type": "ListItem", position: 3, name: collection.shortName, item: url },
        ],
      },
      {
        "@type": "ItemList",
        name: collection.name,
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${product.name} attar perfume oil`,
          url: `${SITE_ORIGIN}/product/${encodeURIComponent(product.id)}`,
          image: product.image,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: collection.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <StoreShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <main className="bg-white text-black">
        <section className="px-5 pb-14 pt-32 text-center sm:px-8 sm:pb-20 sm:pt-40">
          <div className="mx-auto max-w-4xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/50">
              {collection.eyebrow}
            </p>
            <h1 className="mt-5 text-balance font-display text-4xl leading-[1.02] sm:text-6xl lg:text-7xl">
              {collection.name}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-black/68">
              {collection.intro}
            </p>
          </div>
        </section>

        <section className="border-y border-black/10 bg-[#f7f6f3] px-3 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} showType />
            ))}
          </div>
        </section>

        <section className="px-5 py-14 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-px bg-black/10 md:grid-cols-3">
              {collection.sections.map((section) => (
                <article key={section.heading} className="bg-white p-6 sm:p-8">
                  <h2 className="font-display text-2xl leading-tight">{section.heading}</h2>
                  <p className="mt-4 text-sm leading-7 text-black/65">{section.body}</p>
                </article>
              ))}
            </div>

            <div className="mx-auto mt-16 max-w-3xl border-t border-black/10 pt-12">
              <h2 className="text-center font-display text-3xl">
                Questions about {collection.shortName.toLowerCase()}
              </h2>
              <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
                {collection.faqs.map((faq) => (
                  <article key={faq.question} className="py-6">
                    <h3 className="font-semibold">{faq.question}</h3>
                    <p className="mt-3 text-sm leading-7 text-black/65">{faq.answer}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/shop"
                className="inline-flex min-h-11 items-center bg-black px-7 text-[10px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-black/70"
              >
                Shop every BADR attar
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}
