/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
const old = {
  keyId: "rzp_live_old",
  keySecret: "old-api-fixture",
  webhookSecrets: ["old-webhook-fixture-secret"],
};
const next = {
  keyId: "rzp_live_new",
  keySecret: "new-api-fixture",
  webhookSecrets: ["new-webhook-fixture-secret"],
  merchantId: "newmerchant",
};
const config = { activeKeyId: next.keyId, legacyKeyId: old.keyId, accounts: [old, next] };
const customer = {
  name: "Fixture Buyer",
  email: "buyer@example.com",
  phone: "919876543210",
  address_line_1: "Fixture address",
  city: "Delhi",
  state: "Delhi",
  postal_code: "110001",
  country: "IN",
};
const attempt = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function setup(keyId?: string) {
  vi.stubEnv("RAZORPAY_MERCHANT_CONFIG", JSON.stringify(config));
  vi.stubEnv("PUBLIC_SITE_URL", "https://houseofbadr.com");
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const productId = await ctx.db.insert("products", {
      name: "Fixture attar",
      price: 499,
      price_inr: 499,
      stock_quantity: 9,
      in_stock: true,
      is_active: true,
    });
    const adminId = await ctx.db.insert("users", { email: "admin@example.com" });
    const cart = [{ productId, name: "Fixture attar", qty: 1, price: 499, priceInr: 499 }];
    const intentId = await ctx.db.insert("checkout_intents", {
      ...(keyId ? { razorpay_key_id: keyId } : {}),
      razorpay_order_id: "order_fixture",
      checkout_attempt_id: attempt,
      cart,
      customer,
      status: "pending",
      stock_reserved: true,
      amount_paise: 49900,
      expires_at: Date.now() + 600000,
      reconcile_after: Date.now() - 1000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { productId, adminId, cart, intentId };
  });
  return { t, ...fixture };
}
const payment = {
  id: "pay_fixture",
  order_id: "order_fixture",
  status: "captured",
  amount: 49900,
  currency: "INR",
};
function mockApi(account: typeof old, status = "captured") {
  const requests: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      expect(new Headers(init.headers).get("authorization")).toBe(
        `Basic ${btoa(`${account.keyId}:${account.keySecret}`)}`,
      );
      requests.push(url);
      if (url.endsWith("/capture")) return Response.json(payment);
      if (url.endsWith("/refund")) return Response.json({ id: "rfnd_fixture", status: "pending" });
      if (url.endsWith("/payments")) return Response.json({ items: [{ ...payment, status }] });
      if (url.includes("/payments/")) return Response.json({ ...payment, status });
      return Response.json({ id: "order_fixture", amount: 49900, currency: "INR" });
    }),
  );
  return requests;
}
async function webhook(
  t: Awaited<ReturnType<typeof setup>>["t"],
  account: typeof old,
  event: string,
  payload: object,
  id = crypto.randomUUID(),
) {
  const body = JSON.stringify({ event, payload });
  return t.fetch("/razorpay/webhook", {
    method: "POST",
    body,
    headers: {
      "x-razorpay-event-id": id,
      "x-razorpay-signature": await hmac(account.webhookSecrets[0], body),
    },
  });
}

test.each([undefined, next.keyId])(
  "callback routes %s checkout to its original merchant and saves one order",
  async (keyId) => {
    const h = await setup(keyId);
    const account = keyId ? next : old;
    mockApi(account, "authorized");
    const args = {
      cart: h.cart,
      customer,
      subtotal: 499,
      shipping: 0,
      total: 499,
      razorpay_order_id: "order_fixture",
      razorpay_payment_id: payment.id,
      razorpay_signature: await hmac(account.keySecret, `order_fixture|${payment.id}`),
    };
    await h.t.action(api.orders.verifyRazorpayPayment, args);
    await h.t.action(api.orders.verifyRazorpayPayment, args);
    const saved = await h.t.run((ctx) => ctx.db.query("orders").take(10));
    expect(saved).toHaveLength(1);
    expect(saved[0].razorpay_key_id).toBe(account.keyId);
    expect(saved[0].payment_status).toBe("paid");
    expect((await h.t.run((ctx) => ctx.db.get(h.productId)))?.stock_quantity).toBe(9);
  },
);

test("reusing an old checkout after cutover returns the OLD public key", async () => {
  const h = await setup();
  const result = await h.t.action(api.orders.createRazorpayCheckoutOrder, {
    cart: h.cart,
    customer,
    subtotal: 499,
    shipping: 0,
    total: 499,
    checkoutAttemptId: attempt,
    turnstileToken: "not-used-for-replay",
  });
  expect(result.keyId).toBe(old.keyId);
});

