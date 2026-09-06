import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const nullableString = v.optional(v.union(v.string(), v.null()));
export const reservedGiftValidator = v.object({
  campaign_id: v.string(),
  name: v.string(),
  quantity: v.number(),
  image: v.union(v.string(), v.null()),
  color: v.union(v.string(), v.null()),
  size: v.union(v.string(), v.null()),
});

export const reservedForCheckout = query({
  args: { order_id: v.string(), attempt_id: v.string() },
  returns: v.array(reservedGiftValidator),
  handler: async (ctx, args) => {
    if (!/^[a-f0-9-]{20,80}$/i.test(args.attempt_id) || args.order_id.length > 120) return [];
    const intent = await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q) => q.eq("razorpay_order_id", args.order_id))
      .first();
    if (!intent || intent.checkout_attempt_id !== args.attempt_id) return [];
    return intent.cart
      .filter((line) => line.isGift === true)
      .map((line) => ({
        campaign_id: String(line.giftCampaignId),
        name: String(line.name),
        quantity: Number(line.qty),
        image: line.image ?? null,
        color: line.selectedColor ?? null,
        size: line.selectedSize ?? null,
      }));
  },
});
const matchMode = v.union(v.literal("all"), v.literal("any"));
const scopeType = v.union(
  v.literal("all"),
  v.literal("collection"),
  v.literal("products"),
  v.literal("subtotal"),
);
const rewardFields = {
  reward_mode: v.optional(v.union(v.literal("fixed"), v.literal("choice"))),
  reward_scope: v.optional(v.union(v.literal("all"), v.literal("products"))),
  reward_product_ids: v.optional(v.array(v.id("products"))),
};
export const giftSelectionsValidator = v.array(
  v.object({
    campaign_id: v.string(),
    product_id: v.string(),
    quantity: v.number(),
    color: v.optional(v.union(v.string(), v.null())),
    size: v.optional(v.union(v.string(), v.null())),
  }),
);
export type GiftSelection = {
  campaign_id: string;
  product_id: string;
  quantity: number;
  color?: string | null;
  size?: string | null;
};
const giftDisplay = v.object({
  id: v.id("products"),
  name: v.string(),
  slug: v.union(v.string(), v.null()),
  image: v.union(v.string(), v.null()),
  quantity: v.number(),
  color: v.union(v.string(), v.null()),
  size: v.union(v.string(), v.null()),
});

const requirementInputValidator = v.object({
  label: v.string(),
  scope_type: scopeType,
  collection_slugs: v.array(v.string()),
  category_ids: v.optional(v.array(v.id("categories"))),
  product_ids: v.array(v.id("products")),
  required_quantity: v.number(),
});

const requirementValidator = v.object({
  label: v.string(),
  scope_type: scopeType,
  collection_slugs: v.array(v.string()),
  category_ids: v.array(v.id("categories")),
  product_ids: v.array(v.id("products")),
  required_quantity: v.number(),
});

const campaignValidator = v.object({
  id: v.id("gift_campaigns"),
  name: v.string(),
  active: v.boolean(),
  match_mode: matchMode,
  requirements: v.array(requirementValidator),
  gift_product_id: v.optional(v.id("products")),
  ...rewardFields,
  gift_quantity: v.number(),
  gift_color: v.union(v.string(), v.null()),
  gift_size: v.union(v.string(), v.null()),
  starts_at: v.union(v.string(), v.null()),
  ends_at: v.union(v.string(), v.null()),
  sort_order: v.number(),
  priority: v.optional(v.number()),
  combines_with_other_gifts: v.optional(v.boolean()),
  repeatable: v.optional(v.boolean()),
  max_awards_per_order: v.optional(v.number()),
  allow_discount_codes: v.optional(v.boolean()),
  archived_at: v.union(v.string(), v.null()),
  created_at: v.string(),
  updated_at: v.string(),
});

const evaluatedCampaignValidator = v.object({
  reward_mode: v.string(),
  selection_required: v.boolean(),
  rewards: v.array(giftDisplay),
  choices: v.array(
    v.object({
      id: v.id("products"),
      name: v.string(),
      image: v.union(v.string(), v.null()),
      available: v.number(),
      colors: v.array(v.string()),
      sizes: v.array(v.string()),
    }),
  ),
  id: v.id("gift_campaigns"),
  name: v.string(),
  match_mode: matchMode,
  earned: v.boolean(),
  eligible: v.boolean(),
  progress: v.number(),
  award_count: v.number(),
  gift_available: v.boolean(),
  blocked_reason: v.union(v.string(), v.null()),
  requirements: v.array(
    v.object({
      label: v.string(),
      scope_type: scopeType,
      collection_slugs: v.array(v.string()),
      product_ids: v.array(v.id("products")),
      required_quantity: v.number(),
      current_quantity: v.number(),
      complete: v.boolean(),
    }),
  ),
  gift: v.object({
    id: v.id("products"),
    name: v.string(),
    slug: v.union(v.string(), v.null()),
    image: v.union(v.string(), v.null()),
    quantity: v.number(),
    color: v.union(v.string(), v.null()),
    size: v.union(v.string(), v.null()),
  }),
});

