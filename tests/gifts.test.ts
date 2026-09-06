/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
const attempt = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const customer = {
  name: "Gift Test",
  email: "gift@example.com",
  phone: "9876543210",
  address_line_1: "Test road",
  city: "Delhi",
  state: "Delhi",
  postal_code: "110001",
  country: "India",
};
afterEach(() => vi.unstubAllEnvs());

async function choiceSetup() {
  const f = await setup();
  await f.t.run((ctx) => ctx.db.patch(f.giftId, { stock_quantity: 10 }));
  const choiceInput = {
    ...f.input,
    id: f.campaign.id,
    gift_product_id: undefined,
    gift_size: undefined,
    reward_mode: "choice" as const,
    reward_scope: "all" as const,
    gift_quantity: 2,
    requirements: [{ ...f.input.requirements[0], scope_type: "all" as const, product_ids: [] }],
  };
  await f.admin.mutation(api.gifts.save, choiceInput);
  const selections = [
    { campaign_id: f.campaign.id, product_id: f.productId, quantity: 1 },
    { campaign_id: f.campaign.id, product_id: f.giftId, quantity: 1, size: "2 ml" },
  ];
  return { ...f, choiceInput, selections };
}

test("buy any two supports mixed paid fragrances and two different customer-selected free gifts", async () => {
  const f = await choiceSetup();
  const mixed = [
    f.cart[0],
    { productId: f.giftId, qty: 1, name: "Sample", price: 99, selectedSize: "2 ml" },
  ].map((l) => ({ ...l, qty: 1 }));
  const preview = await f.t.query(api.gifts.evaluateCart, {
    cart: mixed.map((l) => ({ product_id: l.productId, quantity: l.qty })),
    evaluation_time: Date.now(),
    selections: f.selections,
  });
  expect(preview[0].earned).toBe(true);
  expect(preview[0].rewards).toHaveLength(2);
  await f.t.mutation(internal.orders.reserveCheckoutIntent, {
    ...f.reservation,
    cart: mixed,
    amount_paise: 59800,
    giftSelections: f.selections,
  });
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, {
    razorpay_order_id: f.reservation.razorpay_order_id,
    razorpay_payment_id: "pay_choice",
    amount_paise: 59800,
    currency: "INR",
  });
  const rows = await f.t.run((ctx) => ctx.db.query("order_items").collect());
  expect(rows.filter((r) => r.is_gift).map((r) => r.unit_price)).toEqual([0, 0]);
  expect(rows.find((r) => r.is_gift && r.product_id === f.giftId)?.selected_size).toBe("2 ml");
  expect((await f.t.run((ctx) => ctx.db.get(f.productId)))?.stock_quantity).toBe(8);
  expect((await f.t.run((ctx) => ctx.db.get(f.giftId)))?.stock_quantity).toBe(8);
});

test("two of the same gift works, repeats cannot deduct stock twice, and changed choice cannot replay", async () => {
  const f = await choiceSetup();
  const giftSelections = [{ campaign_id: f.campaign.id, product_id: f.giftId, quantity: 2 }];
  const args = { ...f.reservation, giftSelections };
  await f.t.mutation(internal.orders.reserveCheckoutIntent, args);
  await f.t.mutation(internal.orders.reserveCheckoutIntent, args);
  expect((await f.t.run((ctx) => ctx.db.get(f.giftId)))?.stock_quantity).toBe(8);
  await expect(
    f.t.mutation(internal.orders.reserveCheckoutIntent, { ...args, giftSelections: f.selections }),
  ).rejects.toThrow(/choices changed/);
  await f.t.mutation(api.orders.cancelRazorpayCheckout, {
    razorpay_order_id: args.razorpay_order_id,
    checkout_attempt_id: args.checkout_attempt_id,
  });
  expect((await f.t.run((ctx) => ctx.db.get(f.giftId)))?.stock_quantity).toBe(10);
});

