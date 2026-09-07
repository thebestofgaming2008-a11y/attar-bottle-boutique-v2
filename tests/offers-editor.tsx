// In-memory UI fixture only. No production queries, mutations or payments.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { getFunctionName } from "convex/server";
import { createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { PromotionsAdmin } from "../src/components/admin/PromotionsAdmin";
import { BundleEditor } from "../src/components/admin/BundleEditor";
import { BundleBuilder } from "../src/components/store/BundleBuilder";
import { PromotionOffers } from "../src/components/store/PromotionOffers";
import { AnnouncementBanner } from "../src/components/store/AnnouncementBanner";
import { CartProvider, useCart } from "../src/components/store/CartContext";
import { CurrencyProvider } from "../src/contexts/CurrencyContext";
import { ADMIN_NAV_GROUPS } from "../src/lib/adminNavigation";
import "../src/styles.css";

const products: any[] = [
  {
    id: "oud",
    slug: "oud",
    name: "Oud Zafar",
    price_inr: 499,
    price: 499,
    stock_quantity: 10,
    in_stock: true,
    is_active: true,
    size_options: ["6 ml"],
    cover_image_url: "/src/assets/sku-oud-zafar.webp",
  },
  {
    id: "rose",
    slug: "rose",
    name: "Oud Gulaab",
    price_inr: 599,
    price: 599,
    stock_quantity: 7,
    in_stock: true,
    is_active: true,
    size_options: ["6 ml"],
    cover_image_url: "/src/assets/sku-oud-gulaab.webp",
  },
];
let settings: any = {
  draft: {
    active: true,
    tiers: [
      { quantity: 2, type: "percent", value: 10 },
      { quantity: 4, type: "fixed", value: 500 },
    ],
    product_ids: [],
    banner_active: true,
    banner_messages: ["Delivery included across India", "Mix your favourite fragrances"],
  },
};
settings.published = structuredClone(settings.draft);
let coupons: any[] = [];
const listeners = new Set<() => void>();
const cache = new Map<string, any>();
function read(name: string, args: any) {
  if (name === "promotions:adminConfig") return settings;
  if (name === "promotions:publicConfig") return settings.published;
  if (name === "promotions:listCoupons") return coupons;
  if (name === "promotions:preview") {
    const subtotal = args.cart.reduce(
      (n: number, l: any) =>
        n + (products.find((p) => p.id === l.productId)?.price_inr ?? 0) * l.qty,
      0,
    );
    const eligibleQuantity = args.cart.reduce((n: number, l: any) => n + l.qty, 0);
    const discount = eligibleQuantity >= 4 ? 500 : eligibleQuantity >= 2 ? subtotal * 0.1 : 0;
    return {
      subtotal,
      total: subtotal - discount,
      discount,
      eligibleQuantity,
      snapshot: { label: "Mix & match", discount_paise: discount * 100 },
      couponMessage: "",
      error: args.coupon ? "This coupon is unavailable or expired." : "",
    };
  }
  return null;
}
const client: any = {
  watchQuery(ref: any, args: any) {
    const name = getFunctionName(ref),
      key = name + JSON.stringify(args);
    return {
      onUpdate(cb: () => void) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      localQueryResult() {
        if (!cache.has(key)) cache.set(key, read(name, args));
        return cache.get(key);
      },
      localQueryLogs() {
        return [];
      },
      journal() {
        return undefined;
      },
    };
  },
  async mutation(ref: any, args: any) {
    const name = getFunctionName(ref);
    if (name === "promotions:saveConfig") {
      const patch =
        args.section === "announcement"
          ? {
              banner_active: args.config.banner_active,
              banner_messages: args.config.banner_messages,
            }
          : args.section === "bundles"
            ? {
                active: args.config.active,
                tiers: args.config.tiers,
                product_ids: args.config.product_ids,
              }
            : args.config;
      settings = {
        draft: { ...settings.draft, ...structuredClone(patch) },
        published: args.publish
          ? { ...settings.published, ...structuredClone(patch) }
          : settings.published,
      };
    }
    if (name === "promotions:saveCoupon")
      coupons = [
        ...coupons.filter((c) => c.id !== args.id),
        { ...args, id: args.id || "coupon-fixture", used_count: 0 },
      ];
    cache.clear();
    listeners.forEach((cb) => cb());
    return null;
  },
};
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const url = String(input);
  if (url.includes("example.convex.cloud"))
    return Response.json({ status: "success", value: products });
  if (url.includes("/api/catalog/products")) return Response.json(products);
  if (url.includes("/api/geo")) return Response.json({ country: "IN", currency: "INR" });
  if (url.includes("/api/rates"))
    return Response.json({ base: "INR", source: "exchangerate-api.com", rates: { INR: 1 } });
  return originalFetch(input, init);
};
function Customer() {
  const cart = useCart();
  return (
    <>
      <BundleBuilder initialProductId="oud" />
      <p role="status">Cart: {cart.count} attars</p>
      <PromotionOffers />
    </>
  );
}
function Fixture() {
  const [form, setForm] = useState<any>({ bundle_kind: "combo", bundle_items: [] });
  const [tab, setTab] = useState("offers");
  return (
    <ConvexProvider client={client}>
      <CurrencyProvider>
        <CartProvider>
          <AnnouncementBanner />
          <main className="mx-auto max-w-4xl px-4 pb-16 pt-14">
            <nav className="mb-6 flex flex-wrap gap-3">
              {ADMIN_NAV_GROUPS.flatMap((group) => group.items)
                .filter((item) =>
                  ["offers", "coupons", "announcement", "combos"].includes(item.key),
                )
                .map(({ key, label }) => (
                  <button
                    key={key}
                    className="border border-black px-3 py-2"
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              <button className="border border-black px-3 py-2" onClick={() => setTab("customer")}>
                Customer preview
              </button>
            </nav>
            {tab === "offers" || tab === "coupons" || tab === "announcement" ? (
              <PromotionsAdmin
                key={tab}
                products={products}
                section={tab === "offers" ? "bundles" : tab}
              />
            ) : tab === "combos" ? (
              <BundleEditor
                products={products}
                kind={form.bundle_kind}
                items={form.bundle_items}
                onChange={(patch) => setForm({ ...form, ...patch })}
              />
            ) : (
              <Customer />
            )}
          </main>
          <Toaster />
        </CartProvider>
      </CurrencyProvider>
    </ConvexProvider>
  );
}
const rootRoute = createRootRoute({ component: Fixture });
const router = createRouter({ routeTree: rootRoute });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
