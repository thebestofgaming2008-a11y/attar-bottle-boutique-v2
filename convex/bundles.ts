import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export const bundleKind = v.union(v.literal("single"), v.literal("combo"), v.literal("pack"));
export const bundleItem = v.object({
  product_id: v.id("products"),
  quantity: v.number(),
  selected_color: v.optional(v.string()),
  selected_size: v.optional(v.string()),
});
export const bundleContent = v.object({
  product_id: v.id("products"),
  quantity: v.number(),
  name: v.string(),
  selected_color: v.optional(v.string()),
  selected_size: v.optional(v.string()),
});
export type BundleContent = {
  product_id: Id<"products">;
  quantity: number;
  name: string;
  selected_color?: string;
  selected_size?: string;
};
type Ctx = QueryCtx | MutationCtx;
export const isBundle = (p: { bundle_kind?: string } | null | undefined) =>
  p?.bundle_kind === "combo" || p?.bundle_kind === "pack";

export async function resolveBundle(
  ctx: Ctx,
  product: Doc<"products">,
): Promise<{
  stock: number;
  contents: BundleContent[];
}> {
  if (!isBundle(product))
    return {
      stock: product.in_stock === false ? 0 : Math.max(0, product.stock_quantity ?? 0),
      contents: [],
    };
  const items = product.bundle_items ?? [];
  if (!items.length || items.length > 12) throw new Error("Choose 1–12 items for this pack.");
  const totals = new Map<string, number>();
  const products = new Map<string, Doc<"products">>();
  const contents: BundleContent[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 24)
      throw new Error("Each pack quantity must be a whole number from 1 to 24.");
    const p = await ctx.db.get(item.product_id);
    if (!p || isBundle(p) || String(p._id) === String(product._id))
      throw new Error("Packs can contain individual products only, not other packs.");
    for (const [value, options, label] of [
      [item.selected_color, p.color_options, "colour"],
      [item.selected_size, p.size_options, "size"],
    ] as const) {
      if (
        (options?.length && (!value || !options.includes(value))) ||
        (value && !options?.includes(value))
      )
        throw new Error(`Choose a valid ${label} for ${p.name} in this pack.`);
    }
    totals.set(String(p._id), (totals.get(String(p._id)) ?? 0) + item.quantity);
    products.set(String(p._id), p);
    contents.push({ ...item, name: p.name });
  }
  const totalUnits = contents.reduce((sum, i) => sum + i.quantity, 0);
  if (totalUnits < 2 || totalUnits > 24)
    throw new Error("A combo or pack must contain 2–24 items.");
  if (product.bundle_kind === "pack" && products.size !== 1)
    throw new Error("A multipack contains one product. Use Combo for different attars.");
  if (product.bundle_kind === "combo" && products.size < 2)
    throw new Error("A combo needs at least two different products. Use Multipack for one attar.");
  let stock = Number.MAX_SAFE_INTEGER;
  for (const [id, qty] of totals) {
    const p = products.get(id)!;
    stock = Math.min(
      stock,
      p.is_active === false || p.in_stock === false
        ? 0
        : Math.floor(Math.max(0, p.stock_quantity ?? 0) / qty),
    );
  }
  return { stock, contents };
}

// Public stock is derived, never independently maintained on a bundle record.
export async function withBundle(ctx: Ctx, p: Doc<"products">) {
  if (!isBundle(p)) return p;
  try {
    const { stock, contents } = await resolveBundle(ctx, p);
    return { ...p, stock_quantity: stock, in_stock: stock > 0, bundle_contents: contents };
  } catch {
    // A removed variant/product makes the pack unavailable, not the entire catalogue.
    return {
      ...p,
      stock_quantity: 0,
      in_stock: false,
      bundle_contents: [],
      bundle_error: "Update the included products/options before selling this pack.",
    };
  }
}

export async function validateBundleEdit(ctx: MutationCtx, input: any, current?: Doc<"products">) {
  const kind = input.bundle_kind ?? current?.bundle_kind ?? "single";
  if (current && kind !== (current.bundle_kind ?? "single"))
    throw new Error(
      "Create a new product to change between an individual attar, combo or multipack.",
    );
  if (kind === "single") {
    if (input.bundle_items?.length)
      throw new Error("Select Combo or Multipack to add included products.");
    return { bundle_kind: kind, bundle_items: [] };
  }
  const next = { ...current, ...input, bundle_kind: kind } as Doc<"products">;
  await resolveBundle(ctx, next);
  return {
    bundle_kind: kind,
    bundle_items: next.bundle_items ?? [],
    stock_quantity: 0,
    in_stock: true,
  };
}

// Snapshot quantities are per purchased pack; legacy individual orders stay unchanged.
export function inventoryParts(item: {
  productId: string;
  qty: number;
  bundleContents?: BundleContent[];
}) {
  return item.bundleContents?.length
    ? item.bundleContents.map((p) => ({ productId: p.product_id, qty: p.quantity * item.qty }))
    : [{ productId: item.productId as Id<"products">, qty: item.qty }];
}

export async function adjustInventory(
  ctx: MutationCtx,
  item: Parameters<typeof inventoryParts>[0],
  direction: 1 | -1,
  strict = false,
) {
  let attention = false;
  for (const part of inventoryParts(item)) {
    const p = await ctx.db.get(part.productId);
    if (!p) {
      if (strict) throw new Error("An included product is no longer available.");
      attention = true;
      continue;
    }
    const next = Number(p.stock_quantity ?? 0) + direction * part.qty;
    if (next < 0) {
      if (strict) throw new Error(`Not enough stock for ${p.name}.`);
      attention = true;
    }
    await ctx.db.patch(p._id, {
      stock_quantity: Math.max(0, next),
      in_stock: next > 0,
      updated_at: new Date().toISOString(),
    });
  }
  return attention;
}
