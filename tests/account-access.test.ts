/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
const address = {
  full_name: "Fixture Buyer",
  phone: "919876543210",
  address_line_1: "Fixture street",
  city: "Delhi",
  state: "Delhi",
  postal_code: "110001",
  country: "India",
};
afterEach(() => vi.unstubAllEnvs());

async function setup() {
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
  vi.stubEnv("ADMIN_EMAILS", "");
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => ({
    a: await ctx.db.insert("users", { email: "a@example.com" }),
    b: await ctx.db.insert("users", { email: "b@example.com" }),
    admin: await ctx.db.insert("users", { email: "admin@example.com" }),
  }));
  return {
    t,
    ids,
    a: t.withIdentity({ subject: `${ids.a}|session` }),
    b: t.withIdentity({ subject: `${ids.b}|session` }),
    admin: t.withIdentity({ subject: `${ids.admin}|session` }),
  };
}

test("guests cannot read account addresses, history or admin data", async () => {
  const { t } = await setup();
  for (const query of [
    api.addresses.listMine,
    api.orders.listMine,
    api.orders.listAll,
    api.admin.getStoreSettings,
  ]) {
    await expect(t.query(query, {})).rejects.toThrow("Authentication required");
  }
});

test("customers cannot read or modify another customer's saved address", async () => {
  const f = await setup();
  const saved = await f.a.mutation(api.addresses.create, { payload: address });
  expect(await f.b.query(api.addresses.listMine, {})).toEqual([]);
  await expect(
    f.b.mutation(api.addresses.update, { id: saved!.id, patch: { city: "Mumbai" } }),
  ).rejects.toThrow("Address not found");
  await expect(f.b.mutation(api.addresses.remove, { id: saved!.id })).rejects.toThrow(
    "Address not found",
  );
  await expect(f.b.mutation(api.addresses.setDefault, { id: saved!.id })).rejects.toThrow(
    "Address not found",
  );
  expect(await f.a.query(api.addresses.listMine, {})).toMatchObject([{ city: "Delhi" }]);
});

test("address defaults transfer correctly and address count is bounded", async () => {
  const f = await setup();
  const first = await f.a.mutation(api.addresses.create, { payload: address });
  const second = await f.a.mutation(api.addresses.create, { payload: address });
  await f.a.mutation(api.addresses.setDefault, { id: second!.id });
  expect(
    (await f.a.query(api.addresses.listMine, {}))
      .filter((row) => row.is_default)
      .map((row) => row.id),
  ).toEqual([second!.id]);
  await f.a.mutation(api.addresses.remove, { id: second!.id });
  expect(await f.a.query(api.addresses.listMine, {})).toMatchObject([
    { id: first!.id, is_default: true },
  ]);
  for (let i = 1; i < 10; i++) await f.a.mutation(api.addresses.create, { payload: address });
  await expect(f.a.mutation(api.addresses.create, { payload: address })).rejects.toThrow(
    "10 addresses",
  );
});

test("customer history is private and guest tracking requires the matching email", async () => {
  const f = await setup();
  await f.t.run(async (ctx) => {
    await ctx.db.insert("orders", {
      order_number: "#991",
      customer_email: "a@example.com",
      user_id: f.ids.a,
      payment_status: "paid",
      subtotal: 499,
      total: 499,
    });
  });
  expect(await f.b.query(api.orders.listMine, {})).toEqual([]);
  expect(await f.a.query(api.orders.listMine, {})).toHaveLength(1);
  expect(
    await f.t.query(api.orders.getByNumber, { orderNumber: "991", email: "b@example.com" }),
  ).toBeNull();
  expect(
    await f.t.query(api.orders.getByNumber, { orderNumber: "991", email: "a@example.com" }),
  ).toMatchObject({ order_number: "#991" });
});

test("ordinary customers cannot change store settings or list customers; admin can", async () => {
  const f = await setup();
  await expect(
    f.a.mutation(api.admin.saveStoreSettings, { settings: { fixture: "forbidden" } }),
  ).rejects.toThrow("Admin access required");
  await expect(f.a.query(api.users.listCustomers, {})).rejects.toThrow("Admin access required");
  await f.admin.mutation(api.admin.saveStoreSettings, { settings: { fixture: "allowed" } });
  expect(await f.admin.query(api.admin.getStoreSettings, {})).toMatchObject({ fixture: "allowed" });
});

test("password recovery is advertised only with sender and email credentials configured", async () => {
  const { t } = await setup();
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("AUTH_EMAIL_FROM", "");
  expect(await t.query(api.users.authCapabilities, {})).toEqual({ passwordResetEnabled: false });
  vi.stubEnv("RESEND_API_KEY", "fixture-key");
  expect(await t.query(api.users.authCapabilities, {})).toEqual({ passwordResetEnabled: false });
  vi.stubEnv("AUTH_EMAIL_FROM", "Fixture <no-reply@example.com>");
  expect(await t.query(api.users.authCapabilities, {})).toEqual({ passwordResetEnabled: true });
});
