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
      <main className="bg-white px-5 pb-20 pt-28 text-left text-black [overflow-wrap:anywhere] sm:px-8 sm:pb-24 sm:pt-40">
        <article className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-xs leading-5 text-black/60">
            <Link to="/journal" className="underline underline-offset-4">
              Journal
            </Link>{" "}
            / {article.shortTitle}
          </nav>
          <h1 className="mt-6 text-balance font-display text-[clamp(2rem,8.5vw,2.5rem)] leading-[1.12] sm:mt-7 sm:text-5xl sm:leading-[1.05] lg:text-7xl lg:leading-[0.98]">
            {article.title}
          </h1>
          <p className="mt-6 text-base leading-7 text-black/75 sm:mt-7 sm:text-lg sm:leading-8">
            {article.description}
          </p>
          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-black/60">
            <span>Written by BADR</span>
            <span>{article.readingTime}</span>
            <time dateTime={article.updated} className="basis-full sm:basis-auto">
              Updated{" "}
              {new Date(article.updated).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </time>
          </p>

          <div className="mt-8 border-t border-black/12 sm:mt-14">
            {article.sections.map((section) => (
              <section key={section.heading} className="border-b border-black/12 py-8 sm:py-12">
                <h2 className="text-balance font-display text-[22px] leading-[1.25] sm:text-3xl sm:leading-[1.1] lg:text-4xl">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-7 text-black/75 sm:mt-6 sm:space-y-5 sm:leading-8">
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
            <section className="py-8 sm:py-14">
              <p className="text-xs leading-5 text-black/60">Scents mentioned in this guide</p>
              <div className="mt-5 grid gap-px bg-black/12 sm:grid-cols-2">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to="/product/$id"
                    params={{ id: product.id }}
                    className="group flex min-w-0 items-center gap-4 bg-white py-4 sm:p-4"
                  >
                    <img
                      src={product.image}
                      alt={`${product.name} attar bottle`}
                      className="h-24 w-20 shrink-0 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="min-w-0">
                      <strong className="block font-display text-xl leading-tight">
                        {product.name}
                      </strong>
                      <span className="mt-2 block text-sm leading-6 text-black/65">
                        {product.notes.join(" · ")}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <section className="mx-auto mt-4 max-w-3xl border-t border-black/12 pt-8 sm:mt-10 sm:pt-14">
          <p className="text-xs leading-5 text-black/60">Continue reading</p>
          <div className="mt-5 grid gap-px bg-black/12 md:grid-cols-3">
            {related.map((candidate) => (
              <Link
                key={candidate.slug}
                to="/journal/$slug"
                params={{ slug: candidate.slug }}
                className="min-w-0 bg-white py-5 font-display text-xl leading-[1.25] transition-colors hover:bg-black hover:text-white sm:p-6 sm:text-2xl"
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
