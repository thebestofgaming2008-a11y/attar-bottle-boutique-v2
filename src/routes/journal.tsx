import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { JOURNAL_ARTICLES } from "@/lib/journal";
import { SITE_ORIGIN, serializeJsonLd, socialMeta } from "@/lib/seo";

const JOURNAL_URL = `${SITE_ORIGIN}/journal`;
const TITLE = "Attar & Perfume Oil Guides | BADR Journal";
const DESCRIPTION =
  "Clear BADR guides to applying attar, choosing scent profiles, understanding oud and comparing perfume oil with spray fragrance.";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      ...socialMeta({
        title: TITLE,
        description: DESCRIPTION,
        url: JOURNAL_URL,
        imageAlt: "BADR concentrated attar perfume bottle",
      }),
    ],
    links: [{ rel: "canonical", href: JOURNAL_URL }],
  }),
  component: JournalPage,
});

function JournalPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: JOURNAL_URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en-IN",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: JOURNAL_ARTICLES.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: article.title,
        url: `${JOURNAL_URL}/${article.slug}`,
      })),
    },
  };

  return (
    <StoreShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <main className="bg-white px-5 pb-20 pt-28 text-left text-black [overflow-wrap:anywhere] sm:px-8 sm:pb-24 sm:pt-40">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs leading-5 text-black/60">BADR field notes</p>
          <h1 className="mt-4 max-w-5xl text-balance font-display text-[clamp(2rem,8.5vw,2.5rem)] leading-[1.12] sm:text-6xl sm:leading-[1.05] lg:text-8xl lg:leading-[0.95]">
            Wear fragrance with intent.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-black/75 sm:mt-8 sm:text-lg sm:leading-8">
            Straight answers about perfume oil, scent profiles and the small decisions that change
            how an attar wears.
          </p>

          <div className="mt-10 grid gap-px border-y border-black/12 bg-black/12 sm:mt-16 md:grid-cols-2">
            {JOURNAL_ARTICLES.map((article, index) => (
              <article
                key={article.slug}
                className="flex min-w-0 flex-col bg-white py-8 sm:min-h-72 sm:p-10"
              >
                <p className="text-xs leading-5 text-black/60">
                  Guide {String(index + 1).padStart(2, "0")} · {article.readingTime}
                </p>
                <h2 className="mt-4 text-balance font-display text-[22px] leading-[1.25] sm:mt-5 sm:text-3xl sm:leading-[1.1] lg:text-4xl">
                  {article.shortTitle}
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-black/75 sm:mt-5">
                  {article.description}
                </p>
                <Link
                  to="/journal/$slug"
                  params={{ slug: article.slug }}
                  className="mt-auto self-start py-3 text-sm font-semibold underline decoration-black/25 underline-offset-4 sm:pt-8"
                >
                  Read the guide
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}