const campaignInput = {
  name: v.string(),
  active: v.boolean(),
  match_mode: matchMode,
  requirements: v.array(requirementInputValidator),
  gift_product_id: v.optional(v.id("products")),
  ...rewardFields,
  gift_quantity: v.number(),
  gift_color: nullableString,
  gift_size: nullableString,
  starts_at: nullableString,
  ends_at: nullableString,
  sort_order: v.number(),
  priority: v.number(),
  combines_with_other_gifts: v.boolean(),
  repeatable: v.boolean(),
  max_awards_per_order: v.number(),
  allow_discount_codes: v.boolean(),
};

function cleanText(value: string | null | undefined, max = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 160) {
  return cleanText(value, max) || null;
}

function normalize(value: string | null | undefined) {
  return cleanText(value, 100)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicCampaign(campaign: Doc<"gift_campaigns">) {
  return {
    id: campaign._id,
    name: campaign.name,
    active: campaign.active,
    match_mode: campaign.match_mode,
    requirements: campaign.requirements.map((requirement) => ({
      ...requirement,
      category_ids: requirement.category_ids ?? [],
    })),
    ...(campaign.gift_product_id ? { gift_product_id: campaign.gift_product_id } : {}),
    reward_mode: campaign.reward_mode ?? "fixed",
    reward_scope: campaign.reward_scope ?? "products",
    reward_product_ids: campaign.reward_product_ids ?? [],
    gift_quantity: campaign.gift_quantity,
    gift_color: campaign.gift_color ?? null,
    gift_size: campaign.gift_size ?? null,
    starts_at: campaign.starts_at ?? null,
    ends_at: campaign.ends_at ?? null,
    sort_order: campaign.sort_order,
    priority: campaign.priority ?? campaign.sort_order,
    combines_with_other_gifts: campaign.combines_with_other_gifts ?? false,
    repeatable: campaign.repeatable ?? false,
    max_awards_per_order: Math.max(1, Math.floor(campaign.max_awards_per_order ?? 1)),
    allow_discount_codes: campaign.allow_discount_codes ?? true,
    archived_at: campaign.archived_at ?? null,
    created_at: campaign.created_at,
    updated_at: campaign.updated_at,
  };
}

function campaignIsLive(campaign: Doc<"gift_campaigns">, now: number) {
  if (!campaign.active || campaign.archived_at) return false;
  const startsAt = campaign.starts_at ? Date.parse(campaign.starts_at) : null;
  const endsAt = campaign.ends_at ? Date.parse(campaign.ends_at) : null;
  return !(startsAt !== null && startsAt > now) && !(endsAt !== null && endsAt <= now);
}

async function activeGiftCampaigns(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("gift_campaigns")
    .withIndex("by_active", (lookup) => lookup.eq("active", true))
    .take(50);
}

function nextCampaignBoundary(campaigns: Doc<"gift_campaigns">[], now: number) {
  let next: number | null = null;
  for (const campaign of campaigns) {
    if (campaign.archived_at) continue;
    for (const value of [campaign.starts_at, campaign.ends_at]) {
      const timestamp = value ? Date.parse(value) : Number.NaN;
      if (!Number.isFinite(timestamp) || timestamp <= now) continue;
      next = next === null ? timestamp : Math.min(next, timestamp);
    }
  }
  return next;
}

function validateDateRange(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  const start = startsAt ? Date.parse(startsAt) : null;
  const end = endsAt ? Date.parse(endsAt) : null;
  if (start !== null && !Number.isFinite(start)) throw new ConvexError("Start date is invalid.");
  if (end !== null && !Number.isFinite(end)) throw new ConvexError("End date is invalid.");
  if (start !== null && end !== null && end <= start)
    throw new ConvexError("End date must be after the start date.");
}

async function validatedValues(
  ctx: MutationCtx,
  args: Omit<Doc<"gift_campaigns">, "_id" | "_creationTime" | "created_at" | "updated_at">,
) {
  const priority = args.priority ?? args.sort_order;
  const maxAwardsPerOrder = args.max_awards_per_order ?? 1;
  const name = cleanText(args.name, 100);
  if (!name) throw new ConvexError("Add a campaign name.");
  if (!Number.isInteger(args.gift_quantity) || args.gift_quantity < 1 || args.gift_quantity > 10)
    throw new ConvexError("Gift quantity must be between 1 and 10.");
  if (!Number.isFinite(args.sort_order)) throw new ConvexError("Sort order is invalid.");
  if (!Number.isInteger(priority) || priority < 0 || priority > 10_000)
    throw new ConvexError("Priority must be between 0 and 10,000.");
  if (!Number.isInteger(maxAwardsPerOrder) || maxAwardsPerOrder < 1 || maxAwardsPerOrder > 10)
    throw new ConvexError("Maximum awards per order must be between 1 and 10.");
  if (!args.requirements.length || args.requirements.length > 6)
    throw new ConvexError("Add between 1 and 6 requirements.");
  validateDateRange(args.starts_at, args.ends_at);

  const choiceMode = args.reward_mode === "choice";
  const rewardIds = Array.from(new Set(args.reward_product_ids ?? []));
  if (rewardIds.length > 50) throw new ConvexError("Select at most 50 reward products.");
  if (choiceMode && args.reward_scope !== "all" && !rewardIds.length)
    throw new ConvexError("Choose the products customers may receive free.");
  const pool = choiceMode
    ? await rewardProducts(ctx, { ...args, reward_product_ids: rewardIds })
    : [];
  const gift = args.gift_product_id ? await ctx.db.get(args.gift_product_id) : null;
  if (!choiceMode && !gift) throw new ConvexError("Choose a valid gift product.");
  if (
    choiceMode &&
    args.active &&
    pool.reduce(
      (sum, p) => sum + (p.in_stock === false ? 0 : Math.max(0, p.stock_quantity ?? 0)),
      0,
    ) < args.gift_quantity
  )
    throw new ConvexError("Add enough active reward stock before publishing this offer.");
  const giftColor = cleanNullable(args.gift_color, 60);
  const giftSize = cleanNullable(args.gift_size, 60);
  if (
    !choiceMode &&
    gift &&
    args.active &&
    (gift.is_active === false ||
      gift.in_stock === false ||
      Number(gift.stock_quantity ?? 0) < args.gift_quantity)
  )
    throw new ConvexError(
      "Activate the gift product and add enough stock before publishing this offer.",
    );
  if (args.gift_quantity * (args.repeatable ? maxAwardsPerOrder : 1) > 99)
    throw new ConvexError("An offer can award at most 99 gift items per order.");
  if (args.active && args.ends_at && Date.parse(args.ends_at) <= Date.now())
    throw new ConvexError("Choose a future end date before publishing this offer.");
  if (
    !choiceMode &&
    gift &&
    giftColor &&
    !(gift.color_options ?? []).some((option) => option.toLowerCase() === giftColor.toLowerCase())
  )
    throw new ConvexError("Choose a colour available on the gift product.");
  if (
    !choiceMode &&
    gift &&
    giftSize &&
    !(gift.size_options ?? []).some((option) => option.toLowerCase() === giftSize.toLowerCase())
  )
    throw new ConvexError("Choose a size available on the gift product.");

  const requirements = [];
  for (const requirement of args.requirements) {
    const quantity = requirement.required_quantity;
    const maximum = requirement.scope_type === "subtotal" ? 10_000_000 : 99;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > maximum)
      throw new ConvexError(
        requirement.scope_type === "subtotal"
          ? "Minimum spend must be between INR 1 and INR 10,000,000."
          : "Each required quantity must be between 1 and 99.",
      );
    let collections = Array.from(
      new Set(requirement.collection_slugs.map(normalize).filter(Boolean)),
    ).slice(0, 12);
    let categoryIds = Array.from(new Set(requirement.category_ids ?? [])).slice(0, 12);
    const productIds = Array.from(new Set(requirement.product_ids)).slice(0, 50);
    if (requirement.scope_type === "collection") {
      if (!categoryIds.length && collections.length) {
        const resolved = [];
        for (const collection of collections) {
          const category = await ctx.db
            .query("categories")
            .withIndex("by_slug", (lookup) => lookup.eq("slug", collection))
            .unique();
          if (category) resolved.push(category._id);
        }
        categoryIds = resolved;
      }
      if (categoryIds.length) {
        const currentSlugs = [];
        for (const categoryId of categoryIds) {
          const category = await ctx.db.get(categoryId);
          if (!category) throw new ConvexError("A selected collection no longer exists.");
          currentSlugs.push(normalize(category.slug));
        }
        collections = Array.from(new Set(currentSlugs.filter(Boolean)));
      }
      if (!collections.length)
        throw new ConvexError("Choose a collection for every collection requirement.");
    }
    if (requirement.scope_type === "products" && !productIds.length)
      throw new ConvexError("Choose at least one product for every product requirement.");
    for (const productId of productIds) {
      if (!(await ctx.db.get(productId)))
        throw new ConvexError("A selected qualifying product no longer exists.");
    }
    requirements.push({
      label:
        cleanText(requirement.label, 100) ||
        (requirement.scope_type === "collection"
          ? "Selected collection"
          : requirement.scope_type === "products"
            ? "Selected products"
            : "Cart subtotal"),
      scope_type: requirement.scope_type,
      collection_slugs: requirement.scope_type === "collection" ? collections : [],
      category_ids: requirement.scope_type === "collection" ? categoryIds : [],
      product_ids: requirement.scope_type === "products" ? productIds : [],
      required_quantity: quantity,
    });
  }

  return {
    name,
    active: args.active,
    match_mode: args.match_mode,
    requirements,
    ...(args.gift_product_id ? { gift_product_id: args.gift_product_id } : {}),
    reward_mode: args.reward_mode ?? "fixed",
    reward_scope: args.reward_scope ?? "products",
    reward_product_ids: rewardIds,
    gift_quantity: args.gift_quantity,
    gift_color: giftColor,
    gift_size: giftSize,
    starts_at: cleanNullable(args.starts_at, 40),
    ends_at: cleanNullable(args.ends_at, 40),
    sort_order: Math.max(0, Math.floor(args.sort_order)),
    priority: Math.floor(priority),
    combines_with_other_gifts: args.combines_with_other_gifts ?? false,
    repeatable: args.repeatable ?? false,
    max_awards_per_order: Math.floor(maxAwardsPerOrder),
    allow_discount_codes: args.allow_discount_codes ?? true,
  };
}

