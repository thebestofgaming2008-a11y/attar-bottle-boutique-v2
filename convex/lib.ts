import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";

export function nowIso() {
  return new Date().toISOString();
}

export function adminEmail() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL is not configured in Convex environment.");
  return email.trim().toLowerCase();
}

export function adminEmails() {
  const configured = [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS].filter(Boolean).join(",");
  const emails = configured
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!emails.length) throw new Error("ADMIN_EMAIL is not configured in Convex environment.");
  return new Set(emails);
}

export function isAdminEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && adminEmails().has(normalized));
}

export async function requireIdentity(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
) {
  const identity = await ctx.auth.getUserIdentity();
  const userId = await getAuthUserId(ctx);
  if (!identity || !userId) throw new Error("Authentication required.");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Authenticated user not found.");
  return { identity, userId, user };
}

export async function requireAdmin(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
) {
  const auth = await requireIdentity(ctx);
  const email = (auth.user as any).email?.trim().toLowerCase();
  if (!isAdminEmail(email)) throw new Error("Admin access required.");
  return auth;
}

export async function writeAuditLog(
  ctx: GenericMutationCtx<DataModel>,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    summary?: string | null;
    metadata?: unknown;
  },
) {
  const identity = await ctx.auth.getUserIdentity().catch(() => null);
  const userId = await getAuthUserId(ctx).catch(() => null);
  await ctx.db.insert("audit_logs", {
    actor_user_id: userId ? String(userId) : null,
    actor_email: identity?.email?.trim().toLowerCase() ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    summary: input.summary ?? null,
    metadata: input.metadata ?? null,
    created_at: nowIso(),
  });
}

export function publicProduct(doc: Record<string, any>): Record<string, any> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...normalizeBookCategory(rest) };
}

export function publicProductCard(doc: Record<string, any>): Record<string, any> {
  const product = publicProduct(doc);
  const rawTags = Array.isArray(product.tags) ? product.tags : [];
  const subjectLabelSet = new Set(Object.values(BOOK_SUBJECT_LABELS));
  const tags = [
    ...rawTags.filter((tag) => subjectLabelSet.has(tag)),
    ...rawTags.filter((tag) => !subjectLabelSet.has(tag)),
  ].slice(0, 16);

  return {
    id: product.id,
    name: product.name ?? null,
    slug: product.slug ?? null,
    product_type: product.product_type ?? null,
    mood: product.mood ?? null,
    scent_profile: product.scent_profile ?? null,
    hook: product.hook ?? product.short_description ?? null,
    key_notes: Array.isArray(product.key_notes) ? product.key_notes.slice(0, 12) : [],
    volume_label: product.volume_label ?? null,
    sort_order: product.sort_order ?? null,
    author: product.author ?? null,
    price: product.price ?? product.price_inr ?? 0,
    price_inr: product.price_inr ?? product.price ?? 0,
    sale_price: product.sale_price ?? null,
    sale_price_inr: product.sale_price_inr ?? null,
    stock_quantity: product.stock_quantity ?? 0,
    category: product.category ?? null,
    category_id: product.category_id ?? null,
    tags,
    cover_image_url: product.cover_image_url ?? null,
    card_image_url: product.card_image_url ?? null,
    images: Array.isArray(product.images) ? product.images.slice(0, 8) : [],
    og_image_url: product.og_image_url ?? null,
    color_options: Array.isArray(product.color_options) ? product.color_options.slice(0, 30) : [],
    size_options: Array.isArray(product.size_options) ? product.size_options.slice(0, 30) : [],
    option_types: Array.isArray(product.option_types) ? product.option_types.slice(0, 3) : [],
    badge: product.badge ?? null,
    is_active: product.is_active ?? true,
    is_featured: product.is_featured ?? false,
    show_in_category_section: product.show_in_category_section ?? false,
    is_new_arrival: product.is_new_arrival ?? false,
    is_bestseller: product.is_bestseller ?? false,
    is_on_sale: product.is_on_sale ?? false,
    in_stock: product.in_stock ?? true,
  };
}

export const BOOK_SUBJECT_KEYS = [
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
] as const;

const BOOK_SUBJECTS = new Set<string>(BOOK_SUBJECT_KEYS);
const NON_BOOK_TOP_LEVEL_CATEGORIES = new Set(["clothing", "women", "children", "essentials"]);
export const BOOK_SUBJECT_LABELS: Record<string, string> = {
  aqeedah: "Aqeedah",
  arabic: "Arabic",
  fiqh: "Fiqh",
  hadith: "Hadith",
  purification: "Purification",
  seerah: "Seerah",
  tafsir: "Tafsir",
  urdu: "Urdu",
  "character-development": "Character Development",
  "dua-adhkar": "Du'a & Adhkar",
  "womens-issues": "Women's Issues",
  "islamic-history": "Islamic History",
  "family-marriage": "Family & Marriage",
};

function normalizeBookCategory(product: Record<string, any>) {
  const category = String(product.category ?? "").toLowerCase();
  const categoryId = String(product.category_id ?? "").toLowerCase();
  if (NON_BOOK_TOP_LEVEL_CATEGORIES.has(categoryId)) {
    return {
      ...product,
      category: categoryId === "essentials" ? "children" : categoryId,
    };
  }
  const subject = BOOK_SUBJECTS.has(category)
    ? category
    : BOOK_SUBJECTS.has(categoryId)
      ? categoryId
      : "";
  const looksLikeBook = Boolean(
    product.author || product.publisher || product.isbn || product.pages || product.binding,
  );
  if (!subject && !(category === "books" || looksLikeBook)) return product;
  const tags = Array.isArray(product.tags) ? product.tags : [];
  const subjectLabel = subject ? BOOK_SUBJECT_LABELS[subject] : null;
  return {
    ...product,
    category: "books",
    category_id: subject || product.category_id || "books",
    tags: subjectLabel ? Array.from(new Set([...tags, subjectLabel])) : tags,
  };
}

export function publicProfile(doc: Record<string, any>): Record<string, any> {
  const { _id, _creationTime, userId, ...rest } = doc;
  return { id: _id, user_id: userId, ...rest };
}

export function publicAddress(doc: Record<string, any>): Record<string, any> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

export function publicOrder(doc: Record<string, any>): Record<string, any> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}