test("missing, partial, excessive, invented and invalid-option choices cannot start a paid checkout", async () => {
  const f = await choiceSetup();
  for (const giftSelections of [
    [],
    f.selections.slice(0, 1),
    [...f.selections, f.selections[0]],
    [{ ...f.selections[0], product_id: "invented", quantity: 2 }],
    [{ ...f.selections[1], size: "invented", quantity: 2 }],
  ]) {
    await expect(
      f.t.mutation(internal.orders.reserveCheckoutIntent, { ...f.reservation, giftSelections }),
    ).rejects.toThrow(/Choose/);
  }
  expect((await f.t.run((ctx) => ctx.db.get(f.productId)))?.stock_quantity).toBe(10);
  expect(await f.t.run((ctx) => ctx.db.query("checkout_intents").first())).toBeNull();
});

test("selected reward pool cannot be bypassed and only paid products qualify", async () => {
  const f = await choiceSetup();
  await f.admin.mutation(api.gifts.save, {
    ...f.choiceInput,
    reward_scope: "products",
    reward_product_ids: [f.giftId],
  });
  await expect(
    f.t.mutation(internal.orders.reserveCheckoutIntent, {
      ...f.reservation,
      giftSelections: f.selections,
    }),
  ).rejects.toThrow(/Choose/);
  const preview = await f.t.query(api.gifts.evaluateCart, {
    cart: [{ product_id: f.productId, quantity: 1 }],
    evaluation_time: Date.now(),
    selections: [{ ...f.selections[1], quantity: 2 }],
  });
  expect(preview[0].eligible).toBe(false);
  expect(preview[0].earned).toBe(false);
});

test("combined paid and gift stock is checked, including split selections for the same product", async () => {
  const f = await choiceSetup();
  await f.t.run((ctx) => ctx.db.patch(f.productId, { stock_quantity: 3 }));
  await expect(
    f.t.mutation(internal.orders.reserveCheckoutIntent, {
      ...f.reservation,
      giftSelections: [f.selections[0], f.selections[0]],
    }),
  ).rejects.toThrow(/Choose/);
  expect((await f.t.run((ctx) => ctx.db.get(f.productId)))?.stock_quantity).toBe(3);
});

test("repeatable buy-two get-two caps selected rewards and validates admin quantities", async () => {
  const f = await choiceSetup();
  await f.admin.mutation(api.gifts.save, {
    ...f.choiceInput,
    repeatable: true,
    max_awards_per_order: 2,
  });
  const preview = await f.t.query(api.gifts.evaluateCart, {
    cart: [{ product_id: f.productId, quantity: 6 }],
    evaluation_time: Date.now(),
    selections: [{ ...f.selections[1], quantity: 4 }],
  });
  expect(preview[0].award_count).toBe(2);
  expect(preview[0].rewards[0].quantity).toBe(4);
  for (const quantity of [0, 1.5, 11])
    await expect(
      f.admin.mutation(api.gifts.save, { ...f.choiceInput, gift_quantity: quantity }),
    ).rejects.toThrow(/quantity/);
});

test("choice promises survive campaign edits, and captured order remains idempotent", async () => {
  const f = await choiceSetup();
  await f.t.mutation(internal.orders.reserveCheckoutIntent, {
    ...f.reservation,
    giftSelections: f.selections,
  });
  await f.admin.mutation(api.gifts.remove, { id: f.campaign.id });
  const finalize = {
    razorpay_order_id: f.reservation.razorpay_order_id,
    razorpay_payment_id: "pay_choice_snapshot",
    amount_paise: 99800,
    currency: "INR",
  };
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, finalize);
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, finalize);
  const rows = await f.t.run((ctx) => ctx.db.query("order_items").collect());
  expect(rows.filter((r) => r.is_gift)).toHaveLength(2);
  expect((await f.t.run((ctx) => ctx.db.get(f.productId)))?.stock_quantity).toBe(7);
});

test("stale selected gifts cannot disappear silently at checkout", async () => {
  const f = await choiceSetup();
  await f.admin.mutation(api.gifts.remove, { id: f.campaign.id });
  await expect(
    f.t.mutation(internal.orders.reserveCheckoutIntent, {
      ...f.reservation,
      giftSelections: f.selections,
    }),
  ).rejects.toThrow(/ended/);
});

