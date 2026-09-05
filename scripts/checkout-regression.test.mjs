import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { ConvexError } from "convex/values";
import { createHmac, webcrypto } from "node:crypto";
import {
  cartFingerprint,
  readPendingPayment,
  PAYMENT_RECOVERY_KEY,
} from "../src/lib/checkoutRecovery.ts";

function compileModule(path, globals = {}, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    exports,
    setTimeout,
    clearTimeout,
    ...globals,
    require: (id) => {
      if (!(id in imports)) throw new Error(`Unexpected import: ${id}`);
      return imports[id];
    },
  });
  return exports;
}

function scriptHarness() {
  const scripts = [];
  class Script extends EventTarget {
    remove() {
      scripts.splice(scripts.indexOf(this), 1);
    }
  }
  const document = {
    querySelector: () => scripts[0] || null,
    createElement: () => new Script(),
    head: { appendChild: (script) => scripts.push(script) },
  };
  return { scripts, ...compileModule("../src/lib/checkoutScript.ts", { document }) };
}

test("failed payment script preload can be retried successfully", async () => {
  const h = scriptHarness();
  let ready = false;
  const first = h.loadCheckoutScript("https://example.com/script", () => ready, "failed");
  h.scripts[0].dispatchEvent(new Event("error"));
  await assert.rejects(first, /failed/);
  assert.equal(h.scripts.length, 0);
  const retry = h.loadCheckoutScript("https://example.com/script", () => ready, "failed");
  ready = true;
  h.scripts[0].dispatchEvent(new Event("load"));
  await retry;
});

test("concurrent payment script loads share a single promise and script", async () => {
  const h = scriptHarness();
  let ready = false;
  const one = h.loadCheckoutScript("one", () => ready, "failed");
  const two = h.loadCheckoutScript("one", () => ready, "failed");
  assert.equal(one, two);
  assert.equal(h.scripts.length, 1);
  ready = true;
  h.scripts[0].dispatchEvent(new Event("load"));
  await one;
});

test("unresponsive script times out and does not poison the next attempt", async () => {
  const h = scriptHarness();
  await assert.rejects(
    h.loadCheckoutScript("one", () => false, "timeout", 5),
    /timeout/,
  );
  assert.equal(h.scripts.length, 0);
});

test("load event without gateway SDK is rejected", async () => {
  const h = scriptHarness();
  const load = h.loadCheckoutScript("one", () => false, "missing SDK");
  h.scripts[0].dispatchEvent(new Event("load"));
  await assert.rejects(load, /missing SDK/);
});

const payment = {
  orderId: "order_example",
  attemptId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  email: "test@example.com",
  cartFingerprint: "[]",
  createdAt: 100,
};
test("interrupted checkout survives reload using session storage", () => {
  assert.deepEqual(
    readPendingPayment(
      { getItem: (key) => (key === PAYMENT_RECOVERY_KEY ? JSON.stringify(payment) : null) },
      200,
    ),
    payment,
  );
});
test("malformed, expired and unavailable recovery storage are harmless", () => {
  for (const data of [
    "bad JSON",
    "null",
    JSON.stringify({ ...payment, attemptId: "bad" }),
    JSON.stringify({ ...payment, createdAt: -86400000 }),
  ]) {
    assert.equal(readPendingPayment({ getItem: () => data }, 200), null);
  }
  assert.equal(
    readPendingPayment({
      getItem: () => {
        throw new Error("denied");
      },
    }),
    null,
  );
});
test("cart comparison preserves subsequently changed cart contents", () => {
  assert.equal(
    cartFingerprint([
      { id: "a", qty: 1 },
      { id: "b", qty: 2 },
    ]),
    cartFingerprint([
      { id: "b", qty: 2 },
      { id: "a", qty: 1 },
    ]),
  );
  assert.notEqual(cartFingerprint([{ id: "a", qty: 1 }]), cartFingerprint([{ id: "a", qty: 2 }]));
});

