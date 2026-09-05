import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";
import { checkoutShippingForCountry } from "./shipping";
import { checkoutDeadline } from "@/lib/checkoutDeadline";

export interface CheckoutCartLine {
  cartKey?: string;
  productId: string;
  qty: number;
  name: string;
  price: number;
  priceInr?: number | null;
  image?: string | null;
  slug?: string | null;
  weightG?: number | null;
  shippingClass?: string | null;
  selectedColor?: string | null;
  selectedSize?: string | null;
}

export interface CheckoutCustomer {
  email: string;
  phone: string;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export const shippingRate = (
  _subtotal: number,
  _cart: CheckoutCartLine[] = [],
  country = "India",
) => checkoutShippingForCountry(country).amount;

export async function createRazorpayCheckoutOrder(args: {
  cart: CheckoutCartLine[];
  customer: CheckoutCustomer;
  subtotal: number;
  shipping: number;
  total: number;
  checkoutAttemptId: string;
  turnstileToken: string;
}) {
  return await checkoutDeadline(
    convex.action(api.orders.createRazorpayCheckoutOrder, args),
    "The connection interrupted checkout preparation. Check your connection and try again; this checkout attempt will be reused safely.",
  );
}

export async function cancelRazorpayCheckout(razorpayOrderId: string, checkoutAttemptId: string) {
  return await checkoutDeadline(
    convex.mutation(api.orders.cancelRazorpayCheckout, {
      razorpay_order_id: razorpayOrderId,
      checkout_attempt_id: checkoutAttemptId,
    }),
    "Checkout release is still processing.",
    10000,
  );
}

export interface RazorpayVerificationArgs {
  cart: CheckoutCartLine[];
  customer: CheckoutCustomer;
  subtotal: number;
  shipping: number;
  total: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function verifyRazorpayPayment(args: RazorpayVerificationArgs) {
  return await checkoutDeadline(
    convex.action(api.orders.verifyRazorpayPayment, args),
    "Payment confirmation is still processing. Do not pay again.",
    20000,
  );
}

export async function verifyRazorpayPaymentWithRetry(args: RazorpayVerificationArgs, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await verifyRazorpayPayment(args);
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts)
        await new Promise((resolve) => window.setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function trackOrder(orderNumber: string, email: string) {
  return await convex.query(api.orders.getByNumber, { orderNumber, email });
}
