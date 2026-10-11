import { describe, expect, it } from "vitest";
import {
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
  it("does not invent transit time or unrestricted free returns", () => {
    expect(shippingDetails().deliveryTime).not.toHaveProperty("transitTime");
    expect(merchantReturnPolicy("https://houseofbadr.com")).toEqual({
      "@type": "MerchantReturnPolicy",
      "@id": "https://houseofbadr.com/returns#policy",
      merchantReturnLink: "https://houseofbadr.com/returns",
    });
    expect(RETURN_ISSUE_TEXT).toContain("7 days of delivery");
    expect(RETURN_POSTAGE_TEXT).toContain("when the error is ours");
  });
  it("keeps the canonical INR offer understandable alongside converted prices", () => {
    expect(indiaPriceText(499)).toBe("₹499");
    expect(indiaPriceText(499.5)).toBe("₹499.5");
  });
});
