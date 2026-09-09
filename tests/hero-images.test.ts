/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { HeroBottle } from "../src/components/store/HeroBottle";
import type { HomepageLayout } from "../src/lib/homepageLayout";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());
const bottle = {
  productId: "dariya",
  imageUrl: "https://example.com/new-label.png",
  scale: 125,
  x: 2,
  y: -3,
};
async function setup() {
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
  const t = convexTest(schema, modules);
  const id = await t.run(async (ctx) => {
    await ctx.db.insert("products", {
      name: "Dariya",
      slug: "dariya",
      price: 499,
      price_inr: 499,
      is_active: true,
    });
    return ctx.db.insert("users", { email: "admin@example.com" });
  });
  const admin = t.withIdentity({ subject: `${id}|session` });
  const state = await admin.mutation(api.homepageLayout.initialize, {});
  return { t, admin, state };
}
function withBottle(layout: HomepageLayout, image = bottle): HomepageLayout {
  return {
    ...layout,
    sections: layout.sections.map((section) =>
      section.type === "hero" ? { ...section, bottleImages: [image] } : section,
    ),
  };
}
test("hero images stay private until publish, round-trip correctly, and can restore old layouts", async () => {
  const { t, admin, state } = await setup();
  const saved = await admin.mutation(api.homepageLayout.saveDraft, {
    layout: withBottle(state.draft),
    expectedVersion: state.draftVersion,
  });
  expect(await t.query(api.homepageLayout.getPublishedLayout, {})).toEqual(state.published);
  const published = await admin.mutation(api.homepageLayout.publishDraft, {
    expectedVersion: saved.draftVersion,
  });
  expect(published.published.sections[0]).toMatchObject({ bottleImages: [bottle] });
  const restored = await admin.mutation(api.homepageLayout.restoreRevision, {
    revisionId: published.revisions[0].id,
    expectedVersion: published.draftVersion,
  });
  expect(restored.published).toEqual(state.published);
});
test("anonymous users cannot change hero photos", async () => {
  const { t, state } = await setup();
  await expect(
    t.mutation(api.homepageLayout.saveDraft, {
      layout: withBottle(state.draft),
      expectedVersion: state.draftVersion,
    }),
  ).rejects.toThrow();
});
test("server bounds image size and position and rejects unsafe URLs", async () => {
  const { admin, state } = await setup();
  await expect(
    admin.mutation(api.homepageLayout.saveDraft, {
      layout: withBottle(state.draft, { ...bottle, imageUrl: "javascript:alert(1)" }),
      expectedVersion: state.draftVersion,
    }),
  ).rejects.toThrow();
  const saved = await admin.mutation(api.homepageLayout.saveDraft, {
    layout: withBottle(state.draft, { ...bottle, scale: 999, x: -999, y: 999 }),
    expectedVersion: state.draftVersion,
  });
  expect(saved.draft.sections[0]).toMatchObject({
    bottleImages: [{ ...bottle, scale: 300, x: -50, y: 50 }],
  });
});
test("shared hero rendering contains the full image and uses identical proportional framing", () => {
  const html = renderToStaticMarkup(
    createElement(HeroBottle, { image: bottle, alt: "Dariya", guides: true }),
  );
  expect(html).toContain("aspect-[176/230]");
  expect(html).toContain("object-contain");
  expect(html).not.toContain("object-cover");
  expect(html).toContain("translate(2%, -3%) scale(1.25)");
  expect(html).toContain("https://example.com/new-label.png");
});
test("delivery is green FREE only for India; cart and checkout savings are green", () => {
  const checkout = readFileSync("src/routes/checkout.tsx", "utf8");
  const cart = readFileSync("src/components/store/CartDrawer.tsx", "utf8");
  expect(checkout).toContain('isIndia ? "FREE" : "Confirmed on WhatsApp"');
  expect(checkout).toContain('isIndia ? "font-semibold text-green-700" : undefined');
  expect(checkout).toContain("mt-3 flex justify-between gap-3 text-sm text-green-700");
  expect(cart).toContain("mb-3 flex justify-between text-sm text-green-700");
});
