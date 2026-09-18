import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { nowIso, requireAdmin, requireIdentity, writeAuditLog } from "./lib";

const reviewStatus = new Set(["pending", "published", "hidden"]);

function cleanText(value: string | null | undefined, max = 1000) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 1000) {
  const next = cleanText(value, max);
  return next.length ? next : null;
}

function validateFeedback(args: { rating: number; title?: string | null; body?: string | null }) {
  if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
    throw new Error("Choose a rating from 1 to 5.");
  }
  if (!cleanText(args.title) && !cleanText(args.body)) {
    throw new Error("Please include your written feedback.");
  }
}

async function recalculateProductRating(ctx: any, productId: string) {
  const product = await ctx.db.get(productId as any);
  if (!product) return;
  const rows = await ctx.db
    .query("reviews")
    .withIndex("by_product_id", (q: any) => q.eq("product_id", productId))
    .take(200);
  const published = rows.filter(
    (row: any) => row.status === "published" && row.verified_purchase === true,
  );
  const count = published.length;
  const rating = count
    ? published.reduce((sum: number, row: any) => sum + row.rating, 0) / count
    : null;
  await ctx.db.patch(productId as any, {
    rating,
    reviews_count: count,
    updated_at: nowIso(),
  });
}

async function hasVerifiedPurchase(
  ctx: any,
  userId: string | null | undefined,
  email: string | null | undefined,
  productId: string,
) {
  const byUser = userId
    ? await ctx.db
        .query("orders")
        .withIndex("by_user_id", (q: any) => q.eq("user_id", userId))
        .order("desc")
        .take(500)
    : [];
  const byEmail = email
    ? await ctx.db
        .query("orders")
        .withIndex("by_customer_email", (q: any) =>
          q.eq("customer_email", email.trim().toLowerCase()),
        )
        .order("desc")
        .take(500)
    : [];
  const orders = [...byUser, ...byEmail].filter((order: any) => order.payment_status === "paid");
  for (const order of orders) {
    const items = await ctx.db
      .query("order_items")
      .withIndex("by_order_id", (q: any) => q.eq("order_id", order._id))
      .take(100);
    if (items.some((item: any) => String(item.product_id) === productId)) return true;
  }
  return false;
}

function publicReview(doc: Record<string, any>): Record<string, any> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}

function cleanEmail(value: string | null | undefined) {
  return cleanText(value, 180).toLowerCase();
}

function normalizeOrderNumber(value: string) {
  const raw = cleanText(value, 40).toUpperCase();
  return /^\d+$/.test(raw) ? `#${raw}` : raw;
}

async function hasReviewedByEmail(ctx: any, email: string, productId: string) {
  const rows = await ctx.db
    .query("reviews")
    .withIndex("by_product_email", (q: any) =>
      q.eq("product_id", productId).eq("customer_email", email),
    )
    .first();
  return Boolean(rows);
}

