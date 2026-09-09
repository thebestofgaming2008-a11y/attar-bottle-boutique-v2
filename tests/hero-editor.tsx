// Local presentation fixture. Never saves to a backend or publishes content.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { HeroBottleEditor } from "../src/components/admin/HeroBottleEditor";
import { HeroBottle } from "../src/components/store/HeroBottle";
import { PRODUCTS, BOTTLE_IMAGES } from "../src/lib/products";
import type { HomepageHeroSection } from "../src/lib/homepageLayout";
import "../src/styles.css";
function Fixture() {
  const [mobile, setMobile] = useState(false);
  const [section, setSection] = useState<HomepageHeroSection>({
    id: "hero",
    type: "hero",
    visible: true,
    headline: "Rare Air",
    eyebrow: "",
    subtext: "",
    ctaLabel: "Shop now",
    ctaHref: "#shop",
    productIds: PRODUCTS.map((p) => p.id),
  });
  return (
    <main className="vibe-admin admin-vibe mx-auto p-4" style={{ maxWidth: mobile ? 390 : 850 }}>
      <button type="button" className="mb-4 rounded border p-3" onClick={() => setMobile(!mobile)}>
        Toggle phone-width layout
      </button>
      <HeroBottleEditor section={section} products={PRODUCTS} onChange={setSection} />
      <h2 className="my-4 font-semibold">Same-scale comparison</h2>
      <div className="flex flex-wrap gap-3 bg-black p-4">
        {PRODUCTS.map((p) => (
          <div key={p.id} className="h-[150px] w-[115px] overflow-hidden">
            <HeroBottle
              image={
                section.bottleImages?.find((i) => i.productId === p.id) ?? {
                  productId: p.id,
                  imageUrl: BOTTLE_IMAGES[p.id],
                  scale: 100,
                  x: 0,
                  y: 0,
                }
              }
              alt={p.name}
              guides
            />
          </div>
        ))}
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