const register = (definition) => definition;
const validators = new Proxy({}, { get: () => () => ({}) });
const backend = compileModule(
  "../convex/orders.ts",
  {
    process: {
      env: {
        RAZORPAY_KEY_ID: "rzp_test_unit",
        RAZORPAY_KEY_SECRET: "unit-secret",
        RAZORPAY_WEBHOOK_SECRET: "unit-webhook",
      },
    },
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    Response,
    Request,
    btoa,
    fetch: async () => {
      throw new Error("External requests forbidden in unit tests");
    },
  },
  {
    "convex/values": { v: validators, ConvexError },
    "@convex-dev/auth/server": {},
    "./_generated/server": Object.fromEntries(
      [
        "query",
        "mutation",
        "action",
        "httpAction",
        "internalQuery",
        "internalMutation",
        "internalAction",
      ].map((name) => [name, register]),
    ),
    "./_generated/api": {
      api: { orders: new Proxy({}, { get: (_, key) => key }) },
      internal: { orders: new Proxy({}, { get: (_, key) => key }) },
    },
    "./lib": { nowIso: () => new Date().toISOString(), publicOrder: (order) => order },
    "./shipping": {
      checkoutShippingForCountry: () => ({
        countryType: "india",
        amount: 0,
        paymentStatus: "included",
        note: "Included",
      }),
    },
  },
);
function database(intent, order = null) {
  const reads = [];
  return {
    reads,
    db: {
      query: (table) => ({
        withIndex: (index, callback) => {
          callback({
            eq: (field, value) => {
              reads.push({ table, index, field, value });
            },
          });
          return { first: async () => (table === "orders" ? order : intent) };
        },
      }),
    },
  };
}
const statusArgs = { razorpay_order_id: payment.orderId, checkout_attempt_id: payment.attemptId };
test("recovery refuses a valid order ID with the wrong guest capability", async () => {
  const db = database({ checkout_attempt_id: "another", status: "completed" });
  assert.equal(await backend.checkoutStatus.handler(db, statusArgs), null);
  assert.equal(db.reads.length, 1);
});
test("recovery refuses invalid capability before database access", async () => {
  const db = database(null);
  assert.equal(
    await backend.checkoutStatus.handler(db, { ...statusArgs, checkout_attempt_id: "bad" }),
    null,
  );
  assert.equal(db.reads.length, 0);
});
test("pending checkout cannot manufacture a paid order", async () => {
  const result = await backend.checkoutStatus.handler(
    database({ checkout_attempt_id: payment.attemptId, status: "pending" }),
    statusArgs,
  );
  assert.equal(result.status, "pending");
  assert.equal(result.orderNumber, null);
});
test("webhook-created order is recoverable without exposing customer data", async () => {
  const result = await backend.checkoutStatus.handler(
    database(
      { checkout_attempt_id: payment.attemptId, status: "completed" },
      { order_number: "BADR-TEST", customer_email: "private", shipping_address: { private: true } },
    ),
    statusArgs,
  );
  assert.equal(result.orderNumber, "BADR-TEST");
  assert.equal(result.status, "confirmed");
  assert.deepEqual(Object.keys(result).sort(), ["orderNumber", "status"]);
});

// Reads return independent snapshots, as Convex does: stale reads must not
// overwrite stock updates made earlier in a transaction.
function storeHarness() {
  const tables = new Map();
  let serial = 0;
  const table = (name) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  const db = {
    get: async (id) => {
      for (const rows of tables.values()) if (rows.has(id)) return structuredClone(rows.get(id));
      return null;
    },
    insert: async (name, value) => {
      const id = `${name}_${++serial}`;
      table(name).set(id, { ...structuredClone(value), _id: id, _creationTime: serial });
      return id;
    },
    patch: async (id, patch) => {
      for (const rows of tables.values())
        if (rows.has(id)) {
          rows.set(id, { ...rows.get(id), ...structuredClone(patch) });
          return;
        }
      throw new Error("Missing document");
    },
    query: (name) => {
      const predicates = [];
      const index = {
        eq: (key, value) => {
          predicates.push((row) => row[key] === value);
          return index;
        },
        lte: (key, value) => {
          predicates.push((row) => row[key] <= value);
          return index;
        },
      };
      const rows = () =>
        [...table(name).values()]
          .filter((row) => predicates.every((check) => check(row)))
          .map((row) => structuredClone(row));
      const query = {
        withIndex: (_, callback) => {
          callback(index);
          return query;
        },
        first: async () => rows()[0] || null,
        unique: async () => rows()[0] || null,
        take: async (n) => rows().slice(0, n),
        collect: async () => rows(),
        order: () => query,
      };
      return query;
    },
  };
  const ctx = {
    db,
    auth: { getUserIdentity: async () => null },
    runQuery: (name, args) => backend[name].handler(ctx, args),
    runMutation: (name, args) => backend[name].handler(ctx, args),
  };
  return { ...ctx, ctx, table };
}
const customer = {
  name: "Test Shopper",
  email: "test@example.com",
  phone: "9876543210",
  address_line_1: "Test street",
  city: "Delhi",
  state: "Delhi",
  postal_code: "110001",
  country: "India",
};
async function fixture(stock = 10) {
  const h = storeHarness();
  const productId = await h.db.insert("products", {
    name: "Attar",
    is_active: true,
    in_stock: true,
    stock_quantity: stock,
    price_inr: 499,
    price: 499,
    size_options: ["A", "B"],
  });
  const cart = ["A", "B"].map((selectedSize) => ({
    productId,
    qty: 1,
    name: "tampered name",
    price: 1,
    selectedSize,
  }));
  const args = {
    cart,
    customer,
    razorpay_order_id: "order_fixture",
    checkout_attempt_id: payment.attemptId,
    amount_paise: 99800,
  };
  return { h, productId, cart, args };
}
const captured = {
  event_id: "evt_capture",
  event_type: "payment.captured",
  razorpay_order_id: "order_fixture",
  razorpay_payment_id: "pay_fixture",
  amount_paise: 99800,
  currency: "INR",
};