test("gifts remain visible to admin, account owner and guest tracking", async () => {
  const f = await setup();
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reservation);
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, {
    razorpay_order_id: f.reservation.razorpay_order_id,
    razorpay_payment_id: "pay_views",
    amount_paise: 99800,
    currency: "INR",
  });
  const adminOrders = await f.admin.query(api.orders.listAll, { limit: 10 });
  expect(adminOrders[0].items.some((item: { is_gift: boolean }) => item.is_gift)).toBe(true);
  const accountOrders = await f.t
    .withIdentity({ subject: `${f.customerId}|session` })
    .query(api.orders.listMine, {});
  expect(accountOrders[0].items.some((item: { is_gift: boolean }) => item.is_gift)).toBe(true);
  const tracked = await f.t.query(api.orders.getByNumber, {
    orderNumber: adminOrders[0].order_number,
    email: customer.email,
  });
  expect(tracked?.items.some((item: { is_gift: boolean }) => item.is_gift)).toBe(true);
});

test("return restocking includes free gifts and repeated admin actions cannot double-restock", async () => {
  const f = await setup();
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reservation);
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, {
    razorpay_order_id: f.reservation.razorpay_order_id,
    razorpay_payment_id: "pay_returns",
    amount_paise: 99800,
    currency: "INR",
  });
  const order = await f.t.run((ctx) => ctx.db.query("orders").first());
  if (!order) throw new Error("Missing test order");
  await f.admin.mutation(api.orders.updateStatus, { id: order._id, status: "shipped" });
  const close = {
    id: order._id,
    outcome: "returned" as const,
    restock: true,
    reason: "All items and gift returned unopened",
  };
  await f.admin.mutation(api.orders.closeOrder, close);
  await f.admin.mutation(api.orders.closeOrder, close);
  expect((await f.t.run((ctx) => ctx.db.get(f.giftId)))?.stock_quantity).toBe(1);
  expect((await f.t.run((ctx) => ctx.db.get(f.productId)))?.stock_quantity).toBe(10);
});

async function setup() {
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
  const t = convexTest(schema, modules);
  const data = await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", { email: "admin@example.com" });
    const customerId = await ctx.db.insert("users", { email: "shopper@example.com" });
    const productId = await ctx.db.insert("products", {
      name: "Oud Zafar",
      slug: "oud-zafar",
      price: 499,
      price_inr: 499,
      stock_quantity: 10,
      is_active: true,
      in_stock: true,
    });
    const giftId = await ctx.db.insert("products", {
      name: "Sample",
      slug: "sample",
      price: 99,
      price_inr: 99,
      stock_quantity: 1,
      is_active: true,
      in_stock: true,
      size_options: ["2 ml"],
    });
    return { adminId, customerId, productId, giftId };
  });
  const admin = t.withIdentity({ subject: `${data.adminId}|test-session` });
  const input = {
    name: "Test offer",
    active: true,
    match_mode: "all" as const,
    requirements: [
      {
        label: "Buy two",
        scope_type: "products" as const,
        product_ids: [data.productId],
        collection_slugs: [],
        category_ids: [],
        required_quantity: 2,
      },
    ],
    gift_product_id: data.giftId,
    gift_quantity: 1,
    gift_size: "2 ml",
    sort_order: 1,
    priority: 1,
    combines_with_other_gifts: false,
    repeatable: false,
    max_awards_per_order: 1,
    allow_discount_codes: true,
  };
  const campaign = await admin.mutation(api.gifts.save, input);
  const cart = [{ productId: data.productId, qty: 2, name: "Oud Zafar", price: 1 }];
  const reservation = {
    razorpay_order_id: "order_gift_test",
    checkout_attempt_id: attempt,
    user_id: data.customerId,
    cart,
    customer,
    amount_paise: 99800,
  };
  return { t, admin, input, campaign, cart, reservation, ...data };
}

test("real Convex validators, admin authorization, save/reload/update/archive", async () => {
  const f = await setup();
  expect((await f.admin.query(api.gifts.listAdmin, {}))[0].id).toBe(f.campaign.id);
  await expect(f.t.query(api.gifts.listAdmin, {})).rejects.toThrow(/Authentication/);
  await expect(
    f.t.withIdentity({ subject: `${f.customerId}|session` }).mutation(api.gifts.save, f.input),
  ).rejects.toThrow(/Admin access/);
  await f.admin.mutation(api.gifts.save, { ...f.input, id: f.campaign.id, active: false });
  expect((await f.admin.query(api.gifts.listAdmin, {}))[0].active).toBe(false);
  await f.admin.mutation(api.gifts.remove, { id: f.campaign.id });
  expect((await f.admin.query(api.gifts.listAdmin, {}))[0].archived_at).toBeTruthy();
});

