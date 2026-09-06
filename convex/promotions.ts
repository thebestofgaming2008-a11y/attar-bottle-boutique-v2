import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";
import { isBundle } from "./bundles";
import {
  promotionConfig,
  emptyPromotions,
  discountType,
  discountPaise,
  validateDiscount,
  normalizeCoupon,
} from "./promotionModel";
import type { Infer } from "convex/values";
import type { Id } from "./_generated/dataModel";

const KEY = "storefront_promotions_v1";
type Ctx = QueryCtx | MutationCtx;
export async function readPromotions(ctx: Ctx): Promise<Infer<typeof promotionConfig>> {
  const row = await ctx.db
    .query("store_settings")
    .withIndex("by_key", (q) => q.eq("key", KEY))
    .unique();
  return row?.value?.published ?? emptyPromotions;
}
export const publicConfig = query({ args: {}, returns: promotionConfig, handler: readPromotions });
export const adminConfig = query({
  args: {},
  returns: v.object({ draft: promotionConfig, published: promotionConfig }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("store_settings")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    return row?.value ?? { draft: emptyPromotions, published: emptyPromotions };
  },
});
export const saveConfig = mutation({
  args: {
    config: promotionConfig,
    publish: v.boolean(),
    section: v.optional(v.union(v.literal("bundles"), v.literal("announcement"))),
  },
  returns: v.null(),
  handler: async (ctx, { config: input, publish, section }) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("store_settings")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    const currentDraft: Infer<typeof promotionConfig> = row?.value?.draft ?? emptyPromotions;
    const currentLive: Infer<typeof promotionConfig> = row?.value?.published ?? emptyPromotions;
    // Scope both draft saves and publication. An unrelated unfinished draft must
    // never be published (or overwritten) from another editor.
    const sectionFields =
      section === "announcement"
        ? { banner_active: input.banner_active, banner_messages: input.banner_messages }
        : section === "bundles"
          ? { active: input.active, tiers: input.tiers, product_ids: input.product_ids }
          : input;
    const config = { ...currentDraft, ...sectionFields };
    if (
      config.tiers.length > 8 ||
      config.product_ids.length > 100 ||
      config.banner_messages.length > 6
    )
      throw new Error("Use at most eight tiers, 100 eligible products and six banner messages.");
    const tiers = [...config.tiers].sort((a, b) => a.quantity - b.quantity);
    for (const tier of section === "announcement" ? [] : tiers) {
      if (!Number.isInteger(tier.quantity) || tier.quantity < 2 || tier.quantity > 99)
        throw new Error("Tier quantity must be a whole number from 2 to 99.");
      validateDiscount(tier.type, tier.value);
    }
    if (section !== "announcement" && new Set(tiers.map((t) => t.quantity)).size !== tiers.length)
      throw new Error("Each tier needs a different quantity.");
    if (section !== "announcement" && publish && config.active && !tiers.length)
      throw new Error("Add a quantity tier before enabling bundle savings.");
    for (const id of section === "announcement" ? [] : config.product_ids) {
      const p = await ctx.db.get(id);
      if (!p || isBundle(p))
        throw new Error("Mix-and-match eligibility must use individual attars, not fixed packs.");
    }
    const messages = config.banner_messages
      .map((s) => s.replace(/[<>]/g, "").trim())
      .filter(Boolean);
    if (messages.some((m) => m.length > 160))
      throw new Error("Keep each banner message under 160 characters.");
    if (section !== "bundles" && publish && config.banner_active && !messages.length)
      throw new Error("Add a banner message first.");
    const clean = {
      ...config,
      tiers,
      banner_messages: messages,
      product_ids: [...new Set(config.product_ids)],
    };
    const publishedFields =
      section === "announcement"
        ? { banner_active: clean.banner_active, banner_messages: clean.banner_messages }
        : section === "bundles"
          ? { active: clean.active, tiers: clean.tiers, product_ids: clean.product_ids }
          : clean;
    const value = {
      draft: clean,
      published: publish ? { ...currentLive, ...publishedFields } : currentLive,
    };
    if (row) await ctx.db.patch(row._id, { value, updated_at: nowIso() });
    else await ctx.db.insert("store_settings", { key: KEY, value, updated_at: nowIso() });
    await writeAuditLog(ctx, {
      action: publish ? "promotions.publish" : "promotions.draft",
      entityType: "promotions",
      summary: section ?? "Quantity offers and announcement banner",
    });
    return null;
  },
});

