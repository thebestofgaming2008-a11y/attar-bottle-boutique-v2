import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const zones = ["Local", "Regional", "National", "Remote"];
const carriers = ["DTDC", "India Post"];
const methods = ["Standard", "Express"];

function cleanText(value: string | null | undefined, max = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function publicDoc<T extends { _id: unknown; _creationTime: number }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

function slugify(value: string) {
  return cleanText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

async function ensureShippingDefaults(ctx: MutationCtx) {
  const existing = await ctx.db.query("shipping_rates").take(1);
  if (existing.length) return;
  const timestamp = nowIso();
  for (const carrier of carriers) {
    for (const zone of zones) {
      for (const method of methods) {
        await ctx.db.insert("shipping_rates", {
          carrier,
          zone,
          method,
          base_fee: method === "Express" ? 80 : 50,
          per_item_fee: 0,
          per_weight_fee: method === "Express" ? 80 : 50,
          is_active: true,
          updated_at: timestamp,
        });
      }
    }
  }
}

export const listDiscounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("discounts").take(500);
    return rows
      .map(publicDoc)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  },
});

export const createDiscount = mutation({
  args: {
    code: v.string(),
    type: v.string(),
    value: v.number(),
    usage_limit: v.optional(v.union(v.number(), v.null())),
    starts_at: v.optional(v.union(v.string(), v.null())),
    ends_at: v.optional(v.union(v.string(), v.null())),
    scope_type: v.string(),
    scope_value: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const code = cleanText(args.code, 40).toUpperCase();
    if (!code) throw new Error("Discount code is required.");
    const existing = await ctx.db
      .query("discounts")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (existing) throw new Error("A discount with this code already exists.");
    const timestamp = nowIso();
    const id = await ctx.db.insert("discounts", {
      code,
      type: cleanText(args.type, 40) || "percent",
      value: Math.max(0, args.value),
      active: true,
      usage_limit: args.usage_limit ?? null,
      used_count: 0,
      starts_at: args.starts_at ?? null,
      ends_at: args.ends_at ?? null,
      scope_type: cleanText(args.scope_type, 40) || "all",
      scope_value: cleanText(args.scope_value, 120) || null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    await writeAuditLog(ctx, {
      action: "discount.create",
      entityType: "discount",
      entityId: String(id),
      summary: code,
      metadata: { type: args.type, value: args.value },
    });
    const doc = await ctx.db.get(id);
    return doc ? publicDoc(doc) : null;
  },
});

export const updateDiscount = mutation({
  args: {
    id: v.id("discounts"),
    patch: v.object({
      code: v.optional(v.string()),
      type: v.optional(v.string()),
      value: v.optional(v.number()),
      active: v.optional(v.boolean()),
      usage_limit: v.optional(v.union(v.number(), v.null())),
      starts_at: v.optional(v.union(v.string(), v.null())),
      ends_at: v.optional(v.union(v.string(), v.null())),
      scope_type: v.optional(v.string()),
      scope_value: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const patch = { ...args.patch, updated_at: nowIso() };
    if (args.patch.code !== undefined) patch.code = cleanText(args.patch.code, 40).toUpperCase();
    await ctx.db.patch(args.id, patch);
    await writeAuditLog(ctx, {
      action: "discount.update",
      entityType: "discount",
      entityId: String(args.id),
      summary: patch.code ?? null,
      metadata: { changed: Object.keys(args.patch) },
    });
    const doc = await ctx.db.get(args.id);
    return doc ? publicDoc(doc) : null;
  },
});

export const deleteDiscount = mutation({
  args: { id: v.id("discounts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    await writeAuditLog(ctx, {
      action: "discount.delete",
      entityType: "discount",
      entityId: String(args.id),
      summary: current?.code ?? null,
    });
    return true;
  },
});

export const listShippingRates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("shipping_rates").take(100);
    return rows
      .map(publicDoc)
      .sort((a, b) =>
        `${a.carrier}-${a.zone}-${a.method}`.localeCompare(`${b.carrier}-${b.zone}-${b.method}`),
      );
  },
});

export const seedShippingDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await ensureShippingDefaults(ctx);
    return true;
  },
});