export const listPublishedForProduct = query({
  args: { productId: v.string() },
  returns: v.array(
    v.object({
      id: v.id("reviews"),
      product_id: v.string(),
      customer_name: v.union(v.string(), v.null()),
      rating: v.number(),
      title: v.union(v.string(), v.null()),
      body: v.union(v.string(), v.null()),
      status: v.literal("published"),
      verified_purchase: v.literal(true),
      created_at: v.union(v.string(), v.null()),
      customer_email: v.null(),
      media_urls: v.array(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.productId))
      .take(200);
    return rows
      .filter((row) => row.status === "published" && row.verified_purchase === true)
      .map((row) => ({
        id: row._id,
        product_id: row.product_id,
        customer_name: row.customer_name ?? null,
        rating: row.rating,
        title: row.title ?? null,
        body: row.body ?? null,
        status: "published" as const,
        verified_purchase: true as const,
        created_at: row.created_at ?? null,
        customer_email: null,
        media_urls: row.media_urls ?? [],
      }))
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("reviews").take(args.limit ?? 200);
    return rows
      .map(publicReview)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const submit = mutation({
  args: {
    productId: v.string(),
    rating: v.number(),
    title: v.optional(v.union(v.string(), v.null())),
    body: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    validateFeedback(args);
    const product = (await ctx.db.get(args.productId as any)) as any;
    if (!product || product.is_active === false) throw new Error("Product not found.");
    const rating = Math.max(1, Math.min(5, Math.round(args.rating * 10) / 10));
    const user = auth.user as any;
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", auth.userId).eq("product_id", args.productId),
      )
      .first();
    if (
      existing ||
      (user.email && (await hasReviewedByEmail(ctx, cleanEmail(user.email), args.productId)))
    )
      throw new Error("You already reviewed this product.");
    if (!(await hasVerifiedPurchase(ctx, auth.userId, user.email, args.productId))) {
      throw new Error("Only verified customers can review this product.");
    }
    const timestamp = nowIso();
    const id = await ctx.db.insert("reviews", {
      verified_purchase: true,
      product_id: args.productId,
      user_id: auth.userId,
      customer_name: user.name ?? null,
      customer_email: cleanEmail(user.email) || null,
      rating,
      title: cleanNullable(args.title, 100),
      body: cleanNullable(args.body, 1600),
      media_urls: [],
      status: "pending",
      admin_note: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const doc = await ctx.db.get(id);
    return doc ? publicReview(doc) : null;
  },
});

export const submitForOrder = mutation({
  args: {
    orderNumber: v.string(),
    email: v.string(),
    productId: v.string(),
    rating: v.number(),
    title: v.optional(v.union(v.string(), v.null())),
    body: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orderNumber = normalizeOrderNumber(args.orderNumber);
    validateFeedback(args);
    const email = cleanEmail(args.email);
    if (!orderNumber || !email) throw new Error("Order number and email are required.");
    const product = (await ctx.db.get(args.productId as any)) as any;
    if (!product || product.is_active === false) throw new Error("Product not found.");
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q: any) => q.eq("order_number", orderNumber))
      .first();
    if (!order || cleanEmail(order.customer_email) !== email)
      throw new Error("Order not found for this email.");
    if (order.payment_status !== "paid") throw new Error("Only paid orders can be reviewed.");
    const items = await ctx.db
      .query("order_items")
      .withIndex("by_order_id", (q: any) => q.eq("order_id", order._id))
      .take(100);
    if (!items.some((item: any) => String(item.product_id) === args.productId))
      throw new Error("This product was not in that order.");
    if (await hasReviewedByEmail(ctx, email, args.productId))
      throw new Error("You already reviewed this product.");
    const timestamp = nowIso();
    const id = await ctx.db.insert("reviews", {
      verified_purchase: true,
      product_id: args.productId,
      user_id: order.user_id ?? null,
      customer_name: cleanNullable(order.customer_name, 120),
      customer_email: email,
      rating: Math.max(1, Math.min(5, Math.round(args.rating * 10) / 10)),
      title: cleanNullable(args.title, 120),
      body: cleanNullable(args.body, 1600),
      media_urls: [],
      status: "pending",
      admin_note: `Submitted from order ${orderNumber}`,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const doc = await ctx.db.get(id);
    return doc ? publicReview(doc) : null;
  },
});

// Photo uploads are server-mediated: neither an R2/admin token nor arbitrary media URLs
// are accepted from the customer. Each paid review has a bounded upload budget.
export const reservePhotoUpload = internalMutation({
  args: {
    reviewId: v.id("reviews"),
    orderNumber: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.status !== "pending" || !review.verified_purchase)
      throw new Error("This review is no longer open for photos.");
    const auth = await requireIdentity(ctx).catch(() => null);
    let permitted = Boolean(auth && review.user_id === auth.userId);
    if (!permitted && args.orderNumber && args.email) {
      const order = await ctx.db
        .query("orders")
        .withIndex("by_order_number", (q) =>
          q.eq("order_number", normalizeOrderNumber(args.orderNumber!)),
        )
        .first();
      if (
        order &&
        order.payment_status === "paid" &&
        cleanEmail(order.customer_email) === cleanEmail(args.email) &&
        cleanEmail(review.customer_email) === cleanEmail(args.email)
      ) {
        const items = await ctx.db
          .query("order_items")
          .withIndex("by_order_id", (q) => q.eq("order_id", order._id))
          .take(100);
        permitted = items.some((item) => item.product_id === review.product_id);
      }
    }
    if (!permitted) throw new Error("Verify the purchase before uploading photos.");
    if ((review.media_urls?.length ?? 0) >= 3) throw new Error("A review can have up to 3 photos.");
    if ((review.photo_upload_attempts ?? 0) >= 6)
      throw new Error("Photo upload limit reached. Your written review is still saved.");
    await ctx.db.patch(review._id, {
      photo_upload_attempts: (review.photo_upload_attempts ?? 0) + 1,
    });
    return null;
  },
});

export const attachPhoto = internalMutation({
  args: { reviewId: v.id("reviews"), url: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review || review.status !== "pending")
      throw new Error("Review moderation already completed; the photo was not added.");
    const photos = review.media_urls ?? [];
    if (photos.includes(args.url)) return null;
    if (photos.length >= 3) throw new Error("A review can have up to 3 photos.");
    await ctx.db.patch(review._id, { media_urls: [...photos, args.url], updated_at: nowIso() });
    return null;
  },
});

export const createAdmin = mutation({
  args: {
    productId: v.string(),
    rating: v.number(),
    customerName: v.optional(v.union(v.string(), v.null())),
    customerEmail: v.optional(v.union(v.string(), v.null())),
    title: v.optional(v.union(v.string(), v.null())),
    body: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    validateFeedback(args);
    const product = (await ctx.db.get(args.productId as any)) as any;
    if (!product) throw new Error("Product not found.");
    const status = cleanText(args.status ?? "published", 24).toLowerCase();
    if (!reviewStatus.has(status)) throw new Error("Invalid review status.");
    if (!(await hasVerifiedPurchase(ctx, null, cleanEmail(args.customerEmail), args.productId))) {
      throw new Error(
        "A paid purchase for this customer's email is required. Only add genuine customer feedback.",
      );
    }
    const timestamp = nowIso();
    const id = await ctx.db.insert("reviews", {
      verified_purchase: true,
      product_id: args.productId,
      user_id: null,
      customer_name: cleanNullable(args.customerName, 120),
      customer_email: cleanNullable(args.customerEmail, 160),
      rating: Math.max(1, Math.min(5, Math.round(args.rating * 10) / 10)),
      title: cleanNullable(args.title, 120),
      body: cleanNullable(args.body, 1600),
      media_urls: [],
      status,
      admin_note: "Created by admin",
      created_at: timestamp,
      updated_at: timestamp,
    });
    if (status === "published") await recalculateProductRating(ctx, args.productId);
    await writeAuditLog(ctx, {
      action: "review.create",
      entityType: "review",
      entityId: String(id),
      summary: cleanNullable(args.title, 120) ?? cleanNullable(args.body, 120),
      metadata: { productId: args.productId, status },
    });
    const doc = await ctx.db.get(id);
    return doc ? publicReview(doc) : null;
  },
});

export const canReviewProduct = query({
  args: { productId: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx).catch(() => null);
    if (!auth) return { canReview: false };
    const user = auth.user as any;
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", auth.userId).eq("product_id", args.productId),
      )
      .first();
    return {
      canReview:
        !existing && (await hasVerifiedPurchase(ctx, auth.userId, user.email, args.productId)),
    };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.string(),
    status: v.string(),
    adminNote: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = cleanText(args.status, 24).toLowerCase();
    if (!reviewStatus.has(status)) throw new Error("Invalid review status.");
    const current = (await ctx.db.get(args.id as any)) as any;
    if (!current) throw new Error("Review not found.");
    if (
      status === "published" &&
      current.verified_purchase !== true &&
      !(await hasVerifiedPurchase(ctx, current.user_id, current.customer_email, current.product_id))
    ) {
      throw new Error(
        "Cannot publish as verified: no paid purchase was found for this customer and product.",
      );
    }
    await ctx.db.patch(args.id as any, {
      status,
      ...(status === "published" ? { verified_purchase: true } : {}),
      admin_note: cleanNullable(args.adminNote, 400),
      updated_at: nowIso(),
    });
    await recalculateProductRating(ctx, current.product_id);
    await writeAuditLog(ctx, {
      action: "review.status.update",
      entityType: "review",
      entityId: args.id,
      summary: status,
      metadata: { productId: current.product_id },
    });
    return true;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = (await ctx.db.get(args.id as any)) as any;
    if (!current) return false;
    await ctx.db.delete(args.id as any);
    await recalculateProductRating(ctx, current.product_id);
    await writeAuditLog(ctx, {
      action: "review.delete",
      entityType: "review",
      entityId: args.id,
      summary: current.title ?? current.body ?? null,
      metadata: { productId: current.product_id },
    });
    return true;
  },
});
