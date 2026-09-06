/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
const giftDefaults = {
  priority: 0,
  combines_with_other_gifts: false,
  repeatable: false,
  max_awards_per_order: 1,
  allow_discount_codes: true,
};
afterEach(() => vi.unstubAllEnvs());
const customer = {
  name: "Regression customer",
  email: "regression@example.com",
  phone: "9876543210",
  address_line_1: "Test road",
  city: "Delhi",
  state: "Delhi",
  postal_code: "110001",
  country: "India",
};
const config = {
  active: true,
  tiers: [
    { quantity: 2, type: "percent" as const, value: 10 },
    { quantity: 4, type: "fixed" as const, value: 500 },
  ],
  product_ids: [],
  banner_active: false,
  banner_messages: [],
};

async function setup() {
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", { email: "admin@example.com" });
    const a = await ctx.db.insert("products", {
      name: "Oud",
      slug: "oud",
      price: 499,
      price_inr: 499,
      stock_quantity: 10,
      in_stock: true,
      is_active: true,
      size_options: ["6 ml"],
      description: "Oud",
      cover_image_url: "/images/oud.webp",
    });
    const b = await ctx.db.insert("products", {
      name: "Rose",
      slug: "rose",
      price: 599,
      price_inr: 599,
      stock_quantity: 7,
      in_stock: true,
      is_active: true,
      description: "Rose",
      cover_image_url: "/images/rose.webp",
    });
    return { adminId, a, b };
  });
  const admin = t.withIdentity({ subject: `${ids.adminId}|test-session` });
  const input = {
    name: "Pair",
    slug: "pair",
    price_inr: 899,
    is_active: true,
    bundle_kind: "combo" as const,
    bundle_items: [
      { product_id: ids.a, quantity: 1, selected_size: "6 ml" },
      { product_id: ids.b, quantity: 1 },
    ],
    description: "Two fragrances",
    cover_image_url: "/images/pair.webp",
  };
  const created = await admin.mutation(api.products.createProduct, input);
  const comboId = created!.id;
  const cart = [{ productId: comboId, qty: 1, name: "Forged name", price: 1 }];
  const reserve = {
    cart,
    customer,
    razorpay_order_id: "order_regression",
    checkout_attempt_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    amount_paise: 89900,
  };
  const capture = {
    razorpay_order_id: reserve.razorpay_order_id,
    razorpay_payment_id: "pay_regression",
    amount_paise: reserve.amount_paise,
    currency: "INR",
  };
  const coupon = {
    code: "CREATOR",
    label: "Creator A",
    type: "percent" as const,
    value: 20,
    active: true,
    minimum_subtotal_inr: 0,
    ends_at: "",
  };
  return { t, admin, ...ids, input, comboId, cart, reserve, capture, coupon };
}

