import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  action,
  httpAction,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { nowIso, publicOrder, requireAdmin, requireIdentity, writeAuditLog } from "./lib";
import { checkoutShippingForCountry } from "./shipping";

const cartItem = v.object({
  cartKey: v.optional(v.string()),
  productId: v.string(),
  qty: v.number(),
  name: v.string(),
  price: v.number(),
  priceInr: v.optional(v.union(v.number(), v.null())),
  image: v.optional(v.union(v.string(), v.null())),
  slug: v.optional(v.union(v.string(), v.null())),
  weightG: v.optional(v.union(v.number(), v.null())),
  shippingClass: v.optional(v.union(v.string(), v.null())),
  selectedColor: v.optional(v.union(v.string(), v.null())),
  selectedSize: v.optional(v.union(v.string(), v.null())),
});

const checkoutCustomer = v.object({
  email: v.string(),
  phone: v.string(),
  name: v.string(),
  address_line_1: v.string(),
  address_line_2: v.optional(v.string()),
  city: v.string(),
  state: v.optional(v.string()),
  postal_code: v.string(),
  country: v.string(),
});

const checkoutPayload = {
  cart: v.array(cartItem),
  customer: checkoutCustomer,
  subtotal: v.number(),
  shipping: v.number(),
  total: v.number(),
};

const DIRECT_ORDER_STATUSES = new Set(["processing", "shipped", "delivered"]);
const CHECKOUT_RESERVATION_MS = 30 * 60 * 1000;
const PAYMENT_RECOVERY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const PAYMENT_TECHNICAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const RECONCILIATION_HEARTBEAT_MS = 60 * 60 * 1000;
const RECONCILIATION_DELAYS_MS = [5, 15, 60, 6 * 60, 24 * 60].map((minutes) => minutes * 60 * 1000);
const MAX_CART_LINES = 50;
const MAX_WEBHOOK_BYTES = 256 * 1024;
const EXTERNAL_REQUEST_TIMEOUT_MS = 12_000;
const CHECKOUT_ATTEMPT_PATTERN = /^[a-f0-9-]{20,80}$/i;

function cleanText(value: string | null | undefined, max = 160) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 160) {
  const next = cleanText(value, max);
  return next.length ? next : null;
}

function requireIndiaShipping(country: string | null | undefined) {
  const shipping = checkoutShippingForCountry(country);
  if (shipping.countryType !== "india") {
    throw new Error("We currently deliver within India only.");
  }
  return shipping;
}

function productNameWithOptions(name: string, color?: string | null, size?: string | null) {
  const options = [color ? `Colour: ${color}` : "", size ? `Size: ${size}` : ""].filter(Boolean);
  return options.length ? `${name} (${options.join(", ")})` : name;
}

function cleanVariantSelection(
  value: string | null | undefined,
  allowed: string[] | null | undefined,
  label: string,
  productName: string,
) {
  const selected = cleanNullable(value, 60);
  const options = Array.isArray(allowed)
    ? allowed.map((option) => cleanText(option, 60)).filter(Boolean)
    : [];
  if (options.length === 0) return selected;
  if (!selected) throw new Error(`${label} is required for ${productName}.`);
  const match = options.find((option) => option.toLowerCase() === selected.toLowerCase());
  if (!match) throw new Error(`Invalid ${label.toLowerCase()} for ${productName}.`);
  return match;
}

function cleanEmail(value: string) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email address is required.");
  }
  return email;
}

function cleanPhone(value: string) {
  const phone = cleanText(value, 32);
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("A valid phone number is required.");
  }
  return phone;
}

function validateCheckoutCustomer(customer: {
  email: string;
  phone: string;
  name: string;
  address_line_1: string;
  city: string;
  postal_code: string;
  country: string;
}) {
  cleanEmail(customer.email);
  cleanPhone(customer.phone);
  if (
    !cleanText(customer.name, 120) ||
    !cleanText(customer.address_line_1, 180) ||
    !cleanText(customer.city, 80) ||
    !cleanText(customer.postal_code, 24) ||
    !cleanText(customer.country, 80)
  ) {
    throw new Error("Complete shipping details are required.");
  }
  requireIndiaShipping(customer.country);
}

function normalizeCheckoutCustomer(customer: {
  email: string;
  phone: string;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}) {
  validateCheckoutCustomer(customer);
  return {
    email: cleanEmail(customer.email),
    phone: cleanPhone(customer.phone),
    name: cleanText(customer.name, 120),
    address_line_1: cleanText(customer.address_line_1, 180),
    address_line_2: cleanText(customer.address_line_2, 180),
    city: cleanText(customer.city, 80),
    state: cleanText(customer.state, 80),
    postal_code: cleanText(customer.postal_code, 24),
    country: cleanText(customer.country, 80),
  };
}

function cleanCheckoutAttemptId(value: string) {
  const attemptId = cleanText(value, 80);
  if (!CHECKOUT_ATTEMPT_PATTERN.test(attemptId)) {
    throw new Error("Invalid checkout attempt. Refresh checkout and try again.");
  }
  return attemptId;
}

function cleanTrackingUrl(value: string | null | undefined) {
  const url = cleanText(value, 500);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Tracking URL must start with http:// or https://.");
  }
  return url;
}

async function nextOrderNumber(ctx: any) {
  const timestamp = nowIso();
  const existing = await ctx.db
    .query("store_settings")
    .withIndex("by_key", (q: any) => q.eq("key", "order_sequence"))
    .first();
  const next = Math.max(1, Number(existing?.value ?? 0) + 1);
  if (existing) await ctx.db.patch(existing._id, { value: next, updated_at: timestamp });
  else
    await ctx.db.insert("store_settings", {
      key: "order_sequence",
      value: next,
      updated_at: timestamp,
    });
  return `#${next}`;
}

async function orderWithItems(ctx: any, order: any): Promise<Record<string, any>> {
  const items = await ctx.db
    .query("order_items")
    .withIndex("by_order_id", (q: any) => q.eq("order_id", order._id))
    .collect();
  return {
    ...publicOrder(order),
    items: items.map((item: any) => {
      const { _id, _creationTime, order_id, ...rest } = item;
      return { id: _id, order_id, ...rest };
    }),
  };
}

async function checkoutQuote(ctx: any, cart: Array<any>) {
  if (!cart.length) throw new Error("Cart is empty.");
  if (cart.length > MAX_CART_LINES)
    throw new Error(`Cart cannot contain more than ${MAX_CART_LINES} different items.`);
  let subtotal = 0;
  let itemCount = 0;
  for (const item of cart) {
    const qty = Math.floor(item.qty);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) throw new Error("Cart quantity is invalid.");
    const product = (await ctx.db.get(item.productId as any)) as any;
    if (!product || product.is_active === false)
      throw new Error(`Product is no longer available: ${cleanText(item.name, 80)}`);
    const stock = product.stock_quantity ?? 0;
    if (stock < qty || product.in_stock === false)
      throw new Error(`Not enough stock for ${product.name}.`);
    const unitPrice = product.sale_price_inr ?? product.price_inr ?? product.price;
    if (!Number.isFinite(unitPrice) || unitPrice < 0)
      throw new Error(`Invalid price for ${product.name}.`);
    cleanVariantSelection(item.selectedColor, product.color_options, "Colour", product.name);
    cleanVariantSelection(item.selectedSize, product.size_options, "Size", product.name);
    subtotal += unitPrice * qty;
    itemCount += qty;
  }
  const shipping = 0;
  const total = subtotal + shipping;
  const amountPaise = Math.round(total * 100);
  if (amountPaise < 100) throw new Error("Razorpay orders must be at least ₹1.");
  return { subtotal, shipping, total, amountPaise, itemCount };
}

async function restoreReservedStock(ctx: any, cart: Array<any>) {
  const timestamp = nowIso();
  for (const item of cart) {
    const product = (await ctx.db.get(item.productId as any)) as any;
    if (!product) continue;
    const nextStock = Math.max(
      0,
      Number(product.stock_quantity ?? 0) + Math.max(1, Math.floor(item.qty)),
    );
    await ctx.db.patch(product._id, {
      stock_quantity: nextStock,
      in_stock: nextStock > 0,
      updated_at: timestamp,
    });
  }
}

