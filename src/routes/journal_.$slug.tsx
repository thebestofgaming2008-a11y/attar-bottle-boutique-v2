import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { JOURNAL_ARTICLES, JOURNAL_BY_SLUG } from "@/lib/journal";
import { PRODUCTS } from "@/lib/products";
import {
  DEFAULT_SOCIAL_IMAGE,
  ORGANIZATION_ID,
  SITE_ORIGIN,
  WEBSITE_ID,
  serializeJsonLd,
  socialMeta,
} from "@/lib/seo";

export const Route = createFileRoute("/journal_/$slug")({
  loader: ({ params }) => {
    const article = JOURNAL_BY_SLUG.get(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article;
    if (!article) return { meta: [{ title: "Guide not found — BADR" }] };
    const url = `${SITE_ORIGIN}/journal/${article.slug}`;
    return {
      meta: [
        { title: `${article.title} | BADR` },
        { name: "description", content: article.description },
        ...socialMeta({
          title: `${article.title} | BADR`,
          description: article.description,
          url,
          image: DEFAULT_SOCIAL_IMAGE,
          imageAlt: "BADR roll-on attar perfume oil",
          type: "article",
        }),
        { property: "article:published_time", content: article.published },
        { property: "article:modified_time", content: article.updated },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: JournalArticlePage,
});

function JournalArticlePage() {
  const { article } = Route.useLoaderData();
  const url = `${SITE_ORIGIN}/journal/${article.slug}`;
  const products = article.productSlugs.flatMap((slug) => {
    const product = PRODUCTS.find((candidate) => candidate.id === slug);
    return product ? [product] : [];
  });
  const related = JOURNAL_ARTICLES.filter((candidate) => candidate.slug !== article.slug).slice(
    0,
    3,
  );
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}/#article`,
        headline: article.title,
        description: article.description,
        datePublished: article.published,
        dateModified: article.updated,
        mainEntityOfPage: { "@id": `${url}/#webpage` },
        author: { "@id": ORGANIZATION_ID },
        publisher: { "@id": ORGANIZATION_ID },
        image: DEFAULT_SOCIAL_IMAGE,
        articleSection: "Attar and perfume oil guides",
        keywords: article.keywords.join(", "),
        inLanguage: "en-IN",
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: article.title,
        description: article.description,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": `${url}/#article` },
        inLanguage: "en-IN",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
          { "@type": "ListItem", position: 2, name: "Journal", item: `${SITE_ORIGIN}/journal` },
          { "@type": "ListItem", position: 3, name: article.shortTitle, item: url },
        ],
      },
    ],
  };

  return (
    <StoreShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <main className="bg-white px-5 pb-24 pt-32 text-black sm:px-8 sm:pt-40">
        <article className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-[10px] text-black/42">
            <Link to="/journal" className="underline underline-offset-4">
              Journal
            </Link>{" "}
            / {article.shortTitle}
          </nav>
          <h1 className="mt-7 font-display text-5xl leading-[0.92] sm:text-7xl">{article.title}</h1>
          <p className="mt-7 text-lg leading-8 text-black/65">{article.description}</p>
          <p className="mt-5 text-[10px] uppercase tracking-[0.12em] text-black/40">
            Written by BADR · {article.readingTime} · Updated 31 August 2026
          </p>

          <div className="mt-14 border-t border-black/12">
            {article.sections.map((section) => (
              <section key={section.heading} className="border-b border-black/12 py-10 sm:py-12">
                <h2 className="font-display text-3xl leading-none sm:text-4xl">
                  {section.heading}
                </h2>
                <div className="mt-6 space-y-5 text-[15px] leading-8 text-black/68 sm:text-base">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}
          </div>

          {products.length ? (
            <section className="py-14">
              <p className="text-xs text-black/45">Scents mentioned in this guide</p>
              <div className="mt-5 grid gap-px bg-black/12 sm:grid-cols-2">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to="/product/$id"
                    params={{ id: product.id }}
                    className="group flex items-center gap-4 bg-white p-4"
                  >
                    <img
                      src={product.image}
                      alt={`${product.name} attar bottle`}
                      className="h-24 w-20 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                    <span>
                      <strong className="block font-display text-xl">{product.name}</strong>
                      <span className="mt-1 block text-xs text-black/48">
                        {product.notes.join(" · ")}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <section className="mx-auto mt-10 max-w-6xl border-t border-black/12 pt-14">
          <p className="text-xs text-black/45">Continue reading</p>
          <div className="mt-5 grid gap-px bg-black/12 md:grid-cols-3">
            {related.map((candidate) => (
              <Link
                key={candidate.slug}
                to="/journal/$slug"
                params={{ slug: candidate.slug }}
                className="bg-white p-6 font-display text-2xl leading-none transition-colors hover:bg-black hover:text-white"
              >
                {candidate.shortTitle}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}
