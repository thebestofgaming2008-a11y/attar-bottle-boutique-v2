import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import {
  DEFAULT_SOCIAL_IMAGE,
  ORGANIZATION_ID,
  SITE_ORIGIN,
  WEBSITE_ID,
  serializeJsonLd,
  socialMeta,
} from "@/lib/seo";

const ABOUT_URL = `${SITE_ORIGIN}/about`;
const ABOUT_TITLE = "About BADR | Indian Attar Perfume House";
const ABOUT_DESCRIPTION =
  "Meet BADR, an independent Indian fragrance house creating concentrated, alcohol-free 6 ml roll-on attars for all genders.";
const SIGNATURE_SCENTS = [
  ["Oud Zafar", "Oud · saffron · sandalwood", "oud-zafar"],
  ["Oud Gulaab", "Rose · oud · musk", "oud-gulaab"],
  ["Fitoor", "Pineapple · vanilla · musk", "fitoor"],
  ["Dariya", "Bergamot · mandarin · vetiver", "dariya"],
  ["Ulfat", "Vanilla · lavender · amber", "ulfat"],
] as const;

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: ABOUT_TITLE },
      { name: "description", content: ABOUT_DESCRIPTION },
      ...socialMeta({
        title: ABOUT_TITLE,
        description: ABOUT_DESCRIPTION,
        url: ABOUT_URL,
        image: DEFAULT_SOCIAL_IMAGE,
        imageAlt: "BADR concentrated attar perfume bottle",
      }),
    ],
    links: [{ rel: "canonical", href: ABOUT_URL }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const aboutSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${ABOUT_URL}/#webpage`,
        url: ABOUT_URL,
        name: ABOUT_TITLE,
        description: ABOUT_DESCRIPTION,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        inLanguage: "en-IN",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
          { "@type": "ListItem", position: 2, name: "About BADR", item: ABOUT_URL },
        ],
      },
    ],
  };

  return (
    <StoreShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(aboutSchema) }}
      />
      <main className="bg-white text-left text-black [overflow-wrap:anywhere]">
        <section className="px-5 pb-12 pt-28 sm:px-8 sm:pb-28 sm:pt-40">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs leading-5 text-black/60">House of BADR · Made in India</p>
            <h1 className="mt-4 max-w-5xl text-balance font-display text-[clamp(2.5rem,11vw,4rem)] leading-[1.1] sm:text-7xl sm:leading-[0.95] lg:text-[8rem] lg:leading-[0.9]">
              Rare air.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-black/75 sm:mt-10 sm:text-2xl sm:leading-10">
              BADR is an independent Indian fragrance house making concentrated attar perfume oils
              for all genders—small bottles with a deliberate point of view.
            </p>
          </div>
        </section>

        <section className="border-t border-black/10 px-5 py-10 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-6 sm:gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-24">
            <div>
              <p className="text-xs leading-5 text-black/60">What we make</p>
              <h2 className="mt-3 text-balance font-display text-2xl leading-[1.25] sm:text-4xl sm:leading-[1.05] lg:text-6xl">
                Attar without the guesswork.
              </h2>
            </div>
            <div className="space-y-4 text-base leading-7 text-black/75 sm:space-y-7 sm:leading-8">
              <p>
                Every BADR scent comes as a concentrated, alcohol-free 6 ml roll-on perfume oil. The
                collection moves from oud and saffron to rose, fruit, fresh citrus and warm vanilla,
                so choosing a scent starts with what you actually want to smell.
              </p>
              <p>
                Product pages state the notes, intensity, expected wear, format and price clearly.
                India delivery is included in the displayed price; international orders are
                confirmed personally through WhatsApp.
              </p>
              <div className="flex flex-col items-stretch gap-3 pt-3 min-[400px]:flex-row min-[400px]:flex-wrap">
                <Link
                  to="/shop"
                  className="motion-button bg-black px-6 py-3 text-center text-sm font-semibold text-white"
                >
                  Explore all attars
                </Link>
                <a
                  href="https://wa.me/919073215410"
                  className="motion-button border border-black/25 px-6 py-3 text-center text-sm font-semibold"
                >
                  Contact BADR
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-black/10 bg-black px-5 py-10 text-white sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs leading-5 text-white/65">The five signatures</p>
            <div className="mt-8 grid gap-px bg-white/15 sm:grid-cols-2 lg:grid-cols-5">
              {SIGNATURE_SCENTS.map(([name, notes, slug]) => (
                <Link
                  key={slug}
                  to="/product/$id"
                  params={{ id: slug }}
                  className="group min-w-0 bg-black py-6 transition-colors hover:bg-white hover:text-black sm:p-6"
                >
                  <h3 className="font-display text-xl leading-tight sm:text-2xl">{name}</h3>
                  <p className="mt-3 text-sm leading-6 text-current opacity-75">{notes}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}
