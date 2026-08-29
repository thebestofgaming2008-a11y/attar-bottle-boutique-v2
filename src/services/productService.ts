import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error("Missing VITE_CONVEX_URL.");
const convex = new ConvexHttpClient(convexUrl);

export interface Product {
  id: string;
  name: string;
  slug: string | null;
  product_type?: string | null;
  mood?: string | null;
  scent_profile?: string | null;
  hook?: string | null;
  story?: string | null;
  meaning?: string | null;
  key_notes?: string[] | null;
  occasion?: string | null;
  intensity?: string | null;
  longevity?: string | null;
  volume_label?: string | null;
  format_label?: string | null;
  country_of_origin?: string | null;
  faqs?: Array<{ question: string; answer: string }> | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  og_image_url?: string | null;
  sort_order?: number | null;
  short_description: string | null;
  description: string | null;
  author: string | null;
  publisher: string | null;
  language: string | null;
  pages: number | null;
  isbn: string | null;
  binding: string | null;
  edition: string | null;
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  shipping_class: string | null;
  weight_source_url: string | null;
  weight_confidence: string | null;
  price: number;
  price_inr: number;
  sale_price: number | null;
  sale_price_inr: number | null;
  sku: string | null;
  stock_quantity: number | null;
  category: string | null;
  category_id: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  images: string[] | null;
  linked_product_ids?: string[] | null;
  variant_label?: string | null;
  color_options?: string[] | null;
  size_options?: string[] | null;
  option_types?: Array<{ name: string; values: string[] }> | null;
  badge: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  show_in_category_section?: boolean | null;
  is_new_arrival: boolean | null;
  is_bestseller: boolean | null;
  is_on_sale: boolean | null;
  in_stock: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  search_text?: string | null;
}

const ACTIVE_PRODUCTS_CACHE_KEY = "badr_active_products_v1";
const OLD_ACTIVE_PRODUCTS_CACHE_KEYS = [
  "he_active_products_v3",
  "he_active_products_v4",
  "he_active_products_v5",
  "he_active_products_v6",
  "he_active_products_v7",
  "he_active_products_v8",
];
const ACTIVE_PRODUCTS_TTL_MS = 60 * 1000;
const TOP_LEVEL_CATEGORY_KEYS = new Set(["books", "clothing", "children", "women", "essentials"]);
const BOOK_SUBJECT_KEYS = new Set([
  "aqeedah",
  "arabic",
  "fiqh",
  "hadith",
  "purification",
  "seerah",
  "tafsir",
  "urdu",
  "character-development",
  "dua-adhkar",
  "womens-issues",
  "islamic-history",
  "family-marriage",
]);

let activeProductsMemoryCache: { expiresAt: number; products: Product[] } | null = null;
let activeProductsInFlight: Promise<Product[]> | null = null;

function normalize(p: unknown): Product {
  const r = p as Record<string, unknown>;
  return {
    ...(r as object),
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    color_options: Array.isArray(r.color_options) ? (r.color_options as string[]) : [],
    size_options: Array.isArray(r.size_options) ? (r.size_options as string[]) : [],
    option_types: Array.isArray(r.option_types)
      ? (r.option_types as Array<{ name: string; values: string[] }>)
      : [],
  } as Product;
}

function readActiveProductsCache(): Product[] | null {
  if (typeof window === "undefined") return null;
  if (activeProductsMemoryCache && activeProductsMemoryCache.expiresAt > Date.now()) {
    if (activeProductsMemoryCache.products.length > 0) {
      return activeProductsMemoryCache.products;
    }
    activeProductsMemoryCache = null;
  }
  try {
    const cached = window.localStorage.getItem(ACTIVE_PRODUCTS_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { expiresAt?: number; products?: unknown[] };
    if (
      !parsed.expiresAt ||
      parsed.expiresAt <= Date.now() ||
      !Array.isArray(parsed.products) ||
      parsed.products.length === 0
    ) {
      window.localStorage.removeItem(ACTIVE_PRODUCTS_CACHE_KEY);
      return null;
    }
    const products = parsed.products.map(normalize);
    activeProductsMemoryCache = { expiresAt: parsed.expiresAt, products };
    return products;
  } catch {
    return null;
  }
}

async function fetchEdgeCatalog(cacheBust = false): Promise<unknown> {
  const version = cacheBust
    ? `r2-compact-v3-subjects-20260611-${Date.now()}`
    : "r2-compact-v3-subjects-20260611";
  const response = await fetch(`/api/catalog/products?v=${encodeURIComponent(version)}`, {
    headers: { accept: "application/json" },
    cache: cacheBust ? "no-store" : "default",
  });
  if (!response.ok) throw new Error("Catalog edge cache unavailable.");
  return response.json();
}

function normalizeProductList(raw: unknown): Product[] {
  if (!Array.isArray(raw)) throw new Error("Catalog response was not an array.");
  const products = raw.map(normalize);
  if (products.length === 0) throw new Error("Catalog response was empty.");
  return products;
}

function writeActiveProductsCache(products: Product[]) {
  if (!products.length) return;
  const expiresAt = Date.now() + ACTIVE_PRODUCTS_TTL_MS;
  activeProductsMemoryCache = { expiresAt, products };
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_PRODUCTS_CACHE_KEY, JSON.stringify({ expiresAt, products }));
  } catch {
    // Cache is a performance optimization only.
  }
}