type CartLine = { productId: string; qty: number };

async function rewardProducts(
  ctx: QueryCtx | MutationCtx,
  campaign: { reward_scope?: string; reward_product_ids?: Id<"products">[] },
) {
  const products =
    campaign.reward_scope === "all"
      ? await ctx.db
          .query("products")
          .withIndex("by_active", (q) => q.eq("is_active", true))
          .take(201)
      : await Promise.all(
          (campaign.reward_product_ids ?? []).slice(0, 50).map((id) => ctx.db.get(id)),
        );
  if (products.length > 200)
    throw new ConvexError("Choose specific reward products for catalogues over 200 products.");
  return products.filter((p): p is Doc<"products"> => Boolean(p && p.is_active !== false));
}

export async function evaluateGiftCampaigns(
  ctx: QueryCtx | MutationCtx,
  cart: CartLine[],
  evaluationTime = Date.now(),
  options: {
    hasDiscount?: boolean;
    campaigns?: Doc<"gift_campaigns">[];
    selections?: GiftSelection[];
    strict?: boolean;
  } = {},
) {
  const campaigns = options.campaigns ?? (await activeGiftCampaigns(ctx));
  const selections = options.selections ?? [];
  if (
    selections.length > 100 ||
    selections.some(
      (s) =>
        !Number.isInteger(s.quantity) ||
        s.quantity < 1 ||
        s.quantity > 99 ||
        s.campaign_id.length > 100 ||
        s.product_id.length > 100,
    )
  )
    throw new ConvexError("Invalid free gift selection.");
  if (
    cart.length > 50 ||
    cart.some((line) => !Number.isInteger(line.qty) || line.qty < 0 || line.qty > 99)
  )
    throw new ConvexError("Invalid cart for gift evaluation.");
  const liveCampaigns = campaigns
    .filter((campaign) => campaignIsLive(campaign, evaluationTime))
    .sort(
      (left, right) =>
        Number(right.priority ?? right.sort_order) - Number(left.priority ?? left.sort_order) ||
        left.sort_order - right.sort_order ||
        left._creationTime - right._creationTime,
    );
  if (!liveCampaigns.length) {
    if (options.strict && selections.length)
      throw new ConvexError(
        "Your selected gift offer has ended. Clear the unavailable gifts and review checkout.",
      );
    return [];
  }

  cart = await Promise.all(
    cart.map(async (line) => {
      if (ctx.db.normalizeId("products", line.productId)) return line;
      const product = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", line.productId))
        .first();
      return { ...line, productId: product ? String(product._id) : line.productId };
    }),
  );

  const productMap = new Map<string, Doc<"products">>();
  const purchasedQuantity = new Map<string, number>();
  for (const line of cart.slice(0, 100)) {
    const productId = ctx.db.normalizeId("products", cleanText(line.productId, 200));
    if (!productId) continue;
    const key = String(productId);
    purchasedQuantity.set(
      key,
      (purchasedQuantity.get(key) ?? 0) + Math.min(99, Math.max(0, Math.floor(line.qty))),
    );
    if (!productMap.has(key)) {
      const product = await ctx.db.get(productId);
      if (product && product.is_active !== false && product.in_stock !== false)
        productMap.set(key, product);
    }
  }
  const pools = new Map<string, Doc<"products">[]>();
  for (const campaign of liveCampaigns) {
    if (campaign.reward_mode === "choice") {
      const pool = await rewardProducts(ctx, campaign);
      pools.set(String(campaign._id), pool);
      for (const product of pool) productMap.set(String(product._id), product);
      continue;
    }
    if (!campaign.gift_product_id) continue;
    const key = String(campaign.gift_product_id);
    if (productMap.has(key)) continue;
    const product = await ctx.db.get(campaign.gift_product_id);
    if (product && product.is_active !== false) productMap.set(key, product);
  }

  const categoryIdBySlug = new Map<string, string>();
  const categoryIds = new Set(
    liveCampaigns.flatMap((campaign) =>
      campaign.requirements.flatMap((requirement) => (requirement.category_ids ?? []).map(String)),
    ),
  );
  for (const value of categoryIds) {
    const categoryId = ctx.db.normalizeId("categories", value);
    if (!categoryId) continue;
    const category = await ctx.db.get(categoryId);
    if (category) categoryIdBySlug.set(normalize(category.slug), String(category._id));
  }
  const cartSubtotal = cart.reduce((sum, line) => {
    const product = productMap.get(String(line.productId));
    if (!product) return sum;
    const unitPrice = Number(product.sale_price_inr ?? product.price_inr ?? product.price);
    return sum + (Number.isFinite(unitPrice) ? unitPrice * Math.max(0, Math.floor(line.qty)) : 0);
  }, 0);

  const preliminary = [];
  const selectableCampaignIds = new Set<string>();
  for (const campaign of liveCampaigns) {
    const giftProduct =
      campaign.reward_mode === "choice"
        ? pools.get(String(campaign._id))?.[0]
        : productMap.get(String(campaign.gift_product_id));
    if (!giftProduct || giftProduct.is_active === false) continue;
    // An edited/removed option must not silently turn into a different gift.
    if (
      campaign.reward_mode !== "choice" &&
      campaign.gift_color &&
      !(giftProduct.color_options ?? []).includes(campaign.gift_color)
    )
      continue;
    if (
      campaign.reward_mode !== "choice" &&
      campaign.gift_size &&
      !(giftProduct.size_options ?? []).includes(campaign.gift_size)
    )
      continue;
    const requirements = campaign.requirements.map((requirement) => {
      const productIds = new Set(requirement.product_ids.map(String));
      const collections = new Set(requirement.collection_slugs.map(normalize));
      const stableCategoryIds = new Set((requirement.category_ids ?? []).map(String));
      const currentQuantity =
        requirement.scope_type === "subtotal"
          ? Math.floor(cartSubtotal)
          : cart.reduce((sum, line) => {
              const product = productMap.get(String(line.productId));
              if (!product) return sum;
              const productCategory = normalize(product.category_id ?? product.category);
              const matches =
                requirement.scope_type === "all"
                  ? true
                  : requirement.scope_type === "products"
                    ? productIds.has(String(product._id))
                    : stableCategoryIds.has(String(product.category_id ?? "")) ||
                      collections.has(productCategory) ||
                      stableCategoryIds.has(categoryIdBySlug.get(productCategory) ?? "");
              return matches ? sum + Math.max(0, Math.floor(line.qty)) : sum;
            }, 0);
      return {
        ...requirement,
        current_quantity: currentQuantity,
        complete: currentQuantity >= requirement.required_quantity,
      };
    });
    const eligible =
      campaign.match_mode === "all"
        ? requirements.every((requirement) => requirement.complete)
        : requirements.some((requirement) => requirement.complete);
    const ratios = requirements.map((requirement) =>
      Math.min(1, requirement.current_quantity / requirement.required_quantity),
    );
    const progress = Math.round(
      100 *
        (campaign.match_mode === "all"
          ? ratios.reduce((sum, ratio) => sum + ratio, 0) / Math.max(1, ratios.length)
          : Math.max(0, ...ratios)),
    );
    const awardMultiples = requirements.map((requirement) =>
      Math.floor(requirement.current_quantity / requirement.required_quantity),
    );
    const possibleAwards = eligible
      ? campaign.match_mode === "all"
        ? Math.min(...awardMultiples)
        : Math.max(...awardMultiples)
      : 0;
    const awardCount = eligible
      ? campaign.repeatable
        ? Math.min(Math.max(1, Math.floor(campaign.max_awards_per_order ?? 1)), possibleAwards)
        : 1
      : 0;
    preliminary.push({
      campaign,
      giftProduct,
      eligible,
      progress,
      awardCount,
      requirements,
    });
    if (campaign.reward_mode === "choice") selectableCampaignIds.add(String(campaign._id));
  }

  const allocatedGiftStock = new Map<string, number>();
  if (options.strict && selections.some((s) => !selectableCampaignIds.has(s.campaign_id)))
    throw new ConvexError(
      "Your selected gift offer changed or is unavailable. Clear those selections and review checkout.",
    );
  const selectedCampaigns: Doc<"gift_campaigns">[] = [];
  return preliminary.map(
    ({ campaign, giftProduct, eligible, progress, awardCount, requirements }) => {
      const productId = String(giftProduct._id);
      const requestedGiftQuantity = campaign.gift_quantity * Math.max(1, awardCount);
      const choiceMode = campaign.reward_mode === "choice";
      const choices = (choiceMode ? (pools.get(String(campaign._id)) ?? []) : []).map((p) => ({
        id: p._id,
        name: p.name,
        image: p.cover_image_url ?? null,
        available:
          p.in_stock === false
            ? 0
            : Math.max(
                0,
                (p.stock_quantity ?? 0) -
                  (purchasedQuantity.get(String(p._id)) ?? 0) -
                  (allocatedGiftStock.get(String(p._id)) ?? 0),
              ),
        colors: p.color_options ?? [],
        sizes: p.size_options ?? [],
      }));
      const requested = selections.filter((s) => s.campaign_id === String(campaign._id));
      const quantities = new Map<string, number>();
      const rewards: Array<{
        id: Id<"products">;
        name: string;
        slug: string | null;
        image: string | null;
        quantity: number;
        color: string | null;
        size: string | null;
      }> = [];
      let selectionValid = true;
      if (choiceMode)
        for (const selection of requested) {
          const choice = choices.find((c) => String(c.id) === selection.product_id);
          if (!choice) {
            selectionValid = false;
            continue;
          }
          const p = productMap.get(selection.product_id)!;
          const color = selection.color ?? choice.colors[0] ?? null;
          const size = selection.size ?? choice.sizes[0] ?? null;
          if ((color && !choice.colors.includes(color)) || (size && !choice.sizes.includes(size)))
            selectionValid = false;
          quantities.set(
            selection.product_id,
            (quantities.get(selection.product_id) ?? 0) + selection.quantity,
          );
          rewards.push({
            id: p._id,
            name: p.name,
            slug: p.slug ?? null,
            image: p.cover_image_url ?? null,
            quantity: selection.quantity,
            color,
            size,
          });
        }
      if (
        choiceMode &&
        (rewards.reduce((sum, r) => sum + r.quantity, 0) !== requestedGiftQuantity ||
          choices.some((c) => (quantities.get(String(c.id)) ?? 0) > c.available))
      )
        selectionValid = false;
      const availableForGifts =
        Number(giftProduct.stock_quantity ?? 0) -
        (purchasedQuantity.get(productId) ?? 0) -
        (allocatedGiftStock.get(productId) ?? 0);
      const giftAvailable = choiceMode
        ? choices.reduce((sum, c) => sum + c.available, 0) >= requestedGiftQuantity
        : giftProduct.in_stock !== false && availableForGifts >= requestedGiftQuantity;
      const discountBlocked = options.hasDiscount && campaign.allow_discount_codes === false;
      const stackingBlocked =
        selectedCampaigns.length > 0 &&
        (!(campaign.combines_with_other_gifts ?? false) ||
          selectedCampaigns.some((selected) => !(selected.combines_with_other_gifts ?? false)));
      const selectable = eligible && giftAvailable && !discountBlocked && !stackingBlocked;
      const selectionRequired = Boolean(choiceMode && selectable && !selectionValid);
      if (options.strict && selectionRequired)
        throw new ConvexError(
          `Choose ${requestedGiftQuantity} available free items for "${campaign.name}" before paying.`,
        );
      if (options.strict && choiceMode && requested.length && !selectable)
        throw new ConvexError(
          `The offer "${campaign.name}" or its stock changed. Review your free gifts before paying.`,
        );
      const earned = selectable && (!choiceMode || selectionValid);
      if (earned) {
        if (choiceMode)
          for (const [id, qty] of quantities)
            allocatedGiftStock.set(id, (allocatedGiftStock.get(id) ?? 0) + qty);
        else
          allocatedGiftStock.set(
            productId,
            (allocatedGiftStock.get(productId) ?? 0) + requestedGiftQuantity,
          );
      }
      // Reserve offer priority even while its customer choice is incomplete.
      if (selectable) selectedCampaigns.push(campaign);
      const blockedReason = !eligible
        ? null
        : !giftAvailable
          ? "Gift stock is currently unavailable."
          : discountBlocked
            ? "This gift cannot be combined with the applied discount."
            : stackingBlocked
              ? "Another gift offer has already been applied."
              : selectionRequired
                ? `Choose ${requestedGiftQuantity} free items.`
                : null;
      const gift = {
        id: giftProduct._id,
        name: choiceMode ? "Your choice of free attars" : giftProduct.name,
        slug: giftProduct.slug ?? null,
        image: choiceMode ? null : (giftProduct.cover_image_url ?? null),
        quantity: requestedGiftQuantity,
        color: campaign.gift_color ?? (giftProduct.color_options ?? [])[0] ?? null,
        size: campaign.gift_size ?? (giftProduct.size_options ?? [])[0] ?? null,
      };
      return {
        ...publicCampaign(campaign),
        earned,
        eligible,
        progress,
        award_count: awardCount,
        gift_available: giftAvailable,
        blocked_reason: blockedReason,
        requirements,
        reward_mode: choiceMode ? "choice" : "fixed",
        selection_required: selectionRequired,
        choices,
        rewards: earned ? (choiceMode ? rewards : [gift]) : [],
        gift,
      };
    },
  );
}