test("quote ignores client prices and checks combined stock across option lines", async () => {
  const f = await fixture();
  assert.equal((await backend.quoteCheckout.handler(f.h, { cart: f.cart })).amountPaise, 99800);
  await f.h.db.patch(f.productId, { stock_quantity: 1 });
  await assert.rejects(backend.quoteCheckout.handler(f.h, { cart: f.cart }), /Not enough stock/);
});
test("invalid quantity, inactive products and invented variants are rejected", async () => {
  const f = await fixture();
  await assert.rejects(
    backend.quoteCheckout.handler(f.h, { cart: [{ ...f.cart[0], qty: 1.5 }] }),
    /quantity/,
  );
  await assert.rejects(
    backend.quoteCheckout.handler(f.h, { cart: [{ ...f.cart[0], selectedSize: "fake" }] }),
    /Invalid size/,
  );
  await f.h.db.patch(f.productId, { is_active: false });
  await assert.rejects(backend.quoteCheckout.handler(f.h, { cart: f.cart }), /no longer available/);
});
test("option lines deduct once; duplicate callbacks and late failure events are safe", async () => {
  const f = await fixture();
  await backend.reserveCheckoutIntent.handler(f.h, f.args);
  await backend.reserveCheckoutIntent.handler(f.h, f.args);
  assert.equal((await f.h.db.get(f.productId)).stock_quantity, 8);
  await backend.recordRazorpayWebhook.handler(f.h, captured);
  assert.equal((await f.h.db.get(f.productId)).stock_quantity, 8);
  await backend.recordRazorpayWebhook.handler(f.h, captured);
  await backend.finalizeCheckoutIntent.handler(f.h, {
    razorpay_order_id: "order_fixture",
    razorpay_payment_id: "pay_fixture",
    amount_paise: 99800,
    currency: "INR",
  });
  assert.equal((await f.h.db.get(f.productId)).stock_quantity, 8);
  assert.equal(f.h.table("orders").size, 1);
  assert.deepEqual(
    [...f.h.table("order_items").values()].map((row) => row.selected_size),
    ["A", "B"],
  );
  await backend.recordRazorpayWebhook.handler(f.h, {
    ...captured,
    event_id: "late-failed",
    event_type: "payment.failed",
  });
  assert.equal([...f.h.table("orders").values()][0].payment_status, "paid");
  assert.equal((await f.h.db.get(f.productId)).stock_quantity, 8);
});
test("late capture is saved after cancellation and insufficient combined stock is flagged", async () => {
  const f = await fixture();
  await backend.reserveCheckoutIntent.handler(f.h, f.args);
  await backend.cancelRazorpayCheckout.handler(f.h, {
    razorpay_order_id: "order_fixture",
    checkout_attempt_id: payment.attemptId,
  });
  assert.equal((await f.h.db.get(f.productId)).stock_quantity, 10);
  await f.h.db.patch(f.productId, { stock_quantity: 1 });
  await backend.recordRazorpayWebhook.handler(f.h, captured);
  assert.equal([...f.h.table("orders").values()][0].inventory_attention, true);
  assert.equal((await f.h.db.get(f.productId)).stock_quantity, 0);
});
test("capture uses reserved price and variants after catalog edits", async () => {
  const f = await fixture();
  await backend.reserveCheckoutIntent.handler(f.h, f.args);
  await f.h.db.patch(f.productId, { is_active: false, price_inr: 899, size_options: [] });
  await backend.recordRazorpayWebhook.handler(f.h, captured);
  assert.equal([...f.h.table("orders").values()][0].total, 998);
});
test("amount and currency mismatches never create paid orders", async () => {
  for (const override of [{ amount_paise: 100 }, { currency: "USD" }]) {
    const f = await fixture();
    await backend.reserveCheckoutIntent.handler(f.h, f.args);
    await backend.recordRazorpayWebhook.handler(f.h, { ...captured, ...override });
    assert.equal(f.h.table("orders").size, 0);
    assert.equal([...f.h.table("checkout_intents").values()][0].status, "recovery_required");
  }
});
test("checkout reuse rejects changed details and expired attempts explicitly", async () => {
  const f = await fixture();
  await backend.reserveCheckoutIntent.handler(f.h, f.args);
  const args = {
    cart: f.cart,
    customer: { ...customer, city: "Mumbai" },
    subtotal: 998,
    total: 998,
    shipping: 0,
    checkoutAttemptId: payment.attemptId,
    turnstileToken: "unused",
  };
  await assert.rejects(
    backend.createRazorpayCheckoutOrder.handler(f.h.ctx, args),
    (error) => error.data.code === "CHECKOUT_CHANGED",
  );
  await f.h.db.patch([...f.h.table("checkout_intents").values()][0]._id, { status: "failed" });
  await assert.rejects(
    backend.createRazorpayCheckoutOrder.handler(f.h.ctx, args),
    (error) => error.data.code === "CHECKOUT_ATTEMPT_ENDED",
  );
});
test("out-of-order refunds cannot reduce refunded totals or undo processed status", async () => {
  const f = await fixture();
  await backend.reserveCheckoutIntent.handler(f.h, f.args);
  await backend.recordRazorpayWebhook.handler(f.h, captured);
  for (const [event_id, amount] of [
    ["refund1", 60000],
    ["refund2", 20000],
  ]) {
    await backend.recordRazorpayWebhook.handler(f.h, {
      event_id,
      event_type: "refund.processed",
      razorpay_payment_id: "pay_fixture",
      refund_id: "rfnd_one",
      amount_refunded_paise: amount,
    });
  }
  await backend.recordRazorpayWebhook.handler(f.h, {
    event_id: "refund3",
    event_type: "refund.created",
    razorpay_payment_id: "pay_fixture",
    refund_id: "rfnd_one",
  });
  const order = [...f.h.table("orders").values()][0];
  assert.equal(order.refund_amount_inr, 600);
  assert.equal(order.refund_status, "processed");
});
test("forged signatures and payments without reserved checkout are rejected", async () => {
  const f = await fixture();
  const args = {
    cart: f.cart,
    customer,
    subtotal: 998,
    total: 998,
    shipping: 0,
    razorpay_order_id: "order_fixture",
    razorpay_payment_id: "pay_fixture",
    razorpay_signature: "fake",
  };
  await assert.rejects(backend.verifyRazorpayPayment.handler(f.h.ctx, args), /signature/);
  args.razorpay_signature = createHmac("sha256", "unit-secret")
    .update("order_fixture|pay_fixture")
    .digest("hex");
  await assert.rejects(
    backend.verifyRazorpayPayment.handler(f.h.ctx, args),
    /no store checkout record/,
  );
  assert.equal(f.h.table("orders").size, 0);
});
function webhookRequest(payload, signed = true) {
  const body = JSON.stringify(payload);
  return new Request("https://example.com/razorpay/webhook", {
    method: "POST",
    body,
    headers: {
      "x-razorpay-event-id": "http-event",
      ...(signed
        ? {
            "x-razorpay-signature": createHmac("sha256", "unit-webhook").update(body).digest("hex"),
          }
        : {}),
    },
  });
}
test("unsigned webhooks rejected; incomplete captured payloads remain retryable", async () => {
  const f = await fixture();
  assert.equal(
    (await backend.razorpayWebhook(f.h.ctx, webhookRequest({ event: "payment.captured" }, false)))
      .status,
    401,
  );
  assert.equal(
    (await backend.razorpayWebhook(f.h.ctx, webhookRequest({ event: "payment.captured" }))).status,
    503,
  );
  assert.equal(f.h.table("razorpay_webhook_events").size, 0);
});
test("refund.created with a captured payment entity remains a refund event", async () => {
  const f = await fixture();
  await backend.reserveCheckoutIntent.handler(f.h, f.args);
  await backend.recordRazorpayWebhook.handler(f.h, captured);
  const response = await backend.razorpayWebhook(
    f.h.ctx,
    webhookRequest({
      event: "refund.created",
      payload: {
        payment: {
          entity: {
            id: "pay_fixture",
            order_id: "order_fixture",
            status: "captured",
            amount: 99800,
            currency: "INR",
          },
        },
        refund: { entity: { id: "rfnd_new", payment_id: "pay_fixture", status: "pending" } },
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal([...f.h.table("orders").values()][0].refund_status, "pending");
});
test("blocked browser storage never throws in cart or currency helpers", () => {
  const helpers = compileModule("../src/lib/safeStorage.ts", {
    window: {
      get localStorage() {
        throw new Error("Denied");
      },
    },
  });
  assert.equal(helpers.readPreference("cart"), null);
  assert.doesNotThrow(() => helpers.writePreference("cart", "[]"));
});

test("disconnected checkout calls time out and safely handle a late response", async () => {
  const { checkoutDeadline } = compileModule("../src/lib/checkoutDeadline.ts");
  let resolve;
  const operation = new Promise((done) => {
    resolve = done;
  });
  await assert.rejects(checkoutDeadline(operation, "Disconnected", 5), /Disconnected/);
  resolve("late success");
  assert.equal(await checkoutDeadline(Promise.resolve("ready"), "Disconnected", 5), "ready");
});

test("oversized webhook body is rejected without recording an event", async () => {
  const f = await fixture();
  const response = await backend.razorpayWebhook(
    f.h.ctx,
    webhookRequest({ event: "test", padding: "x".repeat(270000) }),
  );
  assert.equal(response.status, 413);
  assert.equal(f.h.table("razorpay_webhook_events").size, 0);
});

test("auth works in memory when storage is blocked, and sign-out clears it", () => {
  const helpers = compileModule("../src/lib/safeStorage.ts", {
    window: {
      get localStorage() {
        throw new Error("Denied");
      },
    },
  });
  const storage = helpers.createBrowserTokenStorage();
  assert.equal(storage.getItem("token"), null);
  storage.setItem("token", "fixture");
  assert.equal(storage.getItem("token"), "fixture");
  storage.removeItem("token");
  assert.equal(storage.getItem("token"), null);
  assert.doesNotThrow(() => helpers.removePreference("name"));
});

test("full storage preserves refreshed tokens in memory and clears durable tokens on sign-out", () => {
  const values = new Map([["token", "old"]]);
  const helpers = compileModule("../src/lib/safeStorage.ts", {
    window: {
      localStorage: {
        getItem: (key) => values.get(key) ?? null,
        setItem() {
          throw new Error("Quota exceeded");
        },
        removeItem: (key) => values.delete(key),
      },
    },
  });
  const storage = helpers.createBrowserTokenStorage();
  assert.equal(storage.getItem("token"), "old");
  storage.setItem("token", "new");
  assert.equal(storage.getItem("token"), "new");
  storage.removeItem("token");
  assert.equal(values.has("token"), false);
  assert.equal(storage.getItem("token"), null);
});

test("auth storage never retains tokens during server rendering", () => {
  const helpers = compileModule("../src/lib/safeStorage.ts");
  const storage = helpers.createBrowserTokenStorage();
  storage.setItem("token", "must-not-persist");
  assert.equal(storage.getItem("token"), null);
  assert.equal(helpers.createBrowserTokenStorage().getItem("token"), null);
});

test("checkout, account and order pages cannot be cached while public caching stays intact", async () => {
  const server = compileModule(
    "../src/server.ts",
    { Request, Response, Headers, URL },
    {
      "./lib/error-capture": { consumeLastCapturedError: () => null },
      "./lib/error-page": { renderErrorPage: () => "Error" },
      "./lib/worker-api": {
        handleWorkerApi: async () =>
          new Response("fixture", { headers: { "cache-control": "public, max-age=60" } }),
      },
    },
  ).default;
  for (const path of ["/checkout", "/account", "/admin", "/order-confirmation", "/track-order"]) {
    const response = await server.fetch(new Request(`https://houseofbadr.com${path}`), {}, {});
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin-allow-popups");
  }
  const response = await server.fetch(
    new Request("https://houseofbadr.com/product/fitoor"),
    {},
    {},
  );
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
});
