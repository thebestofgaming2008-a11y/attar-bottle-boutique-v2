// Owner-supplied terms, 11 October 2026. Do not infer transit/business days
// or change-of-mind eligibility from the ambiguous portions of the supplied copy.
export const MERCHANT_POLICY_UPDATED = "2026-10-11";
export const DISPATCH_TEXT = "Orders are dispatched within 24–48 hours after payment confirmation.";
export const RETURN_ISSUE_TEXT =
  "Report damaged, leaking or incorrect items within 7 days of delivery. Returns and exchanges for these issues have the same 7-day window.";
export const RETURN_POSTAGE_TEXT =
  "BADR pays return shipping when the error is ours or the item arrived damaged.";

export function shippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "INR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    // Transit time is deliberately omitted until the owner clarifies whether
    // the five-day estimate includes dispatch and whether it is working days.
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
    },
  };
}

export function merchantReturnPolicy(origin: string) {
  // Google's organization-level link option preserves conditional eligibility.
  // A generic seven-day/free-return Offer would overpromise change-of-mind returns.
  return {
    "@type": "MerchantReturnPolicy",
    "@id": `${origin}/returns#policy`,
    merchantReturnLink: `${origin}/returns`,
  };
}

export function indiaPriceText(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(price);
}