function storefrontEvaluations(results: Awaited<ReturnType<typeof evaluateGiftCampaigns>>) {
  return results
    .sort(
      (left, right) =>
        Number(right.earned) - Number(left.earned) ||
        right.progress - left.progress ||
        right.priority - left.priority,
    )
    .filter((result, index) => result.earned || result.selection_required || index < 6)
    .map((result) => ({
      reward_mode: result.reward_mode,
      selection_required: result.selection_required,
      choices: result.choices,
      rewards: result.rewards,
      id: result.id,
      name: result.name,
      match_mode: result.match_mode,
      earned: result.earned,
      eligible: result.eligible,
      progress: result.progress,
      award_count: result.award_count,
      gift_available: result.gift_available,
      blocked_reason: result.blocked_reason,
      requirements: result.requirements.map((requirement) => ({
        label: requirement.label,
        scope_type: requirement.scope_type,
        collection_slugs: requirement.collection_slugs,
        product_ids: requirement.product_ids,
        required_quantity: requirement.required_quantity,
        current_quantity: requirement.current_quantity,
        complete: requirement.complete,
      })),
      gift: result.gift,
    }));
}

export const listAdmin = query({
  args: {},
  returns: v.array(campaignValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [current, archived] = await Promise.all([
      ctx.db
        .query("gift_campaigns")
        .withIndex("by_archived_at", (q) => q.eq("archived_at", null))
        .take(100),
      ctx.db
        .query("gift_campaigns")
        .withIndex("by_archived_at", (q) => q.gt("archived_at", null))
        .order("desc")
        .take(30),
    ]);
    const rows = [...current, ...archived];
    return rows
      .map(publicCampaign)
      .sort(
        (left, right) =>
          Number(Boolean(left.archived_at)) - Number(Boolean(right.archived_at)) ||
          right.priority - left.priority ||
          left.sort_order - right.sort_order,
      );
  },
});

