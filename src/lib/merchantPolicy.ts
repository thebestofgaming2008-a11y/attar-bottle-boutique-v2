// Owner-confirmed terms, 11 October 2026. Transit starts after dispatch.
export const MERCHANT_POLICY_UPDATED = "2026-10-11";
export const DISPATCH_TEXT = "Orders are dispatched within 24–48 hours after payment confirmation.";
export const DELIVERY_TEXT = "India delivery takes 5 working days after dispatch.";
export const RETURN_ISSUE_TEXT =
  "Returns and exchanges are accepted only for damaged, leaking or incorrect items reported within 7 days of delivery. Items must be unused and sealed. The same 7-day window and conditions apply to exchanges.";
export const RETURN_POSTAGE_TEXT =
  "BADR pays return shipping when the error is ours or the item arrived damaged.";

export function shippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "INR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      description: `${DISPATCH_TEXT} ${DELIVERY_TEXT}`,
      handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 5, maxValue: 5, unitCode: "DAY" },
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
    description: `${RETURN_ISSUE_TEXT} ${RETURN_POSTAGE_TEXT}`,
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
