import { describe, expect, it } from "vitest";
import {
  DELIVERY_TEXT,
  DISPATCH_TEXT,
  RETURN_ISSUE_TEXT,
  RETURN_POSTAGE_TEXT,
  indiaPriceText,
  merchantReturnPolicy,
  shippingDetails,
} from "../src/lib/merchantPolicy";

describe("Owner-confirmed merchant policy", () => {
  it("limits free delivery to India and expresses 24–48 hours as 1–2 days", () => {
    expect(shippingDetails()).toMatchObject({
      shippingDestination: { addressCountry: "IN" },
      shippingRate: { value: 0, currency: "INR" },
      deliveryTime: { handlingTime: { minValue: 1, maxValue: 2, unitCode: "DAY" } },
    });
    expect(DISPATCH_TEXT).toContain("24–48 hours");
  });
  it("keeps five working days in transit separate from dispatch", () => {
    expect(shippingDetails().deliveryTime.transitTime).toEqual({
      "@type": "QuantitativeValue",
      minValue: 5,
      maxValue: 5,
      unitCode: "DAY",
    });
    expect(DELIVERY_TEXT).toContain("5 working days after dispatch");
    expect(shippingDetails().deliveryTime.description).toContain(DELIVERY_TEXT);
  });
  it("preserves restricted returns instead of promising unrestricted free returns", () => {
    const policy = merchantReturnPolicy("https://houseofbadr.com");
    expect(policy).toMatchObject({
      "@type": "MerchantReturnPolicy",
      "@id": "https://houseofbadr.com/returns#policy",
      merchantReturnLink: "https://houseofbadr.com/returns",
    });
    expect(policy).not.toHaveProperty("returnPolicyCategory");
    expect(policy.description).toContain("accepted only for damaged, leaking or incorrect items");
    expect(RETURN_ISSUE_TEXT).toContain("unused and sealed");
    expect(RETURN_ISSUE_TEXT).toContain("7 days of delivery");
    expect(RETURN_POSTAGE_TEXT).toContain("when the error is ours");
  });
  it("keeps the canonical INR offer understandable alongside converted prices", () => {
    expect(indiaPriceText(499)).toBe("₹499");
    expect(indiaPriceText(499.5)).toBe("₹499.5");
  });
});
