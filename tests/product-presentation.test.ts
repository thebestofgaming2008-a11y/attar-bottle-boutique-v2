import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AnnouncementMessages } from "../src/components/store/AnnouncementBanner";
import { productSeo } from "../src/lib/productSeo";
import type { Product } from "../src/lib/products";

test("announcements are distinct messages with one accessible copy and no pause button", () => {
  const html = renderToStaticMarkup(
    createElement(AnnouncementMessages, {
      messages: [" Delivery in India ", "", "International orders via WhatsApp"],
    }),
  );
  expect(html.match(/class="announcement-message"/g)).toHaveLength(4);
  expect(html.match(/aria-hidden="true"/g)).toHaveLength(1);
  expect(html).not.toContain("<button");
  expect(html).not.toContain("·");
  expect(html).toContain(">Delivery in India<");
});

test("empty announcement content takes no space", () => {
  expect(renderToStaticMarkup(createElement(AnnouncementMessages, { messages: [" "] }))).toBe("");
});

const product = {
  name: "Oud Zafar",
  hook: "Oud, saffron and rose.",
  volume: "6 ml",
  image: "https://example.com/admin-cover.webp",
} as Product;

test("product SEO uses specific visible copy and the current admin cover", () => {
  const seo = productSeo(product);
  expect(seo.title).toBe("Oud Zafar Attar Perfume Oil | BADR India");
  expect(seo.description).toContain(product.hook);
  expect(seo.image).toBe(product.image);
});

test("admin SEO fields remain authoritative", () => {
  expect(
    productSeo({
      ...product,
      seoTitle: "Custom title",
      seoDescription: "Custom description",
      socialImage: "https://example.com/social.webp",
    }),
  ).toEqual({
    title: "Custom title",
    description: "Custom description",
    image: "https://example.com/social.webp",
  });
});

test("product search descriptions reflect the current scent notes", () => {
  const seo = productSeo({ ...product, notes: ["Rose", "Saffron", "Sandalwood"] });
  expect(seo.description).toContain("Rose, Saffron, Sandalwood attar perfume oil.");
});

test("packs are not described as one 6 ml bottle", () => {
  const seo = productSeo({ ...product, bundleContents: [{}] } as Product);
  expect(seo.title).toContain("Attar Set");
  expect(seo.description).not.toContain("6 ml");
});