async function releaseExpiredReservations(ctx: any) {
  const now = Date.now();
  const expired = await ctx.db
    .query("checkout_intents")
    .withIndex("by_status_and_expires_at", (q: any) =>
      q.eq("status", "pending").lte("expires_at", now),
    )
    .take(100);
  for (const intent of expired) {
    await restoreReservedStock(ctx, intent.cart);
    await ctx.db.patch(intent._id, {
      status: "released",
      stock_reserved: false,
      reconcile_after: now,
      updated_at: nowIso(),
    });
  }
}

async function failCheckoutIntent(
  ctx: any,
  args: {
    razorpay_order_id: string;
    razorpay_payment_id?: string | null;
    error?: string | null;
  },
) {
  const intent = await ctx.db
    .query("checkout_intents")
    .withIndex("by_razorpay_order_id", (q: any) =>
      q.eq("razorpay_order_id", args.razorpay_order_id),
    )
    .first();
  if (!intent || intent.status !== "pending") return null;
  await restoreReservedStock(ctx, intent.cart);
  await ctx.db.patch(intent._id, {
    status: "failed",
    stock_reserved: false,
    payment_id: args.razorpay_payment_id ?? null,
    error: cleanNullable(args.error, 500),
    reconcile_after: Date.now() + RECONCILIATION_DELAYS_MS[0],
    updated_at: nowIso(),
  });
  return true;
}

async function applyProcessedRefund(
  ctx: any,
  order: any,
  amountRefundedPaise: number,
  refundId?: string | null,
) {
  const timestamp = nowIso();
  const nextRefundAmount = Math.min(
    order.total,
    Math.max(0, Math.round(amountRefundedPaise) / 100),
  );
  const previousRefundAmount = Math.max(0, Number(order.refund_amount_inr ?? 0));
  const newlyRefundedAmount = Math.max(0, nextRefundAmount - previousRefundAmount);
  const fullyRefunded = Math.round(nextRefundAmount * 100) >= Math.round(order.total * 100);
  await ctx.db.patch(order._id, {
    payment_status: fullyRefunded ? "refunded" : "partially_refunded",
    refund_amount_inr: nextRefundAmount,
    refund_status: "processed",
    ...(refundId ? { refund_id: refundId } : {}),
    refund_error: null,
    refunded_at: timestamp,
    updated_at: timestamp,
  });
  if (newlyRefundedAmount > 0 && order.user_id) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", order.user_id))
      .unique();
    if (profile) {
      await ctx.db.patch(profile._id, {
        total_spent: Math.max(0, Number(profile.total_spent ?? 0) - newlyRefundedAmount),
        updated_at: timestamp,
      });
    }
  }
}

async function savePaidOrder(
  ctx: any,
  args: {
    cart: Array<any>;
    customer: any;
    user_id?: string | null;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    use_reserved_snapshot?: boolean;
  },
) {
  const existingByPayment = await ctx.db
    .query("orders")
    .withIndex("by_payment_id", (q: any) => q.eq("payment_id", args.razorpay_payment_id))
    .first();
  if (existingByPayment) {
    if (existingByPayment.payment_order_id !== args.razorpay_order_id)
      throw new Error("Payment order mismatch.");
    return publicOrder(existingByPayment);
  }
  const existingByRazorpayOrder = await ctx.db
    .query("orders")
    .withIndex("by_payment_order_id", (q: any) => q.eq("payment_order_id", args.razorpay_order_id))
    .first();
  if (existingByRazorpayOrder) {
    if (existingByRazorpayOrder.payment_id !== args.razorpay_payment_id)
      throw new Error("This Razorpay order is already linked to another payment.");
    return publicOrder(existingByRazorpayOrder);
  }
  if (!args.cart.length) throw new Error("Cart is empty.");
  const customer = {
    email: cleanEmail(args.customer.email),
    phone: cleanPhone(args.customer.phone),
    name: cleanText(args.customer.name, 120),
    address_line_1: cleanText(args.customer.address_line_1, 180),
    address_line_2: cleanNullable(args.customer.address_line_2, 180) ?? undefined,
    city: cleanText(args.customer.city, 80),
    state: cleanNullable(args.customer.state, 80) ?? undefined,
    postal_code: cleanText(args.customer.postal_code, 24),
    country: cleanText(args.customer.country, 80),
  };
  if (
    !customer.name ||
    !customer.address_line_1 ||
    !customer.city ||
    !customer.postal_code ||
    !customer.country
  ) {
    throw new Error("Complete shipping details are required.");
  }

  const normalizedItems = [];
  let computedSubtotal = 0;
  let inventoryAttention = false;
  for (const item of args.cart) {
    const qty = Math.floor(item.qty);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) throw new Error("Cart quantity is invalid.");
    const product = (await ctx.db.get(item.productId as any)) as any;
    if (!args.use_reserved_snapshot && (!product || product.is_active === false)) {
      throw new Error(`Product is no longer available: ${cleanText(item.name, 80)}`);
    }
    const stock = Number(product?.stock_quantity ?? 0);
    if (!args.use_reserved_snapshot && (stock < qty || product?.in_stock === false)) {
      throw new Error(`Not enough stock for ${product.name}.`);
    }
    const unitPrice = args.use_reserved_snapshot
      ? Number(item.priceInr ?? item.price)
      : Number(product.sale_price_inr ?? product.price_inr ?? product.price);
    const productName = args.use_reserved_snapshot ? cleanText(item.name, 160) : product.name;
    if (!productName || !Number.isFinite(unitPrice) || unitPrice < 0)
      throw new Error("Reserved order item is invalid.");
    const selectedColor = args.use_reserved_snapshot
      ? cleanNullable(item.selectedColor, 60)
      : cleanVariantSelection(item.selectedColor, product.color_options, "Colour", product.name);
    const selectedSize = args.use_reserved_snapshot
      ? cleanNullable(item.selectedSize, 60)
      : cleanVariantSelection(item.selectedSize, product.size_options, "Size", product.name);
    if (!product || stock < qty) inventoryAttention = true;
    computedSubtotal += unitPrice * qty;
    normalizedItems.push({
      product,
      productId: cleanText(item.productId, 120),
      productName,
      productImageUrl: args.use_reserved_snapshot
        ? cleanNullable(item.image, 1000)
        : (product.cover_image_url ?? null),
      qty,
      unitPrice,
      selectedColor,
      selectedSize,
    });
  }

  const shippingMeta = requireIndiaShipping(customer.country);
  const computedShipping = shippingMeta.amount;
  const computedTotal = computedSubtotal + computedShipping;
  const timestamp = nowIso();
  const orderNumber = await nextOrderNumber(ctx);
  const orderId = await ctx.db.insert("orders", {
    order_number: orderNumber,
    user_id: args.user_id ?? null,
    customer_email: customer.email,
    customer_name: customer.name,
    customer_phone: customer.phone,
    status: "processing",
    payment_status: "paid",
    subtotal: computedSubtotal,
    tax: 0,
    shipping_cost: computedShipping,
    shipping_payment_status: shippingMeta.paymentStatus,
    shipping_payment_note: shippingMeta.note,
    customer_country_type: shippingMeta.countryType,
    discount: 0,
    total: computedTotal,
    total_inr: computedTotal,
    currency: "INR",
    shipping_address: customer,
    payment_provider: "RAZORPAY",
    payment_order_id: cleanText(args.razorpay_order_id, 120),
    payment_id: cleanText(args.razorpay_payment_id, 120),
    inventory_attention: inventoryAttention,
    created_at: timestamp,
    updated_at: timestamp,
  });

  for (const item of normalizedItems) {
    await ctx.db.insert("order_items", {
      order_id: orderId,
      product_id: item.product?._id ?? item.productId,
      product_name: productNameWithOptions(item.productName, item.selectedColor, item.selectedSize),
      product_image_url: item.productImageUrl,
      selected_color: item.selectedColor,
      selected_size: item.selectedSize,
      quantity: item.qty,
      unit_price: item.unitPrice,
      subtotal: item.unitPrice * item.qty,
    });
    if (item.product) {
      const nextStock = Math.max(0, (item.product.stock_quantity ?? 0) - item.qty);
      await ctx.db.patch(item.product._id, {
        stock_quantity: nextStock,
        in_stock: nextStock > 0,
        updated_at: timestamp,
      });
    }
  }

  if (args.user_id) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", args.user_id))
      .unique();
    if (profile) {
      await ctx.db.patch(profile._id, {
        total_orders: (profile.total_orders ?? 0) + 1,
        total_spent: (profile.total_spent ?? 0) + computedTotal,
        updated_at: timestamp,
      });
    }
  }

  const order = await ctx.db.get(orderId);
  return order ? publicOrder(order) : null;
}

