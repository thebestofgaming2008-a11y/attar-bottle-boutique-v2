import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTS } from "@/lib/products";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { Hero } from "@/components/store/Hero";
import { VideoBand } from "@/components/store/VideoBand";
import { ScentChapter } from "@/components/store/ScentChapter";

const SITE_ORIGIN =
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  "https://badr-boutique-studio-v2.thebestofgaming2008.workers.dev";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BADR Attar — Shop Your Scent" },
      {
        name: "description",
        content:
          "Five unisex attars in one signature 6 ml bottle. Oud Zafar, Oud Gulaab, Fitoor, Dariya and Ulfat — from ₹499 with India shipping included.",
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
  const scrollToShop = () =>
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });

  return (
    <StoreShell>
      <Hero onCta={scrollToShop} />

      <VideoBand />

      {PRODUCTS.map((p, index) => (
        <div id={index === 0 ? "shop" : undefined} key={p.id}>
          <ScentChapter product={p} />
        </div>
      ))}

      <SiteFooter />
    </StoreShell>
  );
}
