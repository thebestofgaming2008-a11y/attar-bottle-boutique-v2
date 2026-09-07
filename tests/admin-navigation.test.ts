import { describe, expect, it } from "vitest";
import { ADMIN_NAV, ADMIN_NAV_GROUPS, isComboProduct } from "../src/lib/adminNavigation";

describe("admin destinations", () => {
  it("includes every destination exactly once, without a separate allowlist", () => {
    const grouped = ADMIN_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.key));
    expect(grouped).toHaveLength(ADMIN_NAV.length);
    expect(new Set(grouped).size).toBe(ADMIN_NAV.length);
    expect([...grouped].sort()).toEqual(ADMIN_NAV.map((item) => item.key).sort());
  });

  it("exposes announcement, combos, discounts and coupons as distinct destinations", () => {
    const grouped = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
    for (const key of ["announcement", "combos", "offers", "coupons"]) {
      expect(grouped.filter((item) => item.key === key)).toHaveLength(1);
    }
    expect(grouped.find((item) => item.key === "announcement")?.group).toBe("Storefront");
    expect(grouped.find((item) => item.key === "combos")?.label).toBe("Ready-made packs");
    expect(grouped.find((item) => item.key === "offers")?.label).toBe("Build your own combo");
    expect(grouped.find((item) => item.key === "offers")?.group).toBe("Commerce");
  });

  it("lists fixed combos and multipacks without mixing in individual attars", () => {
    expect(
      [{ bundle_kind: "combo" }, { bundle_kind: "pack" }, { bundle_kind: "single" }, {}].filter(
        isComboProduct,
      ),
    ).toEqual([{ bundle_kind: "combo" }, { bundle_kind: "pack" }]);
  });
});
