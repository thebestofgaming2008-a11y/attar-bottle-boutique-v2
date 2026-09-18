/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { decodeReviewPhoto } from "../convex/reviewPhotos";
import { handleWorkerApi } from "../src/lib/worker-api";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const photo = btoa("RIFF1234WEBPVP8 " + "x".repeat(24));
test("review action reaches the existing R2 upload handler with correct headers and bytes", async () => {
  const f = await setup();
  mockUpload();
  // Match Cloudflare's Web Crypto extension, absent from the Vitest edge runtime.
  const realCrypto = globalThis.crypto;
  vi.stubGlobal("crypto", {
    randomUUID: realCrypto.randomUUID.bind(realCrypto),
    getRandomValues: realCrypto.getRandomValues.bind(realCrypto),
    subtle: {
      digest: realCrypto.subtle.digest.bind(realCrypto.subtle),
      timingSafeEqual: (a: ArrayBuffer, b: ArrayBuffer) =>
        a.byteLength === b.byteLength &&
        new Uint8Array(a).every((value, index) => value === new Uint8Array(b)[index]),
    },
  });
  const put = vi.fn(async (_key: string, body: ReadableStream) => {
    expect(new Uint8Array(await new Response(body).arrayBuffer())).toEqual(
      decodeReviewPhoto(photo),
    );
  });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const response = await handleWorkerApi(new Request(url, init), {
      ADMIN_UPLOAD_TOKEN: "server-only-test-token",
      R2_PUBLIC_BASE_URL: "https://media.example.com",
      MEDIA_BUCKET: { put },
    } as any);
    if (!response) throw new Error("Upload route missing");
    return response;
  });
  const review = await f.customer.mutation(api.reviews.submit, f.input);
  const url = await f.customer.action(api.reviewPhotos.upload, {
    reviewId: review!.id,
    data: photo,
  });
  expect(url).toMatch(/^https:\/\/media.example.com\/media\//);
  expect(put).toHaveBeenCalledOnce();
});
function mockUpload() {
  vi.stubEnv("PUBLIC_SITE_URL", "https://shop.example.com");
  vi.stubEnv("ADMIN_UPLOAD_TOKEN", "server-only-test-token");
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ url: `https://media.example.com/${crypto.randomUUID()}.webp` }),
        { status: 201 },
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
test("photo upload validates format and size before contacting storage", () => {
  expect(decodeReviewPhoto(photo).length).toBeGreaterThan(20);
  expect(() => decodeReviewPhoto(btoa('<svg onload="alert(1)"></svg>'))).toThrow("WebP");
  expect(() => decodeReviewPhoto("a".repeat(700001))).toThrow("500 KB");
});
test("paid customer photos are moderated with their review; secrets stay server-side", async () => {
  const f = await setup();
  const fetcher = mockUpload();
  const review = await f.customer.mutation(api.reviews.submit, f.input);
  const url = await f.customer.action(api.reviewPhotos.upload, {
    reviewId: review!.id,
    data: photo,
  });
  expect(url).toMatch(/^https:\/\/media.example.com\//);
  expect(url).not.toContain("server-only");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await f.t.query(api.reviews.listPublishedForProduct, { productId: f.productId })).toEqual(
    [],
  );
  const adminRows = await f.admin.query(api.reviews.listAll, {});
  expect(adminRows[0].media_urls).toEqual([url]);
  await f.admin.mutation(api.reviews.updateStatus, { id: review!.id, status: "published" });
  const published = await f.t.query(api.reviews.listPublishedForProduct, {
    productId: f.productId,
  });
  expect(published[0].media_urls).toEqual([url]);
  await expect(
    f.customer.action(api.reviewPhotos.upload, { reviewId: review!.id, data: photo }),
  ).rejects.toThrow("no longer open");
  await f.admin.mutation(api.reviews.updateStatus, { id: review!.id, status: "hidden" });
  expect(await f.t.query(api.reviews.listPublishedForProduct, { productId: f.productId })).toEqual(
    [],
  );
});
test("guest photo uploads require matching paid order credentials and product", async () => {
  const f = await setup();
  const fetcher = mockUpload();
  const review = await f.t.mutation(api.reviews.submitForOrder, {
    ...f.input,
    orderNumber: "1001",
    email: "buyer@example.com",
  });
  await expect(
    f.t.action(api.reviewPhotos.upload, { reviewId: review!.id, data: photo }),
  ).rejects.toThrow("Verify");
  await expect(
    f.t.action(api.reviewPhotos.upload, {
      reviewId: review!.id,
      data: photo,
      orderNumber: "1001",
      email: "wrong@example.com",
    }),
  ).rejects.toThrow("Verify");
  expect(fetcher).not.toHaveBeenCalled();
  await f.t.action(api.reviewPhotos.upload, {
    reviewId: review!.id,
    data: photo,
    orderNumber: "1001",
    email: "buyer@example.com",
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  // A guest cannot then make a duplicate by signing into their account.
  await expect(f.customer.mutation(api.reviews.submit, f.input)).rejects.toThrow(
    "already reviewed",
  );
});
test("photo count and upload retries are bounded without losing the written review", async () => {
  const f = await setup();
  mockUpload();
  const review = await f.customer.mutation(api.reviews.submit, f.input);
  for (let i = 0; i < 3; i++)
    await f.customer.action(api.reviewPhotos.upload, { reviewId: review!.id, data: photo });
  await expect(
    f.customer.action(api.reviewPhotos.upload, { reviewId: review!.id, data: photo }),
  ).rejects.toThrow("3 photos");
  expect((await f.admin.query(api.reviews.listAll, {}))[0].body).toBe(f.input.body);
});
test("storage failures can be retried but cannot create unlimited abandoned uploads", async () => {
  const f = await setup();
  const fetcher = mockUpload();
  fetcher.mockImplementation(async () => new Response("{}", { status: 503 }));
  const review = await f.customer.mutation(api.reviews.submit, f.input);
  for (let i = 0; i < 6; i++)
    await expect(
      f.customer.action(api.reviewPhotos.upload, { reviewId: review!.id, data: photo }),
    ).rejects.toThrow("written review is saved");
  await expect(
    f.customer.action(api.reviewPhotos.upload, { reviewId: review!.id, data: photo }),
  ).rejects.toThrow("limit reached");
  expect(fetcher).toHaveBeenCalledTimes(6);
});
test("late photo completion cannot modify an already approved review", async () => {
  const f = await setup();
  const review = await f.customer.mutation(api.reviews.submit, f.input);
  await f.admin.mutation(api.reviews.updateStatus, { id: review!.id, status: "published" });
  await expect(
    f.t.mutation(internal.reviews.attachPhoto, {
      reviewId: review!.id,
      url: "https://media.example.com/late.webp",
    }),
  ).rejects.toThrow("moderation already completed");
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