test("paid checkout preserves zero-price gift and only deducts once, including callback retries", async () => {
  const f = await setup();
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reservation);
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reservation);
  const args = {
    razorpay_order_id: f.reservation.razorpay_order_id,
    razorpay_payment_id: "pay_gift_test",
    amount_paise: 99800,
    currency: "INR",
  };
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, args);
  await f.t.mutation(internal.orders.finalizeCheckoutIntent, args);
  const data = await f.t.run(async (ctx) => ({
    items: await ctx.db.query("order_items").collect(),
    orders: await ctx.db.query("orders").collect(),
    gift: await ctx.db.get(f.giftId),
  }));
  expect(data.orders).toHaveLength(1);
  expect(data.orders[0].total).toBe(998);
  expect(data.orders[0].user_id).toBe(f.customerId);
  expect(data.items.filter((line) => line.is_gift)).toHaveLength(1);
  expect(data.items.find((line) => line.is_gift)).toMatchObject({
    unit_price: 0,
    subtotal: 0,
    selected_size: "2 ml",
    gift_campaign_id: f.campaign.id,
  });
  expect(data.gift?.stock_quantity).toBe(0);
});

test("second shopper cannot reserve a gift already reserved by the first", async () => {
  const f = await setup();
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reservation);
  await f.t.mutation(internal.orders.reserveCheckoutIntent, {
    ...f.reservation,
    razorpay_order_id: "order_second",
    checkout_attempt_id: "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee",
  });
  const intents = await f.t.run((ctx) => ctx.db.query("checkout_intents").collect());
  expect(intents.flatMap((intent) => intent.cart).filter((line) => line.isGift)).toHaveLength(1);
});

test("forged free-gift fields from a browser are rejected by the public validator", async () => {
  const f = await setup();
  await expect(
    f.t.query(api.orders.quoteCheckout, {
      cart: [{ ...f.cart[0], ...{ isGift: true, price: 0, giftCampaignId: f.campaign.id } }],
    }),
  ).rejects.toThrow();
});

test("admin offer test is read-only and cancellation restores the reward", async () => {
  const f = await setup();
  expect(
    (
      await f.admin.query(api.gifts.testCampaign, {
        id: f.campaign.id,
        cart: [{ product_id: f.productId, quantity: 2 }],
      })
    )?.earned,
  ).toBe(true);
  expect((await f.t.run((ctx) => ctx.db.get(f.giftId)))?.stock_quantity).toBe(1);
  await f.t.mutation(internal.orders.reserveCheckoutIntent, f.reservation);
  await f.t.mutation(api.orders.cancelRazorpayCheckout, {
    razorpay_order_id: f.reservation.razorpay_order_id,
    checkout_attempt_id: attempt,
  });
  expect((await f.t.run((ctx) => ctx.db.get(f.giftId)))?.stock_quantity).toBe(1);
  expect(await f.t.run((ctx) => ctx.db.query("orders").collect())).toHaveLength(0);
});

test("scheduled offers and legacy slug carts resolve without changing totals", async () => {
  const f = await setup();
  const now = Date.now();
  await f.admin.mutation(api.gifts.save, {
    ...f.input,
    id: f.campaign.id,
    starts_at: new Date(now + 60000).toISOString(),
    ends_at: new Date(now + 120000).toISOString(),
  });
  const query = { cart: [{ product_id: "oud-zafar", quantity: 2 }], evaluation_time: now };
  expect((await f.t.query(api.gifts.evaluateStorefront, query)).offers).toHaveLength(0);
  expect(
    (await f.t.query(api.gifts.evaluateStorefront, { ...query, evaluation_time: now + 60001 }))
      .offers[0].earned,
  ).toBe(true);
  expect(
    (await f.t.query(api.gifts.evaluateStorefront, { ...query, evaluation_time: now + 120000 }))
      .offers,
  ).toHaveLength(0);
});