export const updateShippingRate = mutation({
  args: {
    id: v.id("shipping_rates"),
    patch: v.object({
      base_fee: v.optional(v.number()),
      per_item_fee: v.optional(v.number()),
      per_weight_fee: v.optional(v.number()),
      is_active: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { ...args.patch, updated_at: nowIso() });
    const doc = await ctx.db.get(args.id);
    return doc ? publicDoc(doc) : null;
  },
});

export const getStoreSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("store_settings").take(200);
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },
});

export const saveStoreSettings = mutation({
  args: { settings: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const timestamp = nowIso();
    for (const [key, value] of Object.entries(args.settings ?? {})) {
      const existing = await ctx.db
        .query("store_settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) await ctx.db.patch(existing._id, { value, updated_at: timestamp });
      else await ctx.db.insert("store_settings", { key, value, updated_at: timestamp });
    }
    await writeAuditLog(ctx, {
      action: "settings.update",
      entityType: "store_settings",
      summary: Object.keys(args.settings ?? {})
        .join(", ")
        .slice(0, 160),
      metadata: { keys: Object.keys(args.settings ?? {}) },
    });
    return true;
  },
});

export const listCategories = query({
  args: { type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = args.type
      ? await ctx.db
          .query("categories")
          .withIndex("by_type", (q) => q.eq("type", cleanText(args.type, 40)))
          .take(500)
      : await ctx.db.query("categories").take(500);
    return rows
      .map(publicDoc)
      .sort(
        (a, b) =>
          Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999) ||
          String(a.name).localeCompare(String(b.name)),
      );
  },
});

export const upsertCategory = mutation({
  args: {
    slug: v.optional(v.union(v.string(), v.null())),
    name: v.string(),
    type: v.optional(v.string()),
    parent_slug: v.optional(v.union(v.string(), v.null())),
    sort_order: v.optional(v.union(v.number(), v.null())),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = cleanText(args.name, 80);
    if (!name) throw new Error("Category name is required.");
    const slug = slugify(args.slug || name);
    if (!slug) throw new Error("Category slug is required.");
    const timestamp = nowIso();
    const payload = {
      slug,
      name,
      type: cleanText(args.type, 40) || "category",
      parent_slug: cleanText(args.parent_slug, 80) || null,
      sort_order: args.sort_order ?? null,
      is_active: args.is_active ?? true,
      updated_at: timestamp,
    };
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    const id = existing
      ? (await ctx.db.patch(existing._id, payload), existing._id)
      : await ctx.db.insert("categories", { ...payload, created_at: timestamp });
    await writeAuditLog(ctx, {
      action: existing ? "category.update" : "category.create",
      entityType: "category",
      entityId: String(id),
      summary: name,
      metadata: { slug, type: payload.type },
    });
    const doc = await ctx.db.get(id);
    return doc ? publicDoc(doc) : null;
  },
});

export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const defaults = [
      { slug: "attars", name: "Attars", type: "category", sort_order: 1 },
      { slug: "oud", name: "Oud", type: "collection", parent_slug: "attars", sort_order: 10 },
      { slug: "fresh", name: "Fresh", type: "collection", parent_slug: "attars", sort_order: 20 },
      { slug: "fruity", name: "Fruity", type: "collection", parent_slug: "attars", sort_order: 30 },
      {
        slug: "gourmand",
        name: "Gourmand",
        type: "collection",
        parent_slug: "attars",
        sort_order: 40,
      },
    ];
    for (const item of defaults) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", item.slug))
        .first();
      const payload = { ...item, is_active: true, updated_at: nowIso() };
      if (existing) await ctx.db.patch(existing._id, payload);
      else await ctx.db.insert("categories", { ...payload, created_at: nowIso() });
    }
    await writeAuditLog(ctx, {
      action: "category.seed_defaults",
      entityType: "category",
      summary: "Seeded default attar categories and collections",
      metadata: { count: defaults.length },
    });
    return true;
  },
});

export const listAuditLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("audit_logs")
      .withIndex("by_created_at")
      .order("desc")
      .take(Math.min(args.limit ?? 100, 500));
    return rows.map(publicDoc);
  },
});