function topCategory(product: Pick<Product, "category" | "category_id">): string | null {
  const category = String(product.category ?? "")
    .trim()
    .toLowerCase();
  const categoryId = String(product.category_id ?? "")
    .trim()
    .toLowerCase();
  if (categoryId === "essentials" || category === "essentials") return "children";
  if (TOP_LEVEL_CATEGORY_KEYS.has(categoryId))
    return categoryId === "essentials" ? "children" : categoryId;
  if (TOP_LEVEL_CATEGORY_KEYS.has(category))
    return category === "essentials" ? "children" : category;
  if (BOOK_SUBJECT_KEYS.has(categoryId) || BOOK_SUBJECT_KEYS.has(category)) return "books";
  return category || categoryId || null;
}

export async function listActiveProducts(): Promise<Product[]> {
  const cached = readActiveProductsCache();
  if (cached) return cached;
  if (activeProductsInFlight) return activeProductsInFlight;

  const request = convex.query(api.products.listActiveProducts, {});

  activeProductsInFlight = request
    .then((raw) => {
      const products = normalizeProductList(raw);
      writeActiveProductsCache(products);
      return products;
    })
    .catch(async () => {
      try {
        const products = (
          (await convex.query(api.products.listActiveProducts, {})) as Product[]
        ).map(normalize);
        writeActiveProductsCache(products);
        return products;
      } catch {
        return [];
      }
    })
    .finally(() => {
      activeProductsInFlight = null;
    });

  return activeProductsInFlight;
}

export function clearProductListCache() {
  activeProductsMemoryCache = null;
  activeProductsInFlight = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(ACTIVE_PRODUCTS_CACHE_KEY);
      OLD_ACTIVE_PRODUCTS_CACHE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // Ignore storage failures.
    }
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const product = (await convex.query(api.products.getProductById, { id })) as Product | null;
    return product ? normalize(product) : null;
  } catch {
    try {
      const product = (await convex.query(api.products.getProductById, { id })) as Product | null;
      return product ? normalize(product) : null;
    } catch {
      return null;
    }
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const product = (await convex.query(api.products.getProductBySlug, { slug })) as Product | null;
    return product ? normalize(product) : null;
  } catch {
    try {
      const product = (await convex.query(api.products.getProductBySlug, {
        slug,
      })) as Product | null;
      return product ? normalize(product) : null;
    } catch {
      return null;
    }
  }
}

export async function listFeatured(limit = 8): Promise<Product[]> {
  const data = await listActiveProducts();
  return data.filter((product) => product.is_featured).slice(0, limit);
}

export async function listByCategory(categorySlug: string): Promise<Product[]> {
  const categoryKey = categorySlug === "essentials" ? "children" : categorySlug;
  const data = await listActiveProducts();
  return data.filter(
    (product) =>
      topCategory(product) === categoryKey ||
      product.category_id === categorySlug ||
      product.category === categorySlug,
  );
}

export async function listByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const cached = readActiveProductsCache();
  if (cached) {
    const byId = new Map(cached.map((product) => [product.id, product]));
    if (ids.every((id) => byId.has(id))) {
      return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
    }
  }
  const products = await listActiveProducts();
  const byId = new Map(products.map((product) => [product.id, product]));
  if (ids.every((id) => byId.has(id))) {
    return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
  }
  try {
    return ((await convex.query(api.products.listByIds, { ids })) as Product[]).map(normalize);
  } catch {
    return [];
  }
}
