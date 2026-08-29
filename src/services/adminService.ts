import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { convex } from "@/integrations/convex/client";
import type { Product } from "./productService";

export const PRODUCT_BUCKET = "product-images";

export interface ProductInput {
  name: string;
  slug?: string | null;
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
  short_description?: string | null;
  description?: string | null;
  author?: string | null;
  publisher?: string | null;
  language?: string | null;
  pages?: number | null;
  isbn?: string | null;
  binding?: string | null;
  edition?: string | null;
  weight_g?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  shipping_class?: string | null;
  weight_source_url?: string | null;
  weight_confidence?: string | null;
  price?: number;
  price_inr: number;
  sale_price?: number | null;
  sale_price_inr?: number | null;
  sku?: string | null;
  stock_quantity?: number | null;
  category?: string | null;
  category_id?: string | null;
  cover_image_url?: string | null;
  images?: string[];
  linked_product_ids?: string[];
  variant_label?: string | null;
  color_options?: string[] | null;
  size_options?: string[] | null;
  option_types?: Array<{ name: string; values: string[] }> | null;
  badge?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  show_in_category_section?: boolean;
  is_bestseller?: boolean;
  is_new_arrival?: boolean;
  is_on_sale?: boolean;
  tags?: string[];
}

export async function listAllProducts(): Promise<Product[]> {
  return (await convex.query(api.products.listAllProducts, {})) as Product[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function createProduct(input: ProductInput): Promise<Product | null> {
  const payload = {
    ...input,
    slug: input.slug || slugify(input.name) || null,
    price: input.price ?? input.price_inr,
  };
  try {
    return (await convex.mutation(api.products.createProduct, payload)) as Product | null;
  } catch (error) {
    throw new Error(adminMutationMessage(error, "Could not create product."));
  }
}

export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>,
): Promise<Product | null> {
  const next: Record<string, unknown> = { ...patch };
  if (patch.price_inr != null && patch.price == null) next.price = patch.price_inr;
  try {
    return (await convex.mutation(api.products.updateProduct, {
      id,
      patch: next,
    })) as Product | null;
  } catch (error) {
    throw new Error(adminMutationMessage(error, "Could not update product."));
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  return await convex.mutation(api.products.deleteProduct, { id });
}

export async function refreshPublicCatalog(product?: Pick<Product, "id" | "slug"> | null) {
  if (typeof window === "undefined") return;
  const version = Date.now().toString();
  const requests = [`/api/catalog/products?refresh=${encodeURIComponent(version)}`];
  if (product?.id)
    requests.push(
      `/api/catalog/product?id=${encodeURIComponent(product.id)}&refresh=${encodeURIComponent(version)}`,
    );
  if (product?.slug)
    requests.push(
      `/api/catalog/product?slug=${encodeURIComponent(product.slug)}&refresh=${encodeURIComponent(version)}`,
    );

  const results = await Promise.allSettled(
    requests.map((url) =>
      fetch(url, {
        cache: "no-store",
        headers: { accept: "application/json" },
      }),
    ),
  );
  const failed = results.some(
    (result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.ok),
  );
  if (failed)
    throw new Error(
      "Product saved, but the public shop cache could not refresh. Refresh the shop once and check it before announcing the product.",
    );
}

export async function uploadProductImage(file: File): Promise<string | null> {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Product media must be 25 MB or smaller.");
  }
  const preparedFile = await optimizeProductImage(file);
  const contentType = inferProductMediaType(preparedFile);
  if (!contentType) {
    throw new Error(
      "Upload JPG, PNG, WebP, AVIF, GIF, MP4, or WebM. HEIC/HEIF phone photos must be exported as JPG first.",
    );
  }

  const media = await convex.action(api.media.createProductMediaUpload, {
    fileName: safeUploadFileName(preparedFile.name || "product-media"),
    contentType,
    size: preparedFile.size,
  });
  let result: Response;
  try {
    result = await fetch(media.uploadUrl, {
      method: media.method ?? "POST",
      headers: media.headers,
      body: preparedFile,
    });
  } catch (error) {
    throw new Error(uploadErrorMessage(error));
  }
  if (!result.ok) {
    const payload = (await result.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Upload failed with status ${result.status}.`);
  }
  const payload = (await result.json().catch(() => null)) as { url?: string } | null;
  const url = media.publicUrl || payload?.url;
  if (!url) throw new Error("Upload finished, but no media URL was returned.");
  return `${url}#${encodeURIComponent(preparedFile.name)}`;
}

async function optimizeProductImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(inferProductMediaType(file) ?? "")) {
    return file;
  }
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return file;

  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 40_000_000) {
      throw new Error("Product images cannot exceed 40 megapixels.");
    }
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return file;
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.86),
    );
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "product-image";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } finally {
    image.close();
  }
}

function safeUploadFileName(name: string) {
  const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `${base || "product-media"}${extension.toLowerCase()}`.slice(0, 120);
}

function uploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/failed to fetch|network/i.test(message)) {
    return "Upload could not reach the media server. Check the connection and try again.";
  }
  if (/ByteString|headers/i.test(message)) {
    return "The file name was not accepted by the browser. Rename the file using English letters and try again.";
  }
  return message || "Upload failed before reaching the media server.";
}

function adminMutationMessage(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const withoutConvexPrefix = raw
    .replace(/\[CONVEX [^\]]+\]\s*/g, "")
    .replace(/\[Request ID:[^\]]+\]\s*/g, "")
    .replace(/\bServer Error\b/g, "")
    .replace(/\bCalled by client\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!withoutConvexPrefix || /^client$/i.test(withoutConvexPrefix)) return fallback;
  return withoutConvexPrefix;
}

