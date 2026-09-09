/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => {
  vi.unstubAllEnvs();
});
async function setup(paymentStatus = "paid") {
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Real Customer",
      email: "buyer@example.com",
    });
    const adminId = await ctx.db.insert("users", { email: "admin@example.com" });
    const productId = await ctx.db.insert("products", {
      name: "Test scent",
      price: 499,
      price_inr: 499,
      is_active: true,
    });
    const orderId = await ctx.db.insert("orders", {
      order_number: "#1001",
      customer_name: "Real Customer",
      customer_email: "buyer@example.com",
      user_id: userId,
      payment_status: paymentStatus,
      subtotal: 499,
      total: 499,
    });
    await ctx.db.insert("order_items", {
      order_id: orderId,
      product_id: productId,
      quantity: 1,
      unit_price: 499,
      subtotal: 499,
    });
    return { userId, adminId, productId };
  });
  return {
    t,
    ...ids,
    customer: t.withIdentity({ subject: `${ids.userId}|session` }),
    admin: t.withIdentity({ subject: `${ids.adminId}|session` }),
    input: { productId: ids.productId, rating: 4, body: "A pleasant scent." },
  };
}
test("no reviews returns an empty public list", async () => {
  const f = await setup();
  expect(await f.t.query(api.reviews.listPublishedForProduct, { productId: f.productId })).toEqual(
    [],
  );
});
test("simulated orders cannot create verified account or guest reviews", async () => {
  const f = await setup("MOCKED_PAID");
  await expect(f.customer.mutation(api.reviews.submit, f.input)).rejects.toThrow(
    "verified customers",
  );
  await expect(
    f.t.mutation(api.reviews.submitForOrder, {
      ...f.input,
      orderNumber: "1001",
      email: "buyer@example.com",
    }),
  ).rejects.toThrow("Only paid orders");
  expect(await f.customer.query(api.reviews.canReviewProduct, { productId: f.productId })).toEqual({
    canReview: false,
  });
});
test("paid guest review stays private until approval; public response omits private fields", async () => {
  const f = await setup();
  const review = await f.t.mutation(api.reviews.submitForOrder, {
    ...f.input,
    orderNumber: "1001",
    email: "buyer@example.com",
  });
  expect(await f.t.query(api.reviews.listPublishedForProduct, { productId: f.productId })).toEqual(
    [],
  );
  await f.admin.mutation(api.reviews.updateStatus, {
    id: review!.id,
    status: "published",
    adminNote: "Private moderation note",
  });
  const rows = await f.t.query(api.reviews.listPublishedForProduct, { productId: f.productId });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    verified_purchase: true,
    rating: 4,
    body: f.input.body,
    customer_email: null,
  });
  expect(JSON.stringify(rows)).not.toContain("buyer@example.com");
  expect(JSON.stringify(rows)).not.toContain("Private moderation note");
  expect(rows[0]).not.toHaveProperty("user_id");
});
test("admin cannot manufacture a verified review without a matching paid customer", async () => {
  const f = await setup();
  await expect(
    f.admin.mutation(api.reviews.createAdmin, {
      ...f.input,
      customerEmail: "not-a-buyer@example.com",
    }),
  ).rejects.toThrow("paid purchase");
  await expect(f.t.mutation(api.reviews.createAdmin, f.input)).rejects.toThrow();
});
test("admin can record genuine feedback from a matching paid customer", async () => {
  const f = await setup();
  await f.admin.mutation(api.reviews.createAdmin, {
    ...f.input,
    customerEmail: "buyer@example.com",
    customerName: "Real Customer",
  });
  expect(
    await f.t.query(api.reviews.listPublishedForProduct, { productId: f.productId }),
  ).toHaveLength(1);
});
test("unverified legacy entries are not published or relabeled as verified", async () => {
  const f = await setup();
  const id = await f.t.run((ctx) =>
    ctx.db.insert("reviews", {
      product_id: f.productId,
      rating: 5,
      status: "published",
      body: "Legacy entry",
      customer_email: "not-a-buyer@example.com",
    }),
  );
  expect(await f.t.query(api.reviews.listPublishedForProduct, { productId: f.productId })).toEqual(
    [],
  );
  await expect(
    f.admin.mutation(api.reviews.updateStatus, { id, status: "published" }),
  ).rejects.toThrow("no paid purchase");
});
test("invalid ratings, empty feedback and mismatched guest emails are rejected", async () => {
  const f = await setup();
  await expect(f.customer.mutation(api.reviews.submit, { ...f.input, rating: 9 })).rejects.toThrow(
    "1 to 5",
  );
  await expect(f.customer.mutation(api.reviews.submit, { ...f.input, body: " " })).rejects.toThrow(
    "written feedback",
  );
  await expect(
    f.t.mutation(api.reviews.submitForOrder, {
      ...f.input,
      orderNumber: "1001",
      email: "wrong@example.com",
    }),
  ).rejects.toThrow("Order not found");
});
