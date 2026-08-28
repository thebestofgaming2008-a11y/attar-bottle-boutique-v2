export const SHIPPING_500G_INR = 50;
export const SHIPPING_1KG_INR = 80;
const DEFAULT_PRODUCT_WEIGHT_G = 350;

export type CustomerCountryType = "india" | "unsupported";
export type ShippingPaymentStatus = "included";

export function customerCountryType(country: string | null | undefined): CustomerCountryType {
  const normalized = String(country ?? "")
    .trim()
    .toLowerCase();
  return normalized === "india" || normalized === "in" || normalized === "bharat"
    ? "india"
    : "unsupported";
}

export function checkoutShippingForCountry(country: string | null | undefined): {
  amount: number;
  countryType: CustomerCountryType;
  paymentStatus: ShippingPaymentStatus;
  note: string;
} {
  const countryType = customerCountryType(country);
  if (countryType === "india") {
    return {
      amount: 0,
      countryType,
      paymentStatus: "included",
      note: "India shipping is included in product prices.",
    };
  }
  return {
    amount: 0,
    countryType,
    paymentStatus: "included",
    note: "We currently deliver within India only.",
  };
}

export function calculateShippingInr(
  subtotal: number,
  lines: Array<{ qty: number; weightG?: number | null }> = [],
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  const totalWeight = lines.reduce((sum, line) => {
    const qty = Math.max(1, Math.floor(line.qty || 1));
    const weight =
      Number.isFinite(line.weightG ?? NaN) && (line.weightG ?? 0) > 0
        ? Number(line.weightG)
        : DEFAULT_PRODUCT_WEIGHT_G;
    return sum + weight * qty;
  }, 0);
  if (totalWeight <= 500) return SHIPPING_500G_INR;
  if (totalWeight <= 1000) return SHIPPING_1KG_INR;
  return Math.ceil(totalWeight / 1000) * SHIPPING_1KG_INR;
}
