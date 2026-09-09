import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Product } from "./productService";

// Public page loaders must distinguish an empty/missing catalog from an outage.
// Never publish an old seed product as available when the live product is gone.
async function bounded<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Catalog temporarily unavailable")), 8000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function loadPublicCatalog(): Promise<Product[]> {
  const client = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);
  return (await bounded(client.query(api.products.listActiveProducts, {}))) as Product[];
}

export async function loadPublicProduct(identifier: string): Promise<Product | null> {
  const client = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);
  const product = await bounded(client.query(api.products.getProductBySlug, { slug: identifier }));
  if (product) return product as Product;
  // Slugs are optional. Only pass verified catalog IDs to getProductById.
  const catalog = await bounded(client.query(api.products.listActiveProducts, {}));
  const match = catalog.find((item) => item.id === identifier);
  return match
    ? ((await bounded(
        client.query(api.products.getProductById, { id: match.id }),
      )) as Product | null)
    : null;
}

export async function loadPublishedHomepage() {
  const client = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);
  const [layout, film] = await Promise.all([
    bounded(client.query(api.homepageLayout.getPublishedLayout, {})),
    bounded(client.query(api.homepage.getFilmConfig, {})),
  ]);
  return { layout, film };
}