test("fresh checkout uses the new key and records it with the reserved server total", async () => {
  const h = await setup();
  vi.stubEnv("TURNSTILE_SECRET_KEY", "fixture-turnstile");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes("siteverify")) return Response.json({ success: true, action: "checkout" });
      expect(new Headers(init.headers).get("authorization")).toBe(
        `Basic ${btoa(`${next.keyId}:${next.keySecret}`)}`,
      );
      const sent = JSON.parse(init.body as string);
      expect(sent.amount).toBe(49900);
      return Response.json({ id: "order_new", amount: sent.amount, currency: sent.currency });
    }),
  );
  const result = await h.t.action(api.orders.createRazorpayCheckoutOrder, {
    cart: h.cart,
    customer,
    subtotal: 1,
    shipping: 0,
    total: 1,
    checkoutAttemptId: "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
    turnstileToken: "fixture",
  });
  expect(result.keyId).toBe(next.keyId);
  expect(result.amount).toBe(49900);
  const saved = await h.t.query(internal.orders.findCheckoutIntent, {
    razorpay_order_id: "order_new",
  });
  expect(saved.razorpay_key_id).toBe(next.keyId);
});

test.each([undefined, next.keyId])(
  "captured webhook for %s checkout is idempotent and rejects another merchant",
  async (keyId) => {
    const h = await setup(keyId);
    const account = keyId ? next : old;
    const wrong = keyId ? old : next;
    const payload = { payment: { entity: payment } };
    expect((await webhook(h.t, wrong, "payment.captured", payload)).status).toBe(400);
    expect((await webhook(h.t, account, "payment.captured", payload, "event_fixture")).status).toBe(
      200,
    );
    expect((await webhook(h.t, account, "payment.captured", payload, "event_fixture")).status).toBe(
      200,
    );
    expect(await h.t.run((ctx) => ctx.db.query("orders").take(10))).toHaveLength(1);
  },
);

test.each([undefined, next.keyId])("order.paid fallback fetch uses %s merchant", async (keyId) => {
  const h = await setup(keyId);
  const account = keyId ? next : old;
  mockApi(account);
  expect(
    (await webhook(h.t, account, "order.paid", { order: { entity: { id: "order_fixture" } } }))
      .status,
  ).toBe(200);
});

test("old browser-closed payment is recovered with old API credentials", async () => {
  const h = await setup();
  mockApi(old);
  const result = await h.t.action(internal.orders.reconcileCapturedPayments, {});
  expect(result.finalized).toBe(1);
  expect(result.errors).toEqual([]);
});

test.each([undefined, next.keyId])(
  "admin refund and refund webhook use the owning %s merchant",
  async (keyId) => {
    const h = await setup(keyId);
    const account = keyId ? next : old;
    await webhook(h.t, account, "payment.captured", { payment: { entity: payment } });
    const saved = await h.t.run((ctx) => ctx.db.query("orders").first());
    mockApi(account);
    const admin = h.t.withIdentity({ subject: `${h.adminId}|fixture`, email: "admin@example.com" });
    const result = await admin.action(api.orders.refundOrder, {
      orderId: saved!._id,
      amountInr: 499,
      reason: "Fixture test only",
    });
    expect(result.status).toBe("pending");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        expect(new Headers(init.headers).get("authorization")).toBe(
          `Basic ${btoa(`${account.keyId}:${account.keySecret}`)}`,
        );
        return Response.json({ ...payment, status: "refunded", amount_refunded: 49900 });
      }),
    );
    expect(
      (
        await webhook(h.t, account, "refund.processed", {
          refund: { entity: { id: "rfnd_fixture", payment_id: payment.id } },
        })
      ).status,
    ).toBe(200);
    expect((await h.t.run((ctx) => ctx.db.get(saved!._id)))?.payment_status).toBe("refunded");
  },
);

test("daily audit checks both merchants even when the old API is unavailable", async () => {
  const h = await setup(next.keyId);
  const seen: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      const auth = new Headers(init.headers).get("authorization")!;
      seen.push(auth);
      if (auth === `Basic ${btoa(`${old.keyId}:${old.keySecret}`)}`)
        return Response.json(
          { error: { description: "Old account unavailable" } },
          { status: 401 },
        );
      return Response.json({ items: [payment] });
    }),
  );
  const result = await h.t.action(internal.orders.auditRecentRazorpayPayments, {});
  expect(seen).toHaveLength(2);
  expect(result.recovered).toBe(1);
  expect(result.errors).toHaveLength(1);
});

test("bad signature, unsigned request and signed foreign account create no orders", async () => {
  const h = await setup(next.keyId);
  expect((await h.t.fetch("/razorpay/webhook", { method: "POST", body: "{}" })).status).toBe(401);
  const body = JSON.stringify({
    account_id: "acc_foreign",
    event: "payment.captured",
    payload: { payment: { entity: payment } },
  });
  expect(
    (
      await h.t.fetch("/razorpay/webhook", {
        method: "POST",
        body,
        headers: {
          "x-razorpay-event-id": "foreign",
          "x-razorpay-signature": await hmac(next.webhookSecrets[0], body),
        },
      })
    ).status,
  ).toBe(400);
  expect(await h.t.run((ctx) => ctx.db.query("orders").take(10))).toEqual([]);
});
