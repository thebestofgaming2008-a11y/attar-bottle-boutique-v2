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
      <main className="bg-white text-black">
        <section className="px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs text-black/45">House of BADR · Made in India</p>
            <h1 className="mt-4 max-w-5xl font-display text-[18vw] leading-[0.82] sm:text-[8rem]">
              Rare air.
            </h1>
            <p className="mt-10 max-w-2xl text-lg leading-8 text-black/68 sm:text-2xl sm:leading-10">
              BADR is an independent Indian fragrance house making concentrated attar perfume oils
              for all genders—small bottles with a deliberate point of view.
            </p>
          </div>
        </section>

        <section className="border-t border-black/10 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
            <div>
              <p className="text-xs text-black/45">What we make</p>
              <h2 className="mt-3 font-display text-4xl leading-none sm:text-6xl">
                Attar without the guesswork.
              </h2>
            </div>
            <div className="space-y-7 text-sm leading-8 text-black/65 sm:text-base">
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
              <div className="flex flex-wrap gap-3 pt-3">
                <Link
                  to="/shop"
                  className="motion-button bg-black px-6 py-3 text-xs font-semibold text-white"
                >
                  Explore all attars
                </Link>
                <a
                  href="https://wa.me/919073215410"
                  className="motion-button border border-black/25 px-6 py-3 text-xs font-semibold"
                >
                  Contact BADR
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-black/10 bg-black px-5 py-16 text-white sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs text-white/45">The five signatures</p>
            <div className="mt-8 grid gap-px bg-white/15 sm:grid-cols-2 lg:grid-cols-5">
              {SIGNATURE_SCENTS.map(([name, notes, slug]) => (
                <Link
                  key={slug}
                  to="/product/$id"
                  params={{ id: slug }}
                  className="group bg-black p-6 transition-colors hover:bg-white hover:text-black"
                >
                  <h3 className="font-display text-2xl">{name}</h3>
                  <p className="mt-3 text-xs leading-5 text-current opacity-55">{notes}</p>
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
