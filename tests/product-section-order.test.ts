// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("reviews follow product details and precede recommendations and footer", () => {
  const source = readFileSync(new URL("../src/routes/product.$id.tsx", import.meta.url), "utf8");
  const story = source.indexOf("<ProductStory ");
  const details = source.indexOf("<ProductFaqs ");
  const reviews = source.indexOf("<ProductReviews");
  const recommendations = source.indexOf("You may also like");
  const footer = source.indexOf("<SiteFooter");
  expect(story).toBeGreaterThan(-1);
  expect(details).toBeGreaterThan(story);
  expect(reviews).toBeGreaterThan(details);
  expect(recommendations).toBeGreaterThan(reviews);
  expect(footer).toBeGreaterThan(recommendations);
  expect(source.match(/<ProductReviews\b/g)).toHaveLength(1);
});
