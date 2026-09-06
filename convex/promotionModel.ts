import { v } from "convex/values";
export const discountType = v.union(v.literal("percent"), v.literal("fixed"));
export const tierValidator = v.object({
  quantity: v.number(),
  type: discountType,
  value: v.number(),
});
export const promotionConfig = v.object({
  active: v.boolean(),
  tiers: v.array(tierValidator),
  product_ids: v.array(v.id("products")),
  banner_active: v.boolean(),
  banner_messages: v.array(v.string()),
});
export const pricingSnapshot = v.object({
  subtotal_paise: v.number(),
  discount_paise: v.number(),
  label: v.string(),
  coupon_code: v.optional(v.string()),
  coupon_id: v.optional(v.id("discounts")),
});
export const emptyPromotions = {
  active: false,
  tiers: [],
  product_ids: [],
  banner_active: false,
  banner_messages: [],
};
export function normalizeCoupon(value = "") {
  return value.trim().toUpperCase();
}
export function discountPaise(type: string, value: number, basis: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(
    0,
    Math.min(
      basis - 100,
      type === "percent" ? Math.round((basis * value) / 100) : Math.round(value * 100),
    ),
  );
}
export function validateDiscount(type: string, value: number) {
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    (type === "percent" && value > 90) ||
    (type === "fixed" && value > 100000)
  )
    throw new Error("Enter a discount above zero (up to 90% or ₹100,000).");
  if (Math.abs(value * 100 - Math.round(value * 100)) > 0.000001)
    throw new Error("Use at most two decimal places.");
}
