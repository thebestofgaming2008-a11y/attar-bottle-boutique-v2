import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { nowIso, publicAddress, requireIdentity } from "./lib";

const addressPatch = {
  type: v.optional(v.union(v.string(), v.null())),
  is_default: v.optional(v.union(v.boolean(), v.null())),
  full_name: v.optional(v.union(v.string(), v.null())),
  phone: v.optional(v.union(v.string(), v.null())),
  address_line_1: v.optional(v.union(v.string(), v.null())),
  address_line_2: v.optional(v.union(v.string(), v.null())),
  city: v.optional(v.union(v.string(), v.null())),
  state: v.optional(v.union(v.string(), v.null())),
  postal_code: v.optional(v.union(v.string(), v.null())),
  country: v.optional(v.union(v.string(), v.null())),
};

function cleanText(value: unknown, max = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: unknown, max = 160) {
  const next = cleanText(value, max);
  return next.length ? next : null;
}

function normalizeAddress(
  payload: Record<string, unknown>,
  existing: Partial<Doc<"addresses">> = {},
) {
  const source = { ...existing, ...payload };
  const phone = cleanNullable(source.phone, 32);
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) throw new Error("Enter a valid phone number.");
  }
  const normalized = {
    type: cleanNullable(source.type, 32) ?? "shipping",
    is_default: Boolean(source.is_default),
    full_name: cleanNullable(source.full_name, 120),
    phone,
    address_line_1: cleanNullable(source.address_line_1, 180),
    address_line_2: cleanNullable(source.address_line_2, 180),
    city: cleanNullable(source.city, 80),
    state: cleanNullable(source.state, 80),
    postal_code: cleanNullable(source.postal_code, 24),
    country: cleanNullable(source.country, 80),
  };
  if (
    !normalized.full_name ||
    !normalized.address_line_1 ||
    !normalized.city ||
    !normalized.state ||
    !normalized.postal_code ||
    !normalized.country
  ) {
    throw new Error("Complete address details are required.");
  }
  return normalized;
}

async function clearOtherDefaults(ctx: MutationCtx, userId: string, keepId?: string) {
  const rows = await ctx.db
    .query("addresses")
    .withIndex("by_user_id", (q) => q.eq("user_id", userId))
    .collect();
  for (const row of rows) {
    if (row.is_default && String(row._id) !== keepId)
      await ctx.db.patch(row._id, { is_default: false, updated_at: nowIso() });
  }
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx);
    const rows = await ctx.db
      .query("addresses")
      .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
      .collect();
    return rows
      .map(publicAddress)
      .sort(
        (a, b) =>
          Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)) ||
          String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
      );
  },
});

export const create = mutation({
  args: { payload: v.object(addressPatch) },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const timestamp = nowIso();
    const rows = await ctx.db
      .query("addresses")
      .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
      .collect();
    if (rows.length >= 10) throw new Error("You can save up to 10 addresses.");
    const payload = normalizeAddress({
      ...args.payload,
      is_default: args.payload.is_default || rows.length === 0,
    });
    if (payload.is_default) await clearOtherDefaults(ctx, auth.userId);
    const id = await ctx.db.insert("addresses", {
      user_id: auth.userId,
      ...payload,
      created_at: timestamp,
      updated_at: timestamp,
    });
    const doc = await ctx.db.get(id);
    return doc ? publicAddress(doc) : null;
  },
});

export const update = mutation({
  args: { id: v.string(), patch: v.object(addressPatch) },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const id = args.id as Id<"addresses">;
    const existing = await ctx.db.get(id);
    if (!existing || existing.user_id !== auth.userId) throw new Error("Address not found.");
    const payload = normalizeAddress(args.patch, existing);
    if (payload.is_default) await clearOtherDefaults(ctx, auth.userId, args.id);
    await ctx.db.patch(id, { ...payload, updated_at: nowIso() });
    const doc = await ctx.db.get(id);
    return doc ? publicAddress(doc) : null;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const id = args.id as Id<"addresses">;
    const existing = await ctx.db.get(id);
    if (!existing || existing.user_id !== auth.userId) throw new Error("Address not found.");
    await ctx.db.delete(id);
    if (existing.is_default) {
      const next = await ctx.db
        .query("addresses")
        .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
        .first();
      if (next) await ctx.db.patch(next._id, { is_default: true, updated_at: nowIso() });
    }
    return true;
  },
});

export const setDefault = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireIdentity(ctx);
    const id = args.id as Id<"addresses">;
    const rows = await ctx.db
      .query("addresses")
      .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
      .collect();
    if (!rows.some((row) => String(row._id) === args.id)) throw new Error("Address not found.");
    for (const row of rows)
      await ctx.db.patch(row._id, { is_default: row._id === id, updated_at: nowIso() });
    return true;
  },
});