export const launchReadiness = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [products, orders, recoveries, pendingReviews, categories] = await Promise.all([
      ctx.db.query("products").take(2000),
      ctx.db.query("orders").order("desc").take(1000),
      ctx.db
        .query("checkout_intents")
        .withIndex("by_status", (q) => q.eq("status", "recovery_required"))
        .take(100),
      ctx.db
        .query("reviews")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(500),
      ctx.db.query("categories").take(500),
    ]);
    const active = products.filter((product) => product.is_active !== false);
    const missingCover = active
      .filter((product) => !product.cover_image_url)
      .map((product) => product.name);
    const missingCategory = active
      .filter((product) => !product.category && !product.category_id)
      .map((product) => product.name);
    const missingDescription = active
      .filter((product) => !product.description && !product.short_description)
      .map((product) => product.name);
    const outOfStockActive = active
      .filter((product) => (product.stock_quantity ?? 0) <= 0 || product.in_stock === false)
      .map((product) => product.name);
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID ?? "";
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY ?? "";
    const env = {
      adminEmail: Boolean(process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS),
      razorpayKeyId: Boolean(razorpayKeyId),
      razorpaySecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
      razorpayWebhookSecret: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      razorpayMode: razorpayKeyId.startsWith("rzp_live_")
        ? "live"
        : razorpayKeyId.startsWith("rzp_test_")
          ? "test"
          : "invalid",
      turnstileSecret: Boolean(turnstileSecret),
      turnstileProduction: Boolean(
        turnstileSecret && !turnstileSecret.startsWith("1x0000000000000000000000000000000"),
      ),
      authSecret: Boolean(process.env.AUTH_SECRET),
    };
    const blockers = [
      ...(!env.adminEmail ? ["ADMIN_EMAIL/ADMIN_EMAILS is not configured."] : []),
      ...(!env.razorpayKeyId || !env.razorpaySecret
        ? ["Razorpay live keys are not configured."]
        : []),
      ...(!env.razorpayWebhookSecret ? ["Razorpay webhook secret is not configured."] : []),
      ...(env.razorpayKeyId && env.razorpaySecret && env.razorpayMode !== "live"
        ? ["Razorpay is still using test credentials; live keys are required for launch."]
        : []),
      ...(!env.turnstileSecret ? ["Turnstile checkout protection is not configured."] : []),
      ...(env.turnstileSecret && !env.turnstileProduction
        ? ["Turnstile is using testing credentials; production keys are required for launch."]
        : []),
      ...(recoveries.length
        ? [`${recoveries.length} paid checkout recovery item(s) need manual attention.`]
        : []),
      ...(missingCover.length
        ? [`${missingCover.length} active product(s) are missing cover images.`]
        : []),
      ...(missingCategory.length
        ? [`${missingCategory.length} active product(s) are missing categories.`]
        : []),
      ...(missingDescription.length
        ? [`${missingDescription.length} active product(s) are missing descriptions.`]
        : []),
    ];
    return {
      ready: blockers.length === 0,
      blockers,
      warnings: [
        ...(outOfStockActive.length
          ? [`${outOfStockActive.length} active product(s) are out of stock.`]
          : []),
        ...(pendingReviews.length
          ? [`${pendingReviews.length} review(s) are waiting for approval.`]
          : []),
        ...(categories.length === 0 ? ["Default categories/subjects have not been seeded."] : []),
      ],
      counts: {
        activeProducts: active.length,
        orders: orders.length,
        recoveries: recoveries.length,
        pendingReviews: pendingReviews.length,
        categories: categories.length,
      },
      samples: {
        missingCover: missingCover.slice(0, 8),
        missingCategory: missingCategory.slice(0, 8),
        missingDescription: missingDescription.slice(0, 8),
        outOfStockActive: outOfStockActive.slice(0, 8),
      },
      env,
    };
  },
});

