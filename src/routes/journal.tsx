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
      <main className="bg-white px-5 pb-24 pt-32 text-black sm:px-8 sm:pt-40">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs text-black/45">BADR field notes</p>
          <h1 className="mt-4 max-w-5xl font-display text-6xl leading-[0.88] sm:text-8xl">
            Wear fragrance with intent.
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-8 text-black/62 sm:text-lg">
            Straight answers about perfume oil, scent profiles and the small decisions that change
            how an attar wears.
          </p>

          <div className="mt-16 grid gap-px bg-black/12 md:grid-cols-2">
            {JOURNAL_ARTICLES.map((article, index) => (
              <article key={article.slug} className="flex min-h-72 flex-col bg-white p-7 sm:p-10">
                <p className="text-[10px] uppercase tracking-[0.12em] text-black/40">
                  Guide {String(index + 1).padStart(2, "0")} · {article.readingTime}
                </p>
                <h2 className="mt-5 font-display text-3xl leading-none sm:text-4xl">
                  {article.shortTitle}
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-black/60">
                  {article.description}
                </p>
                <Link
                  to="/journal/$slug"
                  params={{ slug: article.slug }}
                  className="mt-auto pt-8 text-xs font-semibold underline decoration-black/25 underline-offset-4"
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