function inferProductMediaType(file: File) {
  const declared = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (SUPPORTED_PRODUCT_MEDIA_TYPES.has(declared)) return declared;

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  return PRODUCT_MEDIA_TYPES_BY_EXTENSION[extension] ?? null;
}

const SUPPORTED_PRODUCT_MEDIA_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

const PRODUCT_MEDIA_TYPES_BY_EXTENSION: Record<string, string | null> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  heic: null,
  heif: null,
  mov: null,
  m4v: null,
};

export interface ShippingRate {
  id: string;
  carrier: string;
  zone: string;
  method: string;
  base_fee: number;
  per_item_fee: number;
  per_weight_fee: number;
  is_active: boolean;
  updated_at: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  section: string;
}

export interface AdminShippingAddress {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export async function listShippingRates(): Promise<ShippingRate[]> {
  let rows = (await convex.query(api.admin.listShippingRates, {})) as ShippingRate[];
  if (!rows.length) {
    await convex.mutation(api.admin.seedShippingDefaults, {});
    rows = (await convex.query(api.admin.listShippingRates, {})) as ShippingRate[];
  }
  return rows;
}

export async function updateShippingRate(
  id: string,
  patch: Partial<ShippingRate>,
): Promise<ShippingRate | null> {
  return (await convex.mutation(api.admin.updateShippingRate, {
    id: id as any,
    patch,
  })) as ShippingRate | null;
}

export async function getStoreSettings(): Promise<Record<string, unknown>> {
  return (await convex.query(api.admin.getStoreSettings, {})) as Record<string, unknown>;
}

export async function saveStoreSettings(settings: Record<string, unknown>): Promise<boolean> {
  return await convex.mutation(api.admin.saveStoreSettings, { settings });
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  type: string;
  parent_slug?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function listCategories(type?: string): Promise<AdminCategory[]> {
  return (await convex.query(api.admin.listCategories, { type })) as AdminCategory[];
}

export async function upsertCategory(input: {
  slug?: string | null;
  name: string;
  type?: string;
  parent_slug?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
}): Promise<AdminCategory | null> {
  return (await convex.mutation(api.admin.upsertCategory, input)) as AdminCategory | null;
}

export async function seedDefaultCategories(): Promise<boolean> {
  return await convex.mutation(api.admin.seedDefaultCategories, {});
}

export async function listAdminNotifications(): Promise<AdminNotification[]> {
  return (await convex.query(api.admin.notifications, {})) as AdminNotification[];
}

export interface AdminOrder {
  id: string;
  order_number: string | null;
  user_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: string | null;
  payment_status: string | null;
  refund_amount_inr?: number | null;
  refund_status?: string | null;
  refund_id?: string | null;
  refund_requested_at?: string | null;
  refund_reason?: string | null;
  refund_error?: string | null;
  refunded_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  returned_at?: string | null;
  return_reason?: string | null;
  inventory_restocked_at?: string | null;
  inventory_attention?: boolean | null;
  shipping_payment_status?: string | null;
  shipping_payment_note?: string | null;
  customer_country_type?: string | null;
  shipping_address?: AdminShippingAddress | null;
  shipping_cost?: number | null;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  total: number;
  total_inr: number | null;
  created_at: string | null;
  items?: Array<{
    id: string;
    product_id?: string | null;
    product_name?: string | null;
    product_image_url?: string | null;
    selected_color?: string | null;
    selected_size?: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

export async function listAllOrders(limit = 100): Promise<AdminOrder[]> {
  return (await convex.query(api.orders.listAll, { limit })) as AdminOrder[];
}

export interface PaymentRecovery {
  id: string;
  razorpay_order_id: string;
  payment_id: string | null;
  status: string;
  customer: { name?: string; email?: string; phone?: string };
  amount_paise: number;
  error: string | null;
  updated_at: string;
}

export async function listPaymentRecoveries(): Promise<PaymentRecovery[]> {
  return (await convex.query(api.orders.listPaymentRecoveries, {})) as PaymentRecovery[];
}

export async function updateOrderStatus(id: string, status: string): Promise<boolean> {
  return await convex.mutation(api.orders.updateStatus, { id: id as Id<"orders">, status });
}

export async function updateOrderTracking(
  id: string,
  payload: { carrier?: string | null; trackingNumber: string; trackingUrl?: string | null },
): Promise<AdminOrder | null> {
  return (await convex.mutation(api.orders.updateTracking, {
    id: id as Id<"orders">,
    ...payload,
  })) as AdminOrder | null;
}

export interface AdminCustomer {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  total_orders: number | null;
  total_spent: number | null;
  created_at: string | null;
}

export async function listAllCustomers(limit = 200): Promise<AdminCustomer[]> {
  return (await convex.query(api.users.listCustomers, { limit })) as AdminCustomer[];
}

export interface AdminReview {
  id: string;
  product_id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  media_urls: string[] | null;
  status: string;
  admin_note: string | null;
  created_at: string | null;
}

export async function listAllReviews(limit = 200): Promise<AdminReview[]> {
  return (await convex.query(api.reviews.listAll, { limit })) as AdminReview[];
}

export async function createAdminReview(input: {
  productId: string;
  rating: number;
  customerName?: string | null;
  customerEmail?: string | null;
  title?: string | null;
  body?: string | null;
  status?: "pending" | "published" | "hidden";
}): Promise<AdminReview | null> {
  return (await convex.mutation(api.reviews.createAdmin, input)) as AdminReview | null;
}

export async function updateReviewStatus(
  id: string,
  status: "pending" | "published" | "hidden",
  adminNote?: string | null,
): Promise<boolean> {
  return await convex.mutation(api.reviews.updateStatus, {
    id,
    status,
    adminNote: adminNote ?? null,
  });
}
