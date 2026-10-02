import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { publicMediaData, publicMediaUrl } from "../src/lib/publicMedia";
import { reviewAuthor, reviewStructuredData } from "../src/lib/reviewSeo";
import { BrandFilm } from "../src/components/store/BrandFilm";
import { DEFAULT_HOMEPAGE_FILM_CONFIG } from "../src/lib/homepageFilm";
import type { ProductReview } from "../src/services/reviewService";

const oldOrigin = "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev";
const review = (name: string | null): ProductReview => ({
  id: "review",
  product_id: "product",
  customer_name: name,
  customer_email: null,
  rating: 4,
  title: null,
  body: "A lovely scent.",
  media_urls: [],
  status: "published",
  created_at: "2026-09-29T12:00:00Z",
});

describe("Public media migration", () => {
  it("preserves paths, query strings and unrelated URLs", () => {
    expect(publicMediaUrl(`${oldOrigin}/products/a.webp?v=2`)).toBe(
      "https://media.houseofbadr.com/products/a.webp?v=2",
    );
    expect(publicMediaUrl("/images/a.webp")).toBe("/images/a.webp");
    expect(publicMediaUrl(`${oldOrigin}.example.com/a.webp`)).toBe(
      `${oldOrigin}.example.com/a.webp`,
    );
  });
  it("normalizes nested public data without mutating the source", () => {
    const original = { gallery: [{ url: `${oldOrigin}/a.webp` }], stock: 0, missing: null };
    expect(publicMediaData(original)).toEqual({
      gallery: [{ url: "https://media.houseofbadr.com/a.webp" }],
      stock: 0,
      missing: null,
    });
    expect(original.gallery[0].url).toBe(`${oldOrigin}/a.webp`);
  });
});

describe("Honest review metadata", () => {
  it("does not invent people for anonymous reviews", () => {
    for (const name of [null, "", "Customer", "Verified customer"]) {
      expect(reviewAuthor(review(name))).toBeNull();
      expect(reviewStructuredData([review(name)])).toEqual([]);
    }
  });
  it("includes the actual visible author and rating", () => {
    expect(reviewStructuredData([review("  Amina  ")])[0]).toMatchObject({
      author: { name: "Amina" },
      reviewRating: { ratingValue: 4 },
      datePublished: "2026-09-29",
    });
  });
  it("does not mark up a review hidden behind Show more", () => {
    expect(
      reviewStructuredData([...Array.from({ length: 6 }, () => review(null)), review("Amina")]),
    ).toEqual([]);
  });
});

it("does not eagerly download the campaign video in server-rendered HTML", () => {
  const html = renderToStaticMarkup(
    createElement(BrandFilm, { config: DEFAULT_HOMEPAGE_FILM_CONFIG }),
  );
  expect(html).toContain('preload="none"');
  expect(html).not.toContain("autoPlay");
  expect(html).not.toMatch(/<source\s+src=/);
  expect(html).toContain('data-src="https://media.houseofbadr.com/campaign/');
});
