import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
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
  {},
  {
    "convex/values": { v: validators },
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
    "./_generated/api": { api: {}, internal: {} },
    "./lib": {},
    "./shipping": {},
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
