import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdminEmail, nowIso, publicProfile, requireAdmin, requireIdentity } from "./lib";

async function getProfileByUserId(ctx: any, userId: string) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .unique();
}

export const currentProfile = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx).catch(() => null);
    if (!auth) return null;
    const authUser = auth.user as any;
    const profile = await getProfileByUserId(ctx, auth.userId);
    if (!profile) {
      return {
        id: auth.userId,
        user_id: auth.userId,
        email: authUser.email ?? null,
        full_name: authUser.name ?? null,
        phone: null,
        avatar_url: null,
        preferred_currency: "INR",
        marketing_consent: false,
      };
    }
    return publicProfile(profile);
  },
});

export const ensureCurrentProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    marketingConsent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx).catch(() => null);
    if (!auth) return null;
    const authUser = auth.user as any;
    const existing = await getProfileByUserId(ctx, auth.userId);
    const timestamp = nowIso();
    const patch = {
      email: authUser.email ?? null,
      full_name: args.fullName ?? authUser.name ?? existing?.full_name ?? null,
      phone: args.phone ?? existing?.phone ?? null,
      preferred_currency: existing?.preferred_currency ?? "INR",
      marketing_consent: args.marketingConsent ?? existing?.marketing_consent ?? false,
      updated_at: timestamp,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      const next = await ctx.db.get(existing._id);
      return next ? publicProfile(next) : null;
    }
    const id = await ctx.db.insert("profiles", {
      userId: auth.userId,
      ...patch,
      total_orders: 0,
      total_spent: 0,
      created_at: timestamp,
    });
    const created = await ctx.db.get(id);
    return created ? publicProfile(created) : null;
  },
});

export const updateProfile = mutation({
  args: {
    full_name: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    date_of_birth: v.optional(v.union(v.string(), v.null())),
    marketing_consent: v.optional(v.union(v.boolean(), v.null())),
    preferred_currency: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const authUser = auth.user as any;
    const existing = await getProfileByUserId(ctx, auth.userId);
    const timestamp = nowIso();
    if (!existing) {
      const id = await ctx.db.insert("profiles", {
        userId: auth.userId,
        email: authUser.email ?? null,
        full_name: args.full_name ?? authUser.name ?? null,
        phone: args.phone ?? null,
        date_of_birth: args.date_of_birth ?? null,
        preferred_currency: args.preferred_currency ?? "INR",
        marketing_consent: args.marketing_consent ?? false,
        total_orders: 0,
        total_spent: 0,
        created_at: timestamp,
        updated_at: timestamp,
      });
      const created = await ctx.db.get(id);
      return created ? publicProfile(created) : null;
    }
    await ctx.db.patch(existing._id, { ...args, updated_at: timestamp });
    const next = await ctx.db.get(existing._id);
    return next ? publicProfile(next) : null;
  },
});

export const listCustomers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("profiles").take(args.limit ?? 200);
    return rows
      .map(publicProfile)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx).catch(() => null);
    if (!auth) return null;
    const authUser = auth.user as any;
    return {
      id: auth.userId,
      email: authUser.email ?? null,
      name: authUser.name ?? null,
      isAdmin: isAdminEmail(authUser.email),
    };
  },
});