export const testCampaign = query({
  args: {
    id: v.id("gift_campaigns"),
    cart: v.array(v.object({ product_id: v.id("products"), quantity: v.number() })),
  },
  returns: v.union(evaluatedCampaignValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return null;
    const results = await evaluateGiftCampaigns(
      ctx,
      args.cart.slice(0, 50).map((line) => ({
        productId: String(line.product_id),
        qty: Math.min(99, Math.max(0, Math.floor(line.quantity))),
      })),
      0,
      {
        hasDiscount: false,
        campaigns: [
          {
            ...campaign,
            active: true,
            starts_at: null,
            ends_at: null,
            archived_at: null,
          },
        ],
      },
    );
    return storefrontEvaluations(results)[0] ?? null;
  },
});

export const evaluateCart = query({
  args: {
    selections: v.optional(giftSelectionsValidator),
    require_complete: v.optional(v.boolean()),
    cart: v.array(v.object({ product_id: v.string(), quantity: v.number() })),
    evaluation_time: v.number(),
    has_discount: v.optional(v.boolean()),
  },
  returns: v.array(evaluatedCampaignValidator),
  handler: async (ctx, args) => {
    const results = await evaluateGiftCampaigns(
      ctx,
      args.cart.slice(0, 100).map((line) => ({
        productId: cleanText(line.product_id, 200),
        qty: Math.min(99, Math.max(0, Math.floor(line.quantity))),
      })),
      args.evaluation_time,
      {
        hasDiscount: args.has_discount ?? false,
        selections: args.selections,
        strict: args.require_complete,
      },
    );
    return storefrontEvaluations(results);
  },
});