export const notifications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [
      orders,
      products,
      reviews,
      rates,
      recoveries,
      lowStockSetting,
      paymentHealthSetting,
      paymentAuditSetting,
    ] = await Promise.all([
      ctx.db.query("orders").order("desc").take(500),
      ctx.db.query("products").take(1000),
      ctx.db.query("reviews").order("desc").take(500),
      ctx.db.query("shipping_rates").take(100),
      ctx.db
        .query("checkout_intents")
        .withIndex("by_status", (q) => q.eq("status", "recovery_required"))
        .take(100),
      ctx.db
        .query("store_settings")
        .withIndex("by_key", (q) => q.eq("key", "lowStock"))
        .first(),
      ctx.db
        .query("store_settings")
        .withIndex("by_key", (q) => q.eq("key", "razorpay_reconciliation_health"))
        .first(),
      ctx.db
        .query("store_settings")
        .withIndex("by_key", (q) => q.eq("key", "razorpay_daily_audit_health"))
        .first(),
    ]);
    const lowStockThreshold = Math.max(0, Number(lowStockSetting?.value ?? 5) || 0);
    const now = Date.now();
    const rateTimes = rates
      .map((rate) => Date.parse(rate.updated_at))
      .filter((time) => Number.isFinite(time));
    const oldestRate = rateTimes.length ? Math.min(...rateTimes) : 0;
    const shippingDue =
      rates.length === 0 || !oldestRate || now - oldestRate >= 30 * 24 * 60 * 60 * 1000;
    const paymentHealth = paymentHealthSetting?.value as
      { checked_at?: number; error_count?: number } | undefined;
    const paymentRecoveryUnhealthy =
      !paymentHealth?.checked_at ||
      now - paymentHealth.checked_at > 75 * 60 * 1000 ||
      Number(paymentHealth.error_count ?? 0) > 0;
    const paymentAudit = paymentAuditSetting?.value as
      { checked_at?: number; orphan_payment_ids?: string[]; errors?: string[] } | undefined;
    const paymentAuditStale =
      !paymentAudit?.checked_at || now - paymentAudit.checked_at > 36 * 60 * 60 * 1000;
    const paymentAuditIssues =
      (paymentAudit?.orphan_payment_ids?.length ?? 0) +
      (paymentAudit?.errors?.length ?? 0) +
      (paymentAuditStale ? 1 : 0);
    const notices = [
      {
        id: "unshipped",
        count: orders.filter((o) => o.status === "processing").length,
        title: "Orders need fulfillment",
        body: "orders are processing",
        section: "orders",
      },
      {
        id: "tracking",
        count: orders.filter((o) => o.status === "shipped" && !o.tracking_number).length,
        title: "Missing tracking",
        body: "shipped orders need tracking",
        section: "orders",
      },
      {
        id: "low-stock",
        count: products.filter((p) => (p.stock_quantity ?? 0) <= lowStockThreshold).length,
        title: "Low stock",
        body: "products need inventory review",
        section: "products",
      },
      {
        id: "missing-covers",
        count: products.filter((p) => p.is_active !== false && !p.cover_image_url).length,
        title: "Product covers missing",
        body: "active products need a cover image",
        section: "products",
      },
      {
        id: "missing-descriptions",
        count: products.filter(
          (p) => p.is_active !== false && !p.description && !p.short_description,
        ).length,
        title: "Product descriptions missing",
        body: "active products need product copy",
        section: "products",
      },
      {
        id: "reviews",
        count: reviews.filter((r) => r.status === "pending").length,
        title: "Reviews pending",
        body: "reviews waiting",
        section: "reviews",
      },
      {
        id: "payment-recovery",
        count: recoveries.length,
        title: "Paid orders need recovery",
        body: "captured payments need manual attention",
        section: "orders",
      },
      {
        id: "inventory-attention",
        count: orders.filter((o) => o.inventory_attention === true).length,
        title: "Paid orders need inventory review",
        body: "orders were paid after inventory changed",
        section: "orders",
      },
      {
        id: "payment-health",
        count: paymentRecoveryUnhealthy ? 1 : 0,
        title: "Payment recovery needs attention",
        body: "payment recovery check is stale or failing",
        section: "orders",
      },
      {
        id: "payment-audit",
        count: paymentAuditIssues,
        title: "Razorpay audit needs attention",
        body: "payment audit issues need review",
        section: "orders",
      },
      {
        id: "shipping-review",
        count: shippingDue ? 1 : 0,
        title: "Shipping rates due",
        body: "monthly carrier review is due",
        section: "shipping",
      },
    ];
    return notices
      .filter((notice) => notice.count > 0)
      .map((notice) => ({
        id: notice.id,
        title: notice.title,
        body: `${notice.count} ${notice.body}`,
        section: notice.section,
      }));
  },
});
