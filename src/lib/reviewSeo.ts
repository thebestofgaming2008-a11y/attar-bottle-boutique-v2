import type { ProductReview } from "@/services/reviewService";

export function reviewAuthor(review: Pick<ProductReview, "customer_name">): string | null {
  const name = review.customer_name?.trim();
  if (!name || name.length >= 100 || /^(verified\s+)?customer$/i.test(name)) return null;
  return name;
}

export function reviewStructuredData(reviews: ProductReview[]) {
  // Only mark up reviews visible in the initial server-rendered page. Anonymous
  // reviews still contribute to the genuine aggregate, but get no invented author.
  return reviews.slice(0, 6).flatMap((review) => {
    const name = reviewAuthor(review);
    if (!name) return [];
    return [
      {
        "@type": "Review",
        ...(review.title ? { name: review.title } : {}),
        ...(review.body ? { reviewBody: review.body } : {}),
        reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
        author: { "@type": "Person", name },
        ...(review.created_at ? { datePublished: review.created_at.slice(0, 10) } : {}),
      },
    ];
  });
}