export const evaluateStorefront = query({
  args: {
    selections: v.optional(giftSelectionsValidator),
    cart: v.array(v.object({ product_id: v.string(), quantity: v.number() })),
    evaluation_time: v.number(),
    has_discount: v.optional(v.boolean()),
  },
  returns: v.object({
    offers: v.array(evaluatedCampaignValidator),
    next_change_at: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Preview time is client-driven so scheduled boundaries can re-evaluate reactively.
    // Checkout awards always use the server clock inside the reservation mutation.
    const evaluationTime = args.evaluation_time;
    if (!Number.isFinite(evaluationTime)) throw new ConvexError("Invalid evaluation time.");
    const campaigns = await activeGiftCampaigns(ctx);
    const results = await evaluateGiftCampaigns(
      ctx,
      args.cart.slice(0, 100).map((line) => ({
        productId: cleanText(line.product_id, 200),
        qty: Math.min(99, Math.max(0, Math.floor(line.quantity))),
      })),
      evaluationTime,
      { hasDiscount: args.has_discount ?? false, campaigns, selections: args.selections },
    );
    return {
      offers: storefrontEvaluations(results),
      next_change_at: nextCampaignBoundary(campaigns, evaluationTime),
    };
  },
});

export const save = mutation({
  args: { id: v.optional(v.id("gift_campaigns")), ...campaignInput },
  returns: campaignValidator,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const values = await validatedValues(ctx, args);
    const timestamp = nowIso();
    let id: Id<"gift_campaigns">;
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new ConvexError("Gift campaign not found.");
      if (existing.archived_at)
        throw new ConvexError("Archived campaigns cannot be edited. Duplicate it instead.");
      if (values.active && !existing.active && (await activeGiftCampaigns(ctx)).length >= 50)
        throw new ConvexError("Pause another offer before publishing more than 50 offers.");
      await ctx.db.patch(args.id, { ...values, updated_at: timestamp });
      id = args.id;
    } else {
      const existingCampaigns = await ctx.db
        .query("gift_campaigns")
        .withIndex("by_archived_at", (q) => q.eq("archived_at", null))
        .take(100);
      if (existingCampaigns.length >= 100)
        throw new ConvexError(
          "Archive an unused offer before creating more than 100 current offers.",
        );
      if (values.active) {
        const active = await activeGiftCampaigns(ctx);
        if (active.length >= 50)
          throw new ConvexError("Pause another offer before publishing more than 50 offers.");
      }
      id = await ctx.db.insert("gift_campaigns", {
        ...values,
        archived_at: null,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
    await writeAuditLog(ctx, {
      action: args.id ? "gift_campaign.update" : "gift_campaign.create",
      entityType: "gift_campaign",
      entityId: String(id),
      summary: values.name,
    });
    const saved = await ctx.db.get(id);
    if (!saved) throw new ConvexError("Gift campaign could not be saved.");
    return publicCampaign(saved);
  },
});

export const remove = mutation({
  args: { id: v.id("gift_campaigns") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return false;
    if (campaign.archived_at) return true;
    const timestamp = nowIso();
    await ctx.db.patch(args.id, {
      active: false,
      archived_at: timestamp,
      updated_at: timestamp,
    });
    await writeAuditLog(ctx, {
      action: "gift_campaign.archive",
      entityType: "gift_campaign",
      entityId: String(args.id),
      summary: campaign.name,
    });
    return true;
  },
});