export async function pricePromotions(
  ctx: Ctx,
  lines: Array<{ productId: string; qty: number }>,
  code = "",
) {
  const config = await readPromotions(ctx);
  let subtotal = 0,
    eligibleSubtotal = 0,
    eligibleQuantity = 0;
  for (const line of lines) {
    const id = ctx.db.normalizeId("products", line.productId);
    const product = id
      ? await ctx.db.get(id)
      : await ctx.db
          .query("products")
          .withIndex("by_slug", (q) => q.eq("slug", line.productId))
          .first();
    if (!product || product.is_active === false)
      throw new Error("A product in your cart is no longer available.");
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99)
      throw new Error("Invalid quantity.");
    const unit = Math.round(
      Number(product.sale_price_inr ?? product.price_inr ?? product.price) * 100,
    );
    if (!Number.isSafeInteger(unit) || unit < 0) throw new Error("Invalid product price.");
    subtotal += unit * line.qty;
    if (
      !isBundle(product) &&
      (!config.product_ids.length || config.product_ids.includes(product._id))
    ) {
      eligibleQuantity += line.qty;
      eligibleSubtotal += unit * line.qty;
    }
  }
  let discount = 0,
    label = "",
    couponId: Id<"discounts"> | undefined,
    appliedCode: string | undefined;
  if (config.active)
    for (const tier of config.tiers) {
      const candidate =
        tier.quantity <= eligibleQuantity
          ? discountPaise(tier.type, tier.value, eligibleSubtotal)
          : 0;
      if (candidate > discount) {
        discount = candidate;
        label = `Mix & match: ${tier.quantity}+ attars`;
      }
    }
  const coupon = normalizeCoupon(code);
  let couponMessage = "";
  if (coupon) {
    if (!/^[A-Z0-9_-]{2,32}$/.test(coupon)) throw new Error("Enter a valid coupon code.");
    const row = await ctx.db
      .query("discounts")
      .withIndex("by_code", (q) => q.eq("code", coupon))
      .unique();
    const now = Date.now();
    if (
      !row ||
      row.scope_type !== "storefront-v1" ||
      !row.active ||
      (row.starts_at && Date.parse(row.starts_at) > now) ||
      (row.ends_at && Date.parse(row.ends_at) <= now)
    )
      throw new Error("This coupon is unavailable or expired.");
    if (subtotal < Math.round(Number(row.minimum_subtotal_inr ?? 0) * 100))
      throw new Error(`This coupon requires a subtotal of ₹${row.minimum_subtotal_inr}.`);
    const candidate = discountPaise(row.type, row.value, subtotal);
    if (candidate > discount) {
      discount = candidate;
      label = `Coupon ${coupon}`;
      couponId = row._id;
      appliedCode = coupon;
      couponMessage = "Coupon applied.";
    } else couponMessage = "Your automatic bundle offer already gives you equal or better savings.";
  }
  return {
    snapshot: {
      subtotal_paise: subtotal,
      discount_paise: discount,
      label,
      ...(couponId ? { coupon_id: couponId, coupon_code: appliedCode } : {}),
    },
    total: (subtotal - discount) / 100,
    discount: discount / 100,
    subtotal: subtotal / 100,
    eligibleQuantity,
    eligibleSubtotal: eligibleSubtotal / 100,
    couponMessage,
  };
}
export const preview = query({
  args: {
    cart: v.array(v.object({ productId: v.string(), qty: v.number() })),
    coupon: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.cart.length > 50) return null;
    try {
      return { ...(await pricePromotions(ctx, args.cart, args.coupon)), error: "" };
    } catch (error) {
      try {
        return {
          ...(await pricePromotions(ctx, args.cart)),
          error: error instanceof Error ? error.message : "Could not apply coupon.",
        };
      } catch {
        return null;
      }
    }
  },
});
export const listCoupons = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("discounts")
      .withIndex("by_scope", (q) => q.eq("scope_type", "storefront-v1"))
      .take(200);
    return rows.map(
      ({ _id, code, type, value, active, ends_at, minimum_subtotal_inr, used_count, label }) => ({
        id: _id,
        code,
        type,
        value,
        active,
        ends_at: ends_at ?? "",
        minimum_subtotal_inr: minimum_subtotal_inr ?? 0,
        used_count,
        label: label ?? "",
      }),
    );
  },
});
export const saveCoupon = mutation({
  args: {
    id: v.optional(v.id("discounts")),
    code: v.string(),
    label: v.string(),
    type: discountType,
    value: v.number(),
    active: v.boolean(),
    minimum_subtotal_inr: v.number(),
    ends_at: v.string(),
  },
  returns: v.id("discounts"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const code = normalizeCoupon(args.code);
    if (!/^[A-Z0-9_-]{2,32}$/.test(code))
      throw new Error("Use 2–32 letters, numbers, hyphens or underscores for the code.");
    validateDiscount(args.type, args.value);
    if (!Number.isFinite(args.minimum_subtotal_inr) || args.minimum_subtotal_inr < 0)
      throw new Error("Minimum spend must be zero or more.");
    if (args.ends_at && !Number.isFinite(Date.parse(args.ends_at)))
      throw new Error("Choose a valid expiry date.");
    if (args.active && args.ends_at && Date.parse(args.ends_at) <= Date.now())
      throw new Error("Expiry must be in the future before publishing.");
    const existing = await ctx.db
      .query("discounts")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (existing && existing._id !== args.id) throw new Error("That coupon code already exists.");
    const current = args.id ? await ctx.db.get(args.id) : null;
    if (args.id && (!current || current.scope_type !== "storefront-v1"))
      throw new Error("Coupon not found.");
    if (current && current.code !== code)
      throw new Error(
        "Create a new coupon to change its code; attribution is preserved for existing orders.",
      );
    const { id: _id, ...values } = args;
    const payload = {
      ...values,
      code,
      label: args.label.trim().slice(0, 100),
      updated_at: nowIso(),
    };
    let id = args.id;
    if (id) await ctx.db.patch(id, payload);
    else {
      const rows = await ctx.db
        .query("discounts")
        .withIndex("by_scope", (q) => q.eq("scope_type", "storefront-v1"))
        .take(200);
      if (rows.length >= 200) throw new Error("Maximum 200 coupons. Reuse an existing coupon.");
      id = await ctx.db.insert("discounts", {
        ...payload,
        scope_type: "storefront-v1",
        used_count: 0,
        created_at: nowIso(),
      });
    }
    await writeAuditLog(ctx, {
      action: args.active ? "coupon.publish" : "coupon.draft",
      entityType: "discount",
      entityId: id,
      summary: code,
    });
    return id;
  },
});