export const quoteCheckout = query({
  args: { cart: v.array(cartItem) },
  handler: async (ctx, args) => {
    return await checkoutQuote(ctx, args.cart);
  },
});

function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay keys are not configured.");
  return { keyId, keySecret };
}

function basicAuth(keyId: string, keySecret: string) {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

async function razorpayRequest(path: string, init: RequestInit = {}): Promise<any> {
  const { keyId, keySecret } = razorpayKeys();
  const method = String(init.method ?? "GET").toUpperCase();
  const attempts = method === "GET" ? 2 : 1;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let retryAllowed = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXTERNAL_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`https://api.razorpay.com/v1${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: basicAuth(keyId, keySecret),
          ...(init.headers ?? {}),
        },
      });
      const body: any = await response.json().catch(() => ({}));
      if (response.ok) return body;
      const message = body?.error?.description ?? `Razorpay request failed (${response.status}).`;
      retryAllowed = response.status === 429 || response.status >= 500;
      throw new Error(message);
    } catch (error) {
      lastError = error;
      if (!retryAllowed || attempt + 1 >= attempts) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Razorpay did not respond in time. Please try again.");
        }
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Razorpay request failed.");
}

async function verifyTurnstileToken(tokenValue: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error("Checkout protection is not configured.");
  if (!tokenValue || tokenValue.length > 2048) {
    throw new Error("Complete the security check and try again.");
  }
  const token = cleanText(tokenValue, 2048);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTERNAL_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        idempotency_key: crypto.randomUUID(),
      }),
    });
    const result: any = await response.json().catch(() => ({}));
    if (!response.ok || result?.success !== true) {
      throw new Error("Security check expired or failed. Please try again.");
    }
    const usesOfficialTestSecret = secret.startsWith("1x0000000000000000000000000000000");
    if (!usesOfficialTestSecret && result.action !== "checkout") {
      throw new Error("Security check action did not match checkout.");
    }
    const allowedHostnames = String(process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean);
    if (
      allowedHostnames.length > 0 &&
      !allowedHostnames.includes(String(result.hostname ?? "").toLowerCase())
    ) {
      throw new Error("Security check hostname was not accepted.");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Security check timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function hmacSha256Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1)
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export const findSavedPayment = internalQuery({
  args: {
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const existingByPayment = await ctx.db
      .query("orders")
      .withIndex("by_payment_id", (q) => q.eq("payment_id", args.razorpay_payment_id))
      .first();
    if (existingByPayment) {
      if (existingByPayment.payment_order_id !== args.razorpay_order_id)
        throw new Error("Payment order mismatch.");
      return publicOrder(existingByPayment);
    }
    const existingByRazorpayOrder = await ctx.db
      .query("orders")
      .withIndex("by_payment_order_id", (q: any) =>
        q.eq("payment_order_id", args.razorpay_order_id),
      )
      .first();
    if (!existingByRazorpayOrder) return null;
    if (existingByRazorpayOrder.payment_id !== args.razorpay_payment_id)
      throw new Error("This Razorpay order is already linked to another payment.");
    return publicOrder(existingByRazorpayOrder);
  },
});

export const findCheckoutIntentByAttempt = internalQuery({
  args: { checkout_attempt_id: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("checkout_intents")
      .withIndex("by_checkout_attempt_id", (q) =>
        q.eq("checkout_attempt_id", args.checkout_attempt_id),
      )
      .first();
  },
});

export const createRazorpayCheckoutOrder = action({
  args: {
    ...checkoutPayload,
    checkoutAttemptId: v.string(),
    turnstileToken: v.string(),
  },
  returns: v.object({
    keyId: v.string(),
    orderId: v.string(),
    amount: v.number(),
    currency: v.string(),
    receipt: v.string(),
  }),
  handler: async (ctx, args) => {
    const customer = normalizeCheckoutCustomer(args.customer);
    const checkoutAttemptId = cleanCheckoutAttemptId(args.checkoutAttemptId);
    const existing: any = await ctx.runQuery(internal.orders.findCheckoutIntentByAttempt, {
      checkout_attempt_id: checkoutAttemptId,
    });
    const { keyId } = razorpayKeys();
    if (existing) {
      if (existing.status !== "pending" || existing.expires_at <= Date.now()) {
        throw new Error("This checkout attempt has ended. Please try again.");
      }
      return {
        keyId,
        orderId: existing.razorpay_order_id,
        amount: existing.amount_paise,
        currency: "INR",
        receipt: `BADR-${checkoutAttemptId.replace(/-/g, "").slice(0, 12)}`,
      };
    }
    await verifyTurnstileToken(args.turnstileToken);
    const quote = await ctx.runQuery(api.orders.quoteCheckout, { cart: args.cart });
    const receipt = `BADR-${Date.now().toString(36)}-${checkoutAttemptId
      .replace(/-/g, "")
      .slice(0, 8)}`;
    const order = await razorpayRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: quote.amountPaise,
        currency: "INR",
        receipt,
        notes: {
          customer: cleanText(customer.name, 80),
          email: cleanText(customer.email, 120),
          checkout_attempt: checkoutAttemptId,
        },
      }),
    });
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getAuthUserId(ctx) : null;
    const reservation: any = await ctx.runMutation(internal.orders.reserveCheckoutIntent, {
      razorpay_order_id: order.id,
      checkout_attempt_id: checkoutAttemptId,
      user_id: userId,
      cart: args.cart,
      customer,
      amount_paise: quote.amountPaise,
    });
    return {
      keyId,
      orderId: reservation.razorpay_order_id,
      amount: reservation.amount_paise,
      currency: "INR",
      receipt,
    };
  },
});

export const reserveCheckoutIntent = internalMutation({
  args: {
    razorpay_order_id: v.string(),
    checkout_attempt_id: v.string(),
    user_id: v.optional(v.union(v.string(), v.null())),
    cart: v.array(cartItem),
    customer: checkoutCustomer,
    amount_paise: v.number(),
  },
  returns: v.object({ razorpay_order_id: v.string(), amount_paise: v.number() }),
  handler: async (ctx, args) => {
    await releaseExpiredReservations(ctx);
    const existingAttempt = await ctx.db
      .query("checkout_intents")
      .withIndex("by_checkout_attempt_id", (q) =>
        q.eq("checkout_attempt_id", args.checkout_attempt_id),
      )
      .first();
    if (existingAttempt) {
      return {
        razorpay_order_id: existingAttempt.razorpay_order_id,
        amount_paise: existingAttempt.amount_paise,
      };
    }
    const existing = await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q: any) =>
        q.eq("razorpay_order_id", args.razorpay_order_id),
      )
      .first();
    if (existing) {
      return {
        razorpay_order_id: existing.razorpay_order_id,
        amount_paise: existing.amount_paise,
      };
    }
    const quote = await checkoutQuote(ctx, args.cart);
    if (quote.amountPaise !== args.amount_paise)
      throw new Error("Checkout total changed. Please try again.");
    const timestamp = nowIso();
    const reservedCart = [];
    for (const item of args.cart) {
      const product = (await ctx.db.get(item.productId as any)) as any;
      if (!product) throw new Error("Product is no longer available.");
      const qty = Math.max(1, Math.floor(item.qty));
      const nextStock = Number(product.stock_quantity ?? 0) - qty;
      if (nextStock < 0) throw new Error(`Not enough stock for ${product.name}.`);
      const unitPrice = product.sale_price_inr ?? product.price_inr ?? product.price;
      const selectedColor = cleanVariantSelection(
        item.selectedColor,
        product.color_options,
        "Colour",
        product.name,
      );
      const selectedSize = cleanVariantSelection(
        item.selectedSize,
        product.size_options,
        "Size",
        product.name,
      );
      reservedCart.push({
        cartKey: item.cartKey,
        productId: String(product._id),
        qty,
        name: cleanText(product.name, 160),
        price: unitPrice,
        priceInr: unitPrice,
        image: product.cover_image_url ?? null,
        slug: product.slug ?? null,
        weightG: product.weight_g ?? null,
        shippingClass: product.shipping_class ?? null,
        selectedColor,
        selectedSize,
      });
      await ctx.db.patch(product._id, {
        stock_quantity: nextStock,
        in_stock: nextStock > 0,
        updated_at: timestamp,
      });
    }
    await ctx.db.insert("checkout_intents", {
      razorpay_order_id: args.razorpay_order_id,
      checkout_attempt_id: args.checkout_attempt_id,
      user_id: args.user_id ?? null,
      payment_id: null,
      status: "pending",
      stock_reserved: true,
      cart: reservedCart,
      customer: args.customer,
      amount_paise: args.amount_paise,
      error: null,
      expires_at: Date.now() + CHECKOUT_RESERVATION_MS,
      reconcile_after: Date.now() + RECONCILIATION_DELAYS_MS[0],
      reconcile_attempts: 0,
      last_reconciled_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    return { razorpay_order_id: args.razorpay_order_id, amount_paise: args.amount_paise };
  },
});

export const cancelRazorpayCheckout = mutation({
  args: {
    razorpay_order_id: v.string(),
    checkout_attempt_id: v.string(),
  },
  returns: v.object({ released: v.boolean() }),
  handler: async (ctx, args) => {
    const checkoutAttemptId = cleanCheckoutAttemptId(args.checkout_attempt_id);
    const intent = await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q) =>
        q.eq("razorpay_order_id", cleanText(args.razorpay_order_id, 120)),
      )
      .first();
    if (
      !intent ||
      intent.checkout_attempt_id !== checkoutAttemptId ||
      intent.status !== "pending"
    ) {
      return { released: false };
    }
    await restoreReservedStock(ctx, intent.cart);
    await ctx.db.patch(intent._id, {
      status: "released",
      stock_reserved: false,
      error: "Customer closed or cancelled Razorpay Checkout.",
      reconcile_after: Date.now(),
      updated_at: nowIso(),
    });
    return { released: true };
  },
});

export const cleanupExpiredCheckoutIntents = internalMutation({
  args: {},
  handler: async (ctx) => {
    await releaseExpiredReservations(ctx);
  },
});

export const finalizeCheckoutIntent = internalMutation({
  args: {
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    amount_paise: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => finalizeCheckoutIntentHandler(ctx, args),
});

async function finalizeCheckoutIntentHandler(
  ctx: any,
  args: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    amount_paise?: number;
    currency?: string;
  },
) {
  const intent = await ctx.db
    .query("checkout_intents")
    .withIndex("by_razorpay_order_id", (q: any) =>
      q.eq("razorpay_order_id", args.razorpay_order_id),
    )
    .first();
  if (!intent) return null;
  if (
    (args.amount_paise !== undefined && args.amount_paise !== intent.amount_paise) ||
    (args.currency && args.currency !== "INR")
  ) {
    await ctx.db.patch(intent._id, {
      status: "recovery_required",
      payment_id: args.razorpay_payment_id,
      error: "Captured Razorpay amount does not match the reserved checkout total.",
      updated_at: nowIso(),
    });
    return null;
  }
  if (intent.status === "completed") {
    return await ctx.db
      .query("orders")
      .withIndex("by_payment_order_id", (q: any) =>
        q.eq("payment_order_id", args.razorpay_order_id),
      )
      .first();
  }
  const existingOrder = await ctx.db
    .query("orders")
    .withIndex("by_payment_order_id", (q: any) => q.eq("payment_order_id", args.razorpay_order_id))
    .first();
  if (existingOrder) {
    if (existingOrder.payment_id !== args.razorpay_payment_id) {
      throw new Error("This Razorpay order is already linked to another payment.");
    }
    await ctx.db.patch(intent._id, {
      status: "completed",
      stock_reserved: false,
      payment_id: args.razorpay_payment_id,
      error: null,
      reconcile_after: null,
      updated_at: nowIso(),
    });
    return existingOrder;
  }
  const stockIsReserved = intent.stock_reserved ?? intent.status === "pending";
  if (stockIsReserved) await restoreReservedStock(ctx, intent.cart);
  const order = await savePaidOrder(ctx, {
    cart: intent.cart,
    customer: intent.customer,
    user_id: intent.user_id ?? null,
    razorpay_order_id: args.razorpay_order_id,
    razorpay_payment_id: args.razorpay_payment_id,
    razorpay_signature: "verified-by-server",
    use_reserved_snapshot: true,
  });
  await ctx.db.patch(intent._id, {
    status: "completed",
    stock_reserved: false,
    payment_id: args.razorpay_payment_id,
    error: null,
    reconcile_after: null,
    updated_at: nowIso(),
  });
  return order;
}

export const saveVerifiedGuestOrder = internalMutation({
  args: {
    ...checkoutPayload,
    user_id: v.optional(v.union(v.string(), v.null())),
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    razorpay_signature: v.string(),
  },
  handler: async (ctx, args) => {
    return await savePaidOrder(ctx, args);
  },
});

export const verifyRazorpayPayment = action({
  args: {
    ...checkoutPayload,
    razorpay_order_id: v.string(),
    razorpay_payment_id: v.string(),
    razorpay_signature: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const { keySecret } = razorpayKeys();
    const expectedSignature = await hmacSha256Hex(
      keySecret,
      `${args.razorpay_order_id}|${args.razorpay_payment_id}`,
    );
    if (!timingSafeEqual(expectedSignature, args.razorpay_signature))
      throw new Error("Razorpay signature verification failed.");

    const savedOrder: any = await ctx.runQuery(internal.orders.findSavedPayment, {
      razorpay_order_id: args.razorpay_order_id,
      razorpay_payment_id: args.razorpay_payment_id,
    });
    if (savedOrder) return savedOrder;

    const reservedIntent = await ctx.runQuery(internal.orders.findCheckoutIntent, {
      razorpay_order_id: args.razorpay_order_id,
    });
    const expectedAmountPaise =
      reservedIntent?.amount_paise ??
      (await ctx.runQuery(api.orders.quoteCheckout, { cart: args.cart })).amountPaise;

    const [razorpayOrder, fetchedPayment] = await Promise.all([
      razorpayRequest(`/orders/${args.razorpay_order_id}`),
      razorpayRequest(`/payments/${args.razorpay_payment_id}`),
    ]);
    if (razorpayOrder.amount !== expectedAmountPaise || razorpayOrder.currency !== "INR") {
      throw new Error("Razorpay amount does not match the current cart total.");
    }
    if (
      fetchedPayment.order_id !== args.razorpay_order_id ||
      fetchedPayment.amount !== expectedAmountPaise ||
      fetchedPayment.currency !== "INR"
    ) {
      throw new Error("Razorpay payment does not match the current order.");
    }
    let payment = fetchedPayment;
    if (fetchedPayment.status === "authorized") {
      try {
        payment = await razorpayRequest(`/payments/${args.razorpay_payment_id}/capture`, {
          method: "POST",
          body: JSON.stringify({ amount: expectedAmountPaise, currency: "INR" }),
        });
      } catch {
        // A repeated callback can race with capture. Refetch before treating it as a failed paid order.
        payment = await razorpayRequest(`/payments/${args.razorpay_payment_id}`);
      }
    }
    if (payment.status !== "captured") throw new Error("Razorpay payment has not been captured.");
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await getAuthUserId(ctx) : null;

    const reservedOrder: any = await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
      razorpay_order_id: args.razorpay_order_id,
      razorpay_payment_id: args.razorpay_payment_id,
      amount_paise: fetchedPayment.amount,
      currency: fetchedPayment.currency,
    });
    if (reservedOrder) return reservedOrder;
    const hasIntent = await ctx.runQuery(internal.orders.findCheckoutIntent, {
      razorpay_order_id: args.razorpay_order_id,
    });
    if (hasIntent)
      throw new Error("Payment received, but this order needs manual recovery. Do not pay again.");
    return await ctx.runMutation(internal.orders.saveVerifiedGuestOrder, {
      cart: args.cart,
      customer: args.customer,
      subtotal: args.subtotal,
      shipping: args.shipping,
      total: args.total,
      user_id: userId,
      razorpay_order_id: args.razorpay_order_id,
      razorpay_payment_id: args.razorpay_payment_id,
      razorpay_signature: args.razorpay_signature,
    });
  },
});

export const findCheckoutIntent = internalQuery({
  args: { razorpay_order_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("checkout_intents")
      .withIndex("by_razorpay_order_id", (q: any) =>
        q.eq("razorpay_order_id", args.razorpay_order_id),
      )
      .first();
  },
});

export const listUnresolvedCheckoutIntents = internalQuery({
  args: { limit: v.optional(v.number()), now: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const statuses = ["pending", "released", "failed", "recovery_required"];
    const rows = [];
    const cutoff = args.now - PAYMENT_RECOVERY_WINDOW_MS;
    for (const status of statuses) {
      const matches = await ctx.db
        .query("checkout_intents")
        .withIndex("by_status_and_reconcile_after", (q) =>
          q.eq("status", status).lte("reconcile_after", args.now),
        )
        .take(limit);
      rows.push(
        ...matches.filter(
          (intent) =>
            intent.expires_at >= cutoff &&
            (status === "recovery_required" || status === "failed" || !intent.payment_id),
        ),
      );
    }
    return rows.sort((a, b) => b._creationTime - a._creationTime).slice(0, limit);
  },
});

export const markCheckoutIntentReconciled = internalMutation({
  args: {
    id: v.id("checkout_intents"),
    checked_at: v.number(),
    error: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.id);
    if (!intent || intent.status === "completed") return null;
    const attempts = Math.max(0, Number(intent.reconcile_attempts ?? 0)) + 1;
    const delay = RECONCILIATION_DELAYS_MS[Math.min(attempts, RECONCILIATION_DELAYS_MS.length - 1)];
    await ctx.db.patch(intent._id, {
      reconcile_attempts: attempts,
      last_reconciled_at: args.checked_at,
      reconcile_after: args.checked_at + delay,
      error: args.error === undefined ? intent.error : cleanNullable(args.error, 500),
      updated_at: nowIso(),
    });
    return null;
  },
});

export const recordPaymentReconciliationHealth = internalMutation({
  args: {
    checked: v.number(),
    finalized: v.number(),
    errors: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const key = "razorpay_reconciliation_health";
    const existing = await ctx.db
      .query("store_settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const previous = existing?.value as { checked_at?: number; error_count?: number } | undefined;
    const now = Date.now();
    const shouldWrite =
      args.finalized > 0 ||
      args.errors.length > 0 ||
      !previous?.checked_at ||
      now - previous.checked_at >= RECONCILIATION_HEARTBEAT_MS ||
      Number(previous.error_count ?? 0) > 0;
    if (!shouldWrite) return;
    const value = {
      checked_at: now,
      checked: args.checked,
      finalized: args.finalized,
      error_count: args.errors.length,
      errors: args.errors.slice(0, 3),
    };
    if (existing) await ctx.db.patch(existing._id, { value, updated_at: nowIso() });
    else await ctx.db.insert("store_settings", { key, value, updated_at: nowIso() });
  },
});

export const reconcileCapturedPayments = internalAction({
  args: {},
  handler: async (ctx) => {
    const checkedAt = Date.now();
    const intents: any[] = await ctx.runQuery(internal.orders.listUnresolvedCheckoutIntents, {
      limit: 75,
      now: checkedAt,
    });
    let finalized = 0;
    let checked = 0;
    const errors: string[] = [];
    for (const intent of intents) {
      checked += 1;
      try {
        const result = await razorpayRequest(`/orders/${intent.razorpay_order_id}/payments`);
        const payments = Array.isArray(result?.items) ? result.items : [];
        let recoverable = payments.find(
          (payment: any) =>
            payment?.status === "captured" &&
            payment?.amount === intent.amount_paise &&
            payment?.currency === "INR" &&
            payment?.order_id === intent.razorpay_order_id,
        );
        if (!recoverable) {
          const authorized = payments.find(
            (payment: any) =>
              payment?.status === "authorized" &&
              payment?.amount === intent.amount_paise &&
              payment?.currency === "INR" &&
              payment?.order_id === intent.razorpay_order_id,
          );
          if (authorized?.id) {
            try {
              recoverable = await razorpayRequest(
                `/payments/${cleanText(authorized.id, 120)}/capture`,
                {
                  method: "POST",
                  body: JSON.stringify({ amount: intent.amount_paise, currency: "INR" }),
                },
              );
            } catch {
              recoverable = await razorpayRequest(`/payments/${cleanText(authorized.id, 120)}`);
            }
          }
        }
        if (!recoverable?.id || recoverable.status !== "captured") {
          await ctx.runMutation(internal.orders.markCheckoutIntentReconciled, {
            id: intent._id,
            checked_at: checkedAt,
          });
          continue;
        }
        const order = await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
          razorpay_order_id: intent.razorpay_order_id,
          razorpay_payment_id: cleanText(recoverable.id, 120),
          amount_paise: recoverable.amount,
          currency: recoverable.currency,
        });
        if (order) finalized += 1;
        else {
          await ctx.runMutation(internal.orders.markCheckoutIntentReconciled, {
            id: intent._id,
            checked_at: checkedAt,
            error: "Captured payment needs manual recovery.",
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? cleanText(error.message, 160) : "Unknown reconciliation error";
        errors.push(`${intent.razorpay_order_id}: ${message}`);
        await ctx.runMutation(internal.orders.markCheckoutIntentReconciled, {
          id: intent._id,
          checked_at: checkedAt,
          error: message,
        });
      }
    }
    const result = { checked, finalized, errors: errors.slice(0, 10) };
    await ctx.runMutation(internal.orders.recordPaymentReconciliationHealth, result);
    return result;
  },
});

export const recordRazorpayAuditHealth = internalMutation({
  args: {
    checked_at: v.number(),
    checked: v.number(),
    recovered: v.number(),
    refunds_synced: v.number(),
    orphan_payment_ids: v.array(v.string()),
    errors: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = "razorpay_daily_audit_health";
    const existing = await ctx.db
      .query("store_settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const value = {
      checked_at: args.checked_at,
      checked: args.checked,
      recovered: args.recovered,
      refunds_synced: args.refunds_synced,
      orphan_payment_ids: args.orphan_payment_ids.slice(0, 20),
      errors: args.errors.slice(0, 10),
    };
    const timestamp = nowIso();
    if (existing) await ctx.db.patch(existing._id, { value, updated_at: timestamp });
    else await ctx.db.insert("store_settings", { key, value, updated_at: timestamp });
    return null;
  },
});

export const auditRecentRazorpayPayments = internalAction({
  args: {},
  returns: v.object({
    checked: v.number(),
    recovered: v.number(),
    refunds_synced: v.number(),
    orphan_payment_ids: v.array(v.string()),
    errors: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const checkedAt = Date.now();
    const to = Math.floor(checkedAt / 1000);
    const from = to - 48 * 60 * 60;
    const payments: any[] = [];
    try {
      for (const skip of [0, 100]) {
        const response = await razorpayRequest(
          `/payments?from=${from}&to=${to}&count=100&skip=${skip}`,
        );
        const page = Array.isArray(response?.items) ? response.items : [];
        payments.push(...page);
        if (page.length < 100) break;
      }
    } catch (error) {
      const result = {
        checked: 0,
        recovered: 0,
        refunds_synced: 0,
        orphan_payment_ids: [] as string[],
        errors: [
          `Razorpay payment list: ${error instanceof Error ? cleanText(error.message, 180) : "Audit failed"}`,
        ],
      };
      await ctx.runMutation(internal.orders.recordRazorpayAuditHealth, {
        checked_at: checkedAt,
        ...result,
      });
      return result;
    }

    let recovered = 0;
    let refundsSynced = 0;
    const orphanPaymentIds: string[] = [];
    const errors: string[] = [];
    for (const payment of payments) {
      if (!payment?.id || !payment?.order_id || !["captured", "refunded"].includes(payment.status))
        continue;
      try {
        let saved: any = await ctx.runQuery(internal.orders.findSavedPayment, {
          razorpay_order_id: cleanText(payment.order_id, 120),
          razorpay_payment_id: cleanText(payment.id, 120),
        });
        if (!saved) {
          const intent: any = await ctx.runQuery(internal.orders.findCheckoutIntent, {
            razorpay_order_id: cleanText(payment.order_id, 120),
          });
          if (intent) {
            saved = await ctx.runMutation(internal.orders.finalizeCheckoutIntent, {
              razorpay_order_id: cleanText(payment.order_id, 120),
              razorpay_payment_id: cleanText(payment.id, 120),
              amount_paise: payment.amount,
              currency: payment.currency,
            });
            if (saved) recovered += 1;
            else
              errors.push(`${cleanText(payment.id, 120)}: captured payment needs manual recovery`);
          } else {
            const razorpayOrder = await razorpayRequest(
              `/orders/${cleanText(payment.order_id, 120)}`,
            );
            if (String(razorpayOrder?.receipt ?? "").startsWith("BADR-")) {
              orphanPaymentIds.push(cleanText(payment.id, 120));
            }
          }
        }
        if (saved && Number(payment.amount_refunded ?? 0) > 0) {
          const refundResult = await ctx.runMutation(internal.orders.applyRazorpayRefund, {
            razorpay_payment_id: cleanText(payment.id, 120),
            amount_refunded_paise: payment.amount_refunded,
          });
          if (refundResult.updated) refundsSynced += 1;
        }
      } catch (error) {
        errors.push(
          `${cleanText(payment.id, 120)}: ${error instanceof Error ? cleanText(error.message, 180) : "Audit failed"}`,
        );
      }
    }
    const result = {
      checked: payments.length,
      recovered,
      refunds_synced: refundsSynced,
      orphan_payment_ids: orphanPaymentIds.slice(0, 20),
      errors: errors.slice(0, 10),
    };
    await ctx.runMutation(internal.orders.recordRazorpayAuditHealth, {
      checked_at: checkedAt,
      ...result,
    });
    return result;
  },
});

export const cleanupPaymentTechnicalRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoffMs = Date.now() - PAYMENT_TECHNICAL_RETENTION_MS;
    const cutoffIso = new Date(cutoffMs).toISOString();
    let checkoutIntentsDeleted = 0;
    for (const status of ["completed", "released", "failed"]) {
      const rows = await ctx.db
        .query("checkout_intents")
        .withIndex("by_status_and_expires_at", (q) =>
          q.eq("status", status).lt("expires_at", cutoffMs),
        )
        .take(250);
      for (const row of rows) {
        await ctx.db.delete(row._id);
        checkoutIntentsDeleted += 1;
      }
    }
    const webhookRows = await ctx.db
      .query("razorpay_webhook_events")
      .withIndex("by_created_at", (q) => q.lt("created_at", cutoffIso))
      .take(250);
    for (const row of webhookRows) await ctx.db.delete(row._id);
    return { checkoutIntentsDeleted, webhookEventsDeleted: webhookRows.length };
  },
});

export const listPaymentRecoveries = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("checkout_intents")
      .withIndex("by_status", (q) => q.eq("status", "recovery_required"))
      .order("desc")
      .take(100);
    return rows
      .map(({ _id, _creationTime, ...row }) => ({ id: _id, ...row }))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
});

export const prepareRefundRequest = internalMutation({
  args: {
    order_id: v.id("orders"),
    amount_inr: v.number(),
    reason: v.string(),
  },
  returns: v.object({
    payment_id: v.string(),
    order_number: v.string(),
    amount_paise: v.number(),
    target_refunded_paise: v.number(),
    idempotency_key: v.string(),
    reason: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.order_id);
    if (!order) throw new Error("Order not found.");
    if (!order.payment_id || order.payment_provider !== "RAZORPAY") {
      throw new Error("This order does not have a refundable Razorpay payment.");
    }
    if (!["paid", "partially_refunded"].includes(order.payment_status ?? "")) {
      throw new Error("Only captured payments can be refunded.");
    }
    const reason = cleanText(args.reason, 240);
    if (reason.length < 3) throw new Error("Add a refund reason for the audit trail.");
    const amountPaise = Math.round(args.amount_inr * 100);
    const totalPaise = Math.round(order.total * 100);
    const refundedPaise = Math.round(Number(order.refund_amount_inr ?? 0) * 100);
    const remainingPaise = Math.max(0, totalPaise - refundedPaise);
    if (!Number.isFinite(amountPaise) || amountPaise < 100 || amountPaise > remainingPaise) {
      throw new Error(`Refund must be between ₹1 and ₹${(remainingPaise / 100).toFixed(2)}.`);
    }
    const targetRefundedPaise = refundedPaise + amountPaise;
    const idempotencyKey = `badr-${String(order._id)}-${targetRefundedPaise}`;
    if (
      ["pending", "attention_required"].includes(order.refund_status ?? "") &&
      order.refund_request_id &&
      order.refund_request_id !== idempotencyKey
    ) {
      throw new Error(
        "A previous refund request is still unresolved. Retry that exact amount first.",
      );
    }
    const timestamp = nowIso();
    await ctx.db.patch(order._id, {
      refund_status: "pending",
      refund_request_id: idempotencyKey,
      refund_requested_at: timestamp,
      refund_reason: reason,
      refund_error: null,
      updated_at: timestamp,
    });
    await writeAuditLog(ctx, {
      action: "order.refund.request",
      entityType: "order",
      entityId: String(order._id),
      summary: `${order.order_number}: ₹${(amountPaise / 100).toFixed(2)}`,
      metadata: { amount_paise: amountPaise, reason, idempotency_key: idempotencyKey },
    });
    return {
      payment_id: order.payment_id,
      order_number: order.order_number,
      amount_paise: amountPaise,
      target_refunded_paise: targetRefundedPaise,
      idempotency_key: idempotencyKey,
      reason,
    };
  },
});

export const recordRefundResponse = internalMutation({
  args: {
    order_id: v.id("orders"),
    refund_id: v.string(),
    refund_status: v.string(),
    target_refunded_paise: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.order_id);
    if (!order) throw new Error("Order not found.");
    const status = cleanText(args.refund_status, 40).toLowerCase();
    if (status === "processed") {
      await applyProcessedRefund(ctx, order, args.target_refunded_paise, args.refund_id);
    } else {
      await ctx.db.patch(order._id, {
        refund_id: cleanText(args.refund_id, 120),
        refund_status: status === "failed" ? "failed" : "pending",
        refund_error: status === "failed" ? "Razorpay reported that the refund failed." : null,
        updated_at: nowIso(),
      });
    }
    await writeAuditLog(ctx, {
      action: "order.refund.response",
      entityType: "order",
      entityId: String(order._id),
      summary: `${args.refund_id}: ${status}`,
      metadata: { target_refunded_paise: args.target_refunded_paise },
    });
    return null;
  },
});

export const recordRefundRequestError = internalMutation({
  args: { order_id: v.id("orders"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.order_id);
    if (!order) return null;
    const error = cleanText(args.error, 500) || "Refund request outcome is unknown.";
    await ctx.db.patch(order._id, {
      refund_status: "attention_required",
      refund_error: error,
      updated_at: nowIso(),
    });
    await writeAuditLog(ctx, {
      action: "order.refund.attention_required",
      entityType: "order",
      entityId: String(order._id),
      summary: error,
    });
    return null;
  },
});

export const refundOrder = action({
  args: { orderId: v.id("orders"), amountInr: v.number(), reason: v.string() },
  returns: v.object({ refundId: v.string(), status: v.string(), amountInr: v.number() }),
  handler: async (ctx, args): Promise<{ refundId: string; status: string; amountInr: number }> => {
    const prepared: {
      payment_id: string;
      order_number: string;
      amount_paise: number;
      target_refunded_paise: number;
      idempotency_key: string;
      reason: string;
    } = await ctx.runMutation(internal.orders.prepareRefundRequest, {
      order_id: args.orderId,
      amount_inr: args.amountInr,
      reason: args.reason,
    });
    try {
      const refund = await razorpayRequest(
        `/payments/${encodeURIComponent(prepared.payment_id)}/refund`,
        {
          method: "POST",
          headers: { "X-Refund-Idempotency": prepared.idempotency_key },
          body: JSON.stringify({
            amount: prepared.amount_paise,
            speed: "normal",
            receipt: prepared.idempotency_key.slice(0, 40),
            notes: {
              order_number: prepared.order_number,
              reason: prepared.reason,
            },
          }),
        },
      );
      const refundId = cleanText(refund?.id, 120);
      const status = cleanText(refund?.status, 40).toLowerCase();
      if (!refundId || !["pending", "processed", "failed"].includes(status)) {
        throw new Error("Razorpay returned an invalid refund response.");
      }
      await ctx.runMutation(internal.orders.recordRefundResponse, {
        order_id: args.orderId,
        refund_id: refundId,
        refund_status: status,
        target_refunded_paise: prepared.target_refunded_paise,
      });
      return { refundId, status, amountInr: prepared.amount_paise / 100 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refund request failed.";
      await ctx.runMutation(internal.orders.recordRefundRequestError, {
        order_id: args.orderId,
        error: message,
      });
      throw new Error(
        `${message} The request is retained with an idempotency key; verify it before changing the amount.`,
      );
    }
  },
});

export const recordRazorpayWebhook = internalMutation({
  args: {
    event_id: v.string(),
    event_type: v.string(),
    razorpay_order_id: v.optional(v.string()),
    razorpay_payment_id: v.optional(v.string()),
    amount_paise: v.optional(v.number()),
    amount_refunded_paise: v.optional(v.number()),
    refund_id: v.optional(v.string()),
    refund_status: v.optional(v.string()),
    refund_error: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  returns: v.object({ duplicate: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("razorpay_webhook_events")
      .withIndex("by_event_id", (q) => q.eq("event_id", args.event_id))
      .first();
    if (existing) return { duplicate: true };
    await ctx.db.insert("razorpay_webhook_events", {
      event_id: args.event_id,
      event_type: args.event_type,
      created_at: nowIso(),
    });
    if (
      args.event_type === "payment.captured" &&
      args.razorpay_order_id &&
      args.razorpay_payment_id
    ) {
      await finalizeCheckoutIntentHandler(ctx, {
        razorpay_order_id: args.razorpay_order_id,
        razorpay_payment_id: args.razorpay_payment_id,
        amount_paise: args.amount_paise,
        currency: args.currency,
      });
    }
    if (args.event_type === "payment.failed" && args.razorpay_order_id) {
      await failCheckoutIntent(ctx, {
        razorpay_order_id: args.razorpay_order_id,
        razorpay_payment_id: args.razorpay_payment_id ?? null,
        error: "Razorpay payment failed.",
      });
    }
    if (
      (args.event_type.startsWith("refund.") || args.event_type === "payment.refunded") &&
      args.razorpay_payment_id
    ) {
      const order = await ctx.db
        .query("orders")
        .withIndex("by_payment_id", (q) => q.eq("payment_id", args.razorpay_payment_id))
        .first();
      if (order) {
        if (
          (args.event_type === "refund.processed" || args.event_type === "payment.refunded") &&
          args.amount_refunded_paise !== undefined
        ) {
          await applyProcessedRefund(
            ctx,
            order,
            args.amount_refunded_paise,
            args.refund_id ?? null,
          );
        } else if (args.event_type === "refund.failed") {
          await ctx.db.patch(order._id, {
            refund_status: "failed",
            ...(args.refund_id ? { refund_id: args.refund_id } : {}),
            refund_error:
              cleanNullable(args.refund_error, 500) ?? "Razorpay reported a failed refund.",
            updated_at: nowIso(),
          });
        } else if (args.event_type === "refund.created") {
          await ctx.db.patch(order._id, {
            refund_status: "pending",
            ...(args.refund_id ? { refund_id: args.refund_id } : {}),
            refund_error: null,
            updated_at: nowIso(),
          });
        }
      }
    }
    return { duplicate: false };
  },
});

export const applyRazorpayRefund = internalMutation({
  args: {
    razorpay_payment_id: v.string(),
    amount_refunded_paise: v.number(),
  },
  returns: v.object({ updated: v.boolean(), order_number: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_payment_id", (q) => q.eq("payment_id", args.razorpay_payment_id))
      .first();
    if (!order) return { updated: false, order_number: null };
    await applyProcessedRefund(ctx, order, args.amount_refunded_paise);
    return { updated: true, order_number: order.order_number };
  },
});

export const razorpayWebhook = httpAction(async (ctx, request) => {
  const currentSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const previousSecret = process.env.RAZORPAY_WEBHOOK_SECRET_PREVIOUS;
  if (!currentSecret) return new Response("Webhook secret is not configured.", { status: 503 });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return new Response("Payload too large.", { status: 413 });
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) {
    return new Response("Payload too large.", { status: 413 });
  }
  const receivedSignature = (request.headers.get("x-razorpay-signature") ?? "")
    .trim()
    .toLowerCase();
  const signatures = await Promise.all(
    [currentSecret, previousSecret]
      .filter((secret): secret is string => Boolean(secret))
      .map((secret) => hmacSha256Hex(secret, rawBody)),
  );
  if (!signatures.some((expected) => timingSafeEqual(expected, receivedSignature)))
    return new Response("Invalid signature.", { status: 401 });
  const eventId = cleanText(request.headers.get("x-razorpay-event-id"), 200);
  if (!eventId) return new Response("Missing event ID.", { status: 400 });
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }
  let payment = payload?.payload?.payment?.entity;
  const refund = payload?.payload?.refund?.entity;
  const order = payload?.payload?.order?.entity;
  const eventType = cleanText(payload?.event, 80);
  if (eventType === "order.paid" && !payment?.id && order?.id) {
    const result = await razorpayRequest(`/orders/${cleanText(order.id, 120)}/payments`);
    const payments = Array.isArray(result?.items) ? result.items : [];
    payment = payments.find(
      (item: any) =>
        item?.status === "captured" &&
        item?.order_id === order.id &&
        item?.currency === "INR" &&
        Number.isFinite(item?.amount),
    );
  }
  if (
    eventType === "payment.authorized" &&
    payment?.id &&
    payment?.order_id &&
    Number.isFinite(payment?.amount)
  ) {
    const intent = await ctx.runQuery(internal.orders.findCheckoutIntent, {
      razorpay_order_id: cleanText(payment.order_id, 120),
    });
    const matchesIntent =
      intent && intent.amount_paise === payment.amount && (payment.currency ?? "INR") === "INR";
    if (!matchesIntent) {
      await ctx.runMutation(internal.orders.recordRazorpayWebhook, {
        event_id: eventId,
        event_type: eventType,
        razorpay_order_id: cleanText(payment.order_id, 120),
        razorpay_payment_id: cleanText(payment.id, 120),
        amount_paise: payment.amount,
        currency: payment.currency ? cleanText(payment.currency, 12) : undefined,
      });
      return new Response("accepted", { status: 202 });
    }
    try {
      payment = await razorpayRequest(`/payments/${cleanText(payment.id, 120)}/capture`, {
        method: "POST",
        body: JSON.stringify({ amount: payment.amount, currency: payment.currency ?? "INR" }),
      });
    } catch {
      payment = await razorpayRequest(`/payments/${cleanText(payment.id, 120)}`);
    }
  }
  if (
    (eventType === "refund.processed" || eventType === "payment.refunded") &&
    refund?.payment_id
  ) {
    payment = await razorpayRequest(`/payments/${cleanText(refund.payment_id, 120)}`);
  }
  const normalizedEventType =
    eventType === "refund.processed" || eventType === "payment.refunded"
      ? eventType
      : payment?.status === "captured"
        ? "payment.captured"
        : eventType;
  await ctx.runMutation(internal.orders.recordRazorpayWebhook, {
    event_id: eventId,
    event_type: normalizedEventType,
    razorpay_order_id: payment?.order_id
      ? cleanText(payment.order_id, 120)
      : order?.id
        ? cleanText(order.id, 120)
        : undefined,
    razorpay_payment_id: payment?.id
      ? cleanText(payment.id, 120)
      : refund?.payment_id
        ? cleanText(refund.payment_id, 120)
        : undefined,
    amount_paise: Number.isFinite(payment?.amount) ? payment.amount : undefined,
    amount_refunded_paise: Number.isFinite(payment?.amount_refunded)
      ? payment.amount_refunded
      : undefined,
    refund_id: refund?.id ? cleanText(refund.id, 120) : undefined,
    refund_status: refund?.status ? cleanText(refund.status, 40) : undefined,
    refund_error:
      refund?.error_description || refund?.failure_reason || refund?.error_code
        ? cleanText(refund.error_description || refund.failure_reason || refund.error_code, 500)
        : undefined,
    currency: payment?.currency ? cleanText(payment.currency, 12) : undefined,
  });
  return new Response("ok", { status: 200 });
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireIdentity(ctx);
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_user_id", (q) => q.eq("user_id", auth.userId))
      .order("desc")
      .take(200);
    const enriched = await Promise.all(rows.map((row) => orderWithItems(ctx, row)));
    return enriched.sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
  },
});

export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("orders")
      .order("desc")
      .take(Math.min(Math.max(args.limit ?? 100, 1), 500));
    const enriched = await Promise.all(rows.map((row) => orderWithItems(ctx, row)));
    return enriched.sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
  },
});

export const updateStatus = mutation({
  args: { id: v.id("orders"), status: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = cleanText(args.status, 24).toLowerCase();
    if (!DIRECT_ORDER_STATUSES.has(status)) {
      throw new Error("Use the dedicated cancellation or return control for this status.");
    }
    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("Order not found.");
    const current = order.status ?? "processing";
    if (current === status) return true;
    const allowedTransitions: Record<string, Set<string>> = {
      processing: new Set(["shipped", "delivered"]),
      shipped: new Set(["delivered"]),
      delivered: new Set(),
    };
    if (!allowedTransitions[current]?.has(status)) {
      throw new Error(`Order cannot move from ${current} to ${status}.`);
    }
    await ctx.db.patch(args.id, {
      status,
      ...(status !== "processing" ? { inventory_attention: false } : {}),
      updated_at: nowIso(),
    });
    await writeAuditLog(ctx, {
      action: "order.status.update",
      entityType: "order",
      entityId: args.id,
      summary: status,
    });
    return true;
  },
});

export const closeOrder = mutation({
  args: {
    id: v.id("orders"),
    outcome: v.union(v.literal("cancelled"), v.literal("returned")),
    restock: v.boolean(),
    reason: v.string(),
  },
  returns: v.object({ outcome: v.string(), restocked: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("Order not found.");
    const reason = cleanText(args.reason, 240);
    if (reason.length < 3) throw new Error("Add a reason for the audit trail.");
    const current = order.status ?? "processing";
    if (args.outcome === "cancelled" && !["processing", "cancelled"].includes(current)) {
      throw new Error("Only an unshipped processing order can be cancelled.");
    }
    if (args.outcome === "returned" && !["shipped", "delivered", "returned"].includes(current)) {
      throw new Error("Only a shipped or delivered order can be marked returned.");
    }

    let restocked = Boolean(order.inventory_restocked_at);
    let inventoryAttention = false;
    const timestamp = nowIso();
    if (args.restock && !restocked) {
      const items = await ctx.db
        .query("order_items")
        .withIndex("by_order_id", (q) => q.eq("order_id", args.id))
        .take(100);
      for (const item of items) {
        if (!item.product_id) {
          inventoryAttention = true;
          continue;
        }
        const product: any = await ctx.db.get(item.product_id as any);
        if (!product) {
          inventoryAttention = true;
          continue;
        }
        const nextStock = Math.max(0, Number(product.stock_quantity ?? 0) + item.quantity);
        await ctx.db.patch(product._id, {
          stock_quantity: nextStock,
          in_stock: nextStock > 0,
          updated_at: timestamp,
        });
      }
      restocked = true;
    }

    await ctx.db.patch(order._id, {
      status: args.outcome,
      ...(args.outcome === "cancelled"
        ? { cancelled_at: order.cancelled_at ?? timestamp, cancellation_reason: reason }
        : { returned_at: order.returned_at ?? timestamp, return_reason: reason }),
      ...(restocked ? { inventory_restocked_at: order.inventory_restocked_at ?? timestamp } : {}),
      inventory_attention: inventoryAttention,
      updated_at: timestamp,
    });
    await writeAuditLog(ctx, {
      action: `order.${args.outcome}`,
      entityType: "order",
      entityId: String(order._id),
      summary: reason,
      metadata: {
        restock_requested: args.restock,
        restocked,
        inventory_attention: inventoryAttention,
      },
    });
    return { outcome: args.outcome, restocked };
  },
});

export const updateTracking = mutation({
  args: {
    id: v.id("orders"),
    carrier: v.optional(v.union(v.string(), v.null())),
    trackingNumber: v.string(),
    trackingUrl: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = await ctx.db.get(args.id);
    if (!current) throw new Error("Order not found.");
    if (["cancelled", "returned"].includes(current.status ?? "")) {
      throw new Error("Tracking cannot be added to a cancelled or returned order.");
    }
    const trackingNumber = cleanText(args.trackingNumber, 120);
    if (!trackingNumber) throw new Error("Tracking number is required.");
    await ctx.db.patch(args.id, {
      tracking_carrier: cleanNullable(args.carrier, 80),
      tracking_number: trackingNumber,
      tracking_url: cleanTrackingUrl(args.trackingUrl),
      status: current.status === "delivered" ? "delivered" : "shipped",
      inventory_attention: false,
      updated_at: nowIso(),
    });
    await writeAuditLog(ctx, {
      action: "order.tracking.update",
      entityType: "order",
      entityId: args.id,
      summary: trackingNumber,
      metadata: { carrier: args.carrier ?? null },
    });
    const order = await ctx.db.get(args.id);
    return order ? await orderWithItems(ctx, order) : null;
  },
});

export const getByNumber = query({
  args: { orderNumber: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const rawOrderNumber = cleanText(args.orderNumber, 40).toUpperCase();
    const orderNumber = /^\d+$/.test(rawOrderNumber) ? `#${rawOrderNumber}` : rawOrderNumber;
    const email = cleanEmail(args.email);
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("order_number", orderNumber))
      .first();
    if (!order || order.customer_email?.trim().toLowerCase() !== email) return null;
    return await orderWithItems(ctx, order);
  },
});
