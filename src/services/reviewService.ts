import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error("Missing VITE_CONVEX_URL.");
const convex = new ConvexHttpClient(convexUrl);

export interface ProductReview {
  id: string;
  product_id: string;
  customer_name: string | null;
  customer_email: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  media_urls: string[] | null;
  status: string;
  created_at: string | null;
}

export async function listPublishedReviews(productId: string): Promise<ProductReview[]> {
  return (await convex.query(api.reviews.listPublishedForProduct, {
    productId,
  })) as ProductReview[];
}

export async function submitReview(input: {
  productId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
}): Promise<ProductReview | null> {
  return (await convex.mutation(api.reviews.submit, input)) as ProductReview | null;
}

export async function submitOrderReview(input: {
  orderNumber: string;
  email: string;
  productId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
}): Promise<ProductReview | null> {
  return (await convex.mutation(api.reviews.submitForOrder, input)) as ProductReview | null;
}

export async function canReviewProduct(productId: string): Promise<boolean> {
  const result = (await convex.query(api.reviews.canReviewProduct, { productId })) as {
    canReview?: boolean;
  };
  return Boolean(result?.canReview);
}
