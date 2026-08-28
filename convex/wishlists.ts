import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowIso, requireIdentity } from "./lib";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx);
    const rows = await ctx.db
      .query("wishlist_items")
      .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
      .collect();
    return rows.map((row) => row.product_id);
  },
});

export const toggle = mutation({
  args: { productId: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("wishlist_items")
      .withIndex("by_user_product", (q) =>
        q.eq("user_id", auth.userId).eq("product_id", args.productId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }

    const product = (await ctx.db.get(args.productId as any)) as any;
    if (!product || product.is_active === false)
      throw new Error("This product is no longer available.");

    await ctx.db.insert("wishlist_items", {
      user_id: auth.userId,
      product_id: args.productId,
      created_at: nowIso(),
    });
    return { saved: true };
  },
});
