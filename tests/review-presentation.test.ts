import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ProductReviews } from "../src/components/store/ProductReviews";
import type { ProductReview } from "../src/services/reviewService";

test("review section and invitation appear even with no existing reviews", () => {
  const html = renderToStaticMarkup(
    createElement(ProductReviews, { reviews: [], productId: "product", productName: "Dariya" }),
  );
  expect(html).toContain('id="reviews"');
  expect(html).toContain("Write a review");
  expect(html).toContain("No reviews yet");
  expect(html).not.toContain("5 / 5");
});
test("published review shows rating, text and lazy-loaded photos without customer email", () => {
  const review: ProductReview = {
    id: "review",
    product_id: "product",
    customer_name: "Customer",
    customer_email: "private@example.com",
    rating: 4,
    title: null,
    body: "Fresh and subtle.",
    media_urls: ["https://media.example.com/review.webp"],
    status: "published",
    created_at: null,
  };
  const html = renderToStaticMarkup(
    createElement(ProductReviews, {
      reviews: [review],
      productId: "product",
      productName: "Dariya",
    }),
  );
  expect(html).toContain("4.0 / 5");
  expect(html).toContain("Fresh and subtle.");
  expect(html).toContain('loading="lazy"');
  expect(html).toContain("Customer photo of Dariya");
  expect(html).not.toContain("private@example.com");
});