test("fixed combo admin create/read/save/archive and derived availability", async () => {
  const f = await setup();
  expect((await f.t.query(api.products.getProductById, { id: f.comboId }))?.stock_quantity).toBe(7);
  await f.t.run((ctx) => ctx.db.patch(f.b, { stock_quantity: 2 }));
  expect((await f.t.query(api.products.getProductBySlug, { slug: "pair" }))?.stock_quantity).toBe(
    2,
  );
  expect(
    (await f.t.query(api.products.listActiveProducts, {})).find((p) => p.id === f.comboId)
      ?.bundle_contents,
  ).toHaveLength(2);
  await f.admin.mutation(api.products.updateProduct, { id: f.comboId, patch: { price_inr: 849 } });
  expect((await f.t.query(api.orders.quoteCheckout, { cart: f.cart })).amountPaise).toBe(84900);
  await f.admin.mutation(api.products.deleteProduct, { id: f.comboId });
  await expect(f.t.query(api.orders.quoteCheckout, { cart: f.cart })).rejects.toThrow(
    /no longer available/,
  );
});
test("multipack validates quantity and divides stock by the bottle count", async () => {
  const f = await setup();
  const pack = await f.admin.mutation(api.products.createProduct, {
    ...f.input,
    slug: "trio",
    bundle_kind: "pack",
    bundle_items: [{ product_id: f.a, quantity: 3, selected_size: "6 ml" }],
  });
  expect(pack?.stock_quantity).toBe(3);
  await expect(
    f.admin.mutation(api.products.createProduct, { ...f.input, slug: "bad", bundle_kind: "pack" }),
  ).rejects.toThrow(/one product/);
  for (const quantity of [0, -1, 1.5, 25])
    await expect(
      f.admin.mutation(api.products.createProduct, {
        ...f.input,
        slug: "bad",
        bundle_items: [
          { product_id: f.a, quantity, selected_size: "6 ml" },
          { product_id: f.b, quantity: 1 },
        ],
      }),
    ).rejects.toThrow();
});
test("missing options, nested bundles and format conversion are rejected", async () => {
  const f = await setup();
  await expect(
    f.admin.mutation(api.products.createProduct, {
      ...f.input,
      slug: "missing",
      bundle_items: [
        { product_id: f.a, quantity: 1 },
        { product_id: f.b, quantity: 1 },
      ],
    }),
  ).rejects.toThrow(/size/);
  await expect(
    f.admin.mutation(api.products.createProduct, {
      ...f.input,
      slug: "nested",
      bundle_items: [
        { product_id: f.comboId, quantity: 1 },
        { product_id: f.b, quantity: 1 },
      ],
    }),
  ).rejects.toThrow(/individual products/);
  await expect(
    f.admin.mutation(api.products.updateProduct, {
      id: f.a,
      patch: { bundle_kind: "pack", bundle_items: [{ product_id: f.b, quantity: 2 }] },
    }),
  ).rejects.toThrow(/new product/);
});
test("removed component options disable the pack without crashing the catalogue", async () => {
  const f = await setup();
  await f.t.run((ctx) => ctx.db.patch(f.a, { size_options: ["3 ml"] }));
  expect((await f.t.query(api.products.getProductById, { id: f.comboId }))?.in_stock).toBe(false);
  expect((await f.t.query(api.products.listActiveProducts, {})).length).toBe(3);
  await expect(f.t.query(api.orders.quoteCheckout, { cart: f.cart })).rejects.toThrow(/size/);
});
test("bundle and individual purchases share aggregate stock and cannot oversell", async () => {
  const f = await setup();
  const cart = [
    ...f.cart.map((l) => ({ ...l, qty: 7 })),
    { productId: f.b, qty: 1, name: "Rose", price: 599 },
  ];
  await expect(f.t.query(api.orders.quoteCheckout, { cart })).rejects.toThrow(/stock/);
  await expect(
    f.t.mutation(internal.orders.reserveCheckoutIntent, { ...f.reserve, cart }),
  ).rejects.toThrow(/stock/);
  expect((await f.t.run((ctx) => ctx.db.get(f.b)))?.stock_quantity).toBe(7);
});
test("pack reservation/capture is idempotent and snapshots survive edits", async () => {
  const f = await setup();
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reserve);
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reserve);
  expect((await f.t.run((ctx) => ctx.db.get(f.a)))?.stock_quantity).toBe(9);
  await f.admin.mutation(api.products.updateProduct, {
    id: f.comboId,
    patch: {
      price_inr: 1099,
      bundle_items: [
        { product_id: f.a, quantity: 2, selected_size: "6 ml" },
        { product_id: f.b, quantity: 2 },
      ],
    },
  });
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, f.capture);
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, f.capture);
  const item = await f.t.run((ctx) => ctx.db.query("order_items").first());
  expect(item?.unit_price).toBe(899);
  expect(item?.bundle_contents?.map((p) => p.quantity)).toEqual([1, 1]);
  expect((await f.t.run((ctx) => ctx.db.get(f.b)))?.stock_quantity).toBe(6);
  expect(await f.t.run((ctx) => ctx.db.query("orders").collect())).toHaveLength(1);
});
test("cancel and late capture restore/deduct original components even after pack edits", async () => {
  const f = await setup();
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reserve);
  await f.admin.mutation(api.products.updateProduct, {
    id: f.comboId,
    patch: {
      bundle_items: [
        { product_id: f.a, quantity: 2, selected_size: "6 ml" },
        { product_id: f.b, quantity: 2 },
      ],
    },
  });
  const cancel = {
    razorpay_order_id: f.reserve.razorpay_order_id,
    checkout_attempt_id: f.reserve.checkout_attempt_id,
  };
  await f.t.mutation(api.orders.cancelRazorpayCheckout, cancel);
  await f.t.mutation(api.orders.cancelRazorpayCheckout, cancel);
  expect((await f.t.run((ctx) => ctx.db.get(f.a)))?.stock_quantity).toBe(10);
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, f.capture);
  expect((await f.t.run((ctx) => ctx.db.get(f.a)))?.stock_quantity).toBe(9);
});
test("admin return restocks original pack components exactly once", async () => {
  const f = await setup();
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reserve);
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, f.capture);
  const order = await f.t.run((ctx) => ctx.db.query("orders").first());
  await f.admin.mutation(api.orders.updateStatus, { id: order!._id, status: "shipped" });
  const close = {
    id: order!._id,
    outcome: "returned" as const,
    restock: true,
    reason: "Unopened return",
  };
  await f.admin.mutation(api.orders.closeOrder, close);
  await f.admin.mutation(api.orders.closeOrder, close);
  expect((await f.t.run((ctx) => ctx.db.get(f.a)))?.stock_quantity).toBe(10);
  expect((await f.t.run((ctx) => ctx.db.get(f.b)))?.stock_quantity).toBe(7);
});
test("publishing is explicit; saved promotion drafts do not change live prices", async () => {
  const f = await setup();
  await f.admin.mutation(api.promotions.saveConfig, { config, publish: false });
  expect((await f.t.query(api.promotions.publicConfig, {})).active).toBe(false);
  await f.admin.mutation(api.promotions.saveConfig, { config, publish: true });
  expect((await f.t.query(api.promotions.publicConfig, {})).active).toBe(true);
  await f.admin.mutation(api.promotions.saveConfig, {
    config: { ...config, active: false },
    publish: false,
  });
  expect((await f.t.query(api.promotions.publicConfig, {})).active).toBe(true);
});
test("mix-and-match tiers use server prices, highest savings, and exclude fixed packs", async () => {
  const f = await setup();
  await f.admin.mutation(api.promotions.saveConfig, { config, publish: true });
  const cart = [
    { productId: f.a, qty: 1, name: "fake", price: 1, selectedSize: "6 ml" },
    { productId: f.b, qty: 1, name: "fake", price: 1 },
  ];
  const quote = await f.t.query(api.orders.quoteCheckout, { cart });
  expect(quote.amountPaise).toBe(98820);
  expect(quote.discount).toBe(109.8);
  expect((await f.t.query(api.orders.quoteCheckout, { cart: f.cart })).discount).toBe(0);
  expect(
    (await f.t.query(api.orders.quoteCheckout, { cart: cart.map((l) => ({ ...l, qty: 2 })) }))
      .discount,
  ).toBe(500);
});
test("coupons select the better discount without stacking and normalize case", async () => {
  const f = await setup();
  await f.admin.mutation(api.promotions.saveConfig, { config, publish: true });
  await f.admin.mutation(api.promotions.saveCoupon, f.coupon);
  const cart = [{ productId: f.b, qty: 2, name: "Rose", price: 1 }];
  const quote = await f.t.query(api.orders.quoteCheckout, { cart, coupon: " creator " });
  expect(quote.discount).toBe(239.6);
  expect(quote.pricingSnapshot.coupon_code).toBe("CREATOR");
  const best = await f.t.query(api.orders.quoteCheckout, {
    cart: [{ ...cart[0], qty: 4 }],
    coupon: "CREATOR",
  });
  expect(best.discount).toBe(500);
  expect(best.pricingSnapshot.coupon_id).toBeUndefined();
});
test("coupon expiry, minimum spend, inactive and invalid codes fail before reservation", async () => {
  const f = await setup();
  const id = await f.admin.mutation(api.promotions.saveCoupon, {
    ...f.coupon,
    minimum_subtotal_inr: 1000,
  });
  await expect(
    f.t.query(api.orders.quoteCheckout, { cart: f.cart, coupon: "CREATOR" }),
  ).rejects.toThrow(/subtotal/);
  for (const patch of [
    { active: false, minimum_subtotal_inr: 0 },
    { active: true, minimum_subtotal_inr: 0, ends_at: "2000-01-01T00:00:00Z" },
  ]) {
    await f.t.run((ctx) => ctx.db.patch(id, patch));
    await expect(
      f.t.query(api.orders.quoteCheckout, { cart: f.cart, coupon: "CREATOR" }),
    ).rejects.toThrow(/unavailable/);
  }
  await expect(
    f.t.mutation(internal.orders.reserveCheckoutIntent, { ...f.reserve, coupon: "FAKE" }),
  ).rejects.toThrow();
  expect(await f.t.run((ctx) => ctx.db.query("checkout_intents").first())).toBeNull();
});
test("paid coupon snapshot survives expiry/price edits; paid uses counted once", async () => {
  const f = await setup();
  const id = await f.admin.mutation(api.promotions.saveCoupon, f.coupon);
  const args = { ...f.reserve, coupon: "CREATOR", amount_paise: 71920 };
  await f.t.mutation(internal.orders.reserveCheckoutIntent, args);
  await f.t.mutation(internal.orders.reserveCheckoutIntent, args);
  await f.t.run((ctx) => ctx.db.patch(id, { active: false, value: 1 }));
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, { ...f.capture, amount_paise: 71920 });
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, { ...f.capture, amount_paise: 71920 });
  const order = await f.t.run((ctx) => ctx.db.query("orders").first());
  expect(order?.total).toBe(719.2);
  expect(order?.subtotal).toBe(899);
  expect(order?.discount).toBe(179.8);
  expect((await f.t.run((ctx) => ctx.db.get(id)))?.used_count).toBe(1);
});
test("changed coupon cannot replay a checkout; incorrect discounted capture is rejected", async () => {
  const f = await setup();
  await f.admin.mutation(api.promotions.saveCoupon, f.coupon);
  await f.t.mutation(internal.orders.reserveCheckoutIntent, {
    ...f.reserve,
    coupon: "CREATOR",
    amount_paise: 71920,
  });
  await expect(f.t.mutation(internal.orders.reserveCheckoutIntent, f.reserve)).rejects.toThrow(
    /Coupon changed/,
  );
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, f.capture);
  expect(await f.t.run((ctx) => ctx.db.query("orders").first())).toBeNull();
});
test("free gifts account for bottles inside a purchased bundle and cannot oversell", async () => {
  const f = await setup();
  await f.t.run((ctx) => ctx.db.patch(f.b, { stock_quantity: 1 }));
  await f.admin.mutation(api.gifts.save, {
    ...giftDefaults,
    name: "Free Rose",
    active: true,
    match_mode: "all",
    requirements: [
      {
        label: "Any purchase",
        scope_type: "all",
        product_ids: [],
        collection_slugs: [],
        required_quantity: 1,
      },
    ],
    gift_product_id: f.b,
    gift_quantity: 1,
    sort_order: 0,
  });
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reserve);
  const intent = await f.t.run((ctx) => ctx.db.query("checkout_intents").first());
  expect(intent?.cart.filter((l) => l.isGift)).toHaveLength(0);
  expect((await f.t.run((ctx) => ctx.db.get(f.b)))?.stock_quantity).toBe(0);
});
test("gifts respect coupon exclusions while automatic quantity offers combine", async () => {
  const f = await setup();
  await f.admin.mutation(api.promotions.saveCoupon, f.coupon);
  await f.admin.mutation(api.promotions.saveConfig, { config, publish: true });
  await f.admin.mutation(api.gifts.save, {
    ...giftDefaults,
    name: "Gift without coupon",
    active: true,
    match_mode: "all",
    requirements: [
      {
        label: "Two",
        scope_type: "all",
        product_ids: [],
        collection_slugs: [],
        required_quantity: 2,
      },
    ],
    gift_product_id: f.b,
    gift_quantity: 1,
    sort_order: 0,
    allow_discount_codes: false,
  });
  const cart = [{ productId: f.a, qty: 2, name: "Oud", price: 1, selectedSize: "6 ml" }];
  await f.t.mutation(internal.orders.reserveCheckoutIntent, {
    ...f.reserve,
    cart,
    amount_paise: 89820,
  });
  expect(
    (await f.t.run((ctx) => ctx.db.query("checkout_intents").first()))?.cart.filter(
      (l) => l.isGift,
    ),
  ).toHaveLength(1);
  await f.t.mutation(api.orders.cancelRazorpayCheckout, {
    razorpay_order_id: f.reserve.razorpay_order_id,
    checkout_attempt_id: f.reserve.checkout_attempt_id,
  });
  await f.t.mutation(internal.orders.reserveCheckoutIntent, {
    ...f.reserve,
    razorpay_order_id: "order_coupon",
    checkout_attempt_id: "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
    cart,
    coupon: "CREATOR",
    amount_paise: 79840,
  });
  const intents = await f.t.run((ctx) => ctx.db.query("checkout_intents").collect());
  expect(
    intents.find((i) => i.razorpay_order_id === "order_coupon")?.cart.filter((l) => l.isGift),
  ).toHaveLength(0);
});
test("anonymous/non-admin cannot change products, offers or coupons", async () => {
  const f = await setup();
  await expect(f.t.mutation(api.products.createProduct, f.input)).rejects.toThrow(/Authentication/);
  await expect(f.t.mutation(api.promotions.saveConfig, { config, publish: true })).rejects.toThrow(
    /Authentication/,
  );
  await expect(f.t.mutation(api.promotions.saveCoupon, f.coupon)).rejects.toThrow(/Authentication/);
  await expect(f.t.query(api.promotions.listCoupons, {})).rejects.toThrow(/Authentication/);
});
test("invalid promotion configuration and duplicate coupon codes cannot publish", async () => {
  const f = await setup();
  for (const tiers of [
    [{ quantity: 1, type: "percent" as const, value: 10 }],
    [{ quantity: 2, type: "percent" as const, value: 100 }],
    [config.tiers[0], config.tiers[0]],
  ])
    await expect(
      f.admin.mutation(api.promotions.saveConfig, { config: { ...config, tiers }, publish: true }),
    ).rejects.toThrow();
  await f.admin.mutation(api.promotions.saveCoupon, f.coupon);
  await expect(f.admin.mutation(api.promotions.saveCoupon, f.coupon)).rejects.toThrow(
    /already exists/,
  );
});
