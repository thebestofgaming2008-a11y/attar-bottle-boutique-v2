import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTS } from "@/lib/products";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { Hero } from "@/components/store/Hero";
import { VideoBand } from "@/components/store/VideoBand";
import { ScentChapter } from "@/components/store/ScentChapter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BADR Attar — Shop Your Scent" },
      {
        name: "description",
        content:
          "Five unisex attars in one signature 6 ml bottle. Oud Zafar, Oud Gulaab, Fitoor, Dariya and Ulfat — from ₹499, free shipping over ₹999.",
      },
      { property: "og:title", content: "BADR Attar — Shop Your Scent" },
      {
        property: "og:description",
        content: "Rare air. Crafted for the relentless. Five unisex attars, one signature bottle.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content:
          "https://badr-boutique-studio-v2.thebestofgaming2008.workers.dev/badr-campaign-banner.png",
      },
      {
        property: "og:url",
        content: "https://badr-boutique-studio-v2.thebestofgaming2008.workers.dev",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content:
          "https://badr-boutique-studio-v2.thebestofgaming2008.workers.dev/badr-campaign-banner.png",
      },
    ],
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

      <section className="bg-foreground px-4 pb-4 sm:px-6 sm:pb-6">
        <img
          src="/badr-campaign-banner.png"
          alt="BADR collection — five luxury attar bottles"
          className="mx-auto w-full max-w-7xl"
        />
      </section>

      {PRODUCTS.map((p, i) => (
        <div id={i === 0 ? "shop" : undefined} key={p.id}>
          <ScentChapter product={p} index={i} />
        </div>
      ))}

      <SiteFooter />
    </StoreShell>
  );
}
