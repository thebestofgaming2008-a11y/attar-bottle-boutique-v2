import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { checkoutDeadline } from "@/lib/checkoutDeadline";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, MessageCircle } from "lucide-react";
import { SiteFooter, StoreShell } from "@/components/store/StoreShell";
import { useCart } from "@/components/store/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { listActiveProducts } from "@/services/productService";
import {
  cancelRazorpayCheckout,
  createRazorpayCheckoutOrder,
  verifyRazorpayPaymentWithRetry,
  type CheckoutCartLine,
  type CheckoutCustomer,
} from "@/services/orderService";
import { inr } from "@/lib/products";
import { useAuth } from "@/contexts/AuthContext";
import { SearchSelect } from "@/components/ui/search-select";
import { COUNTRY_OPTIONS, countryNameFromCode } from "@/lib/countries";
import { api } from "../../convex/_generated/api";
import { loadCheckoutScript } from "@/lib/checkoutScript";
import {
  cartFingerprint,
  PAYMENT_RECOVERY_KEY,
  readPendingPayment,
  type PendingPayment,
} from "@/lib/checkoutRecovery";

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  close: () => void;
  on: (
    event: "payment.failed",
    callback: (response: {
      error?: {
        code?: string;
        description?: string;
        reason?: string;
        source?: string;
        step?: string;
        metadata?: { payment_id?: string; order_id?: string };
      };
    }) => void,
  ) => void;
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light";
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

type StorefrontConfigResponse = {
  whatsappOrderNumber?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
    turnstile?: TurnstileApi;
  }
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — BADR" },
      { name: "description", content: "Secure BADR checkout for India and international orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function loadRazorpay() {
  return loadCheckoutScript(
    "https://checkout.razorpay.com/v1/checkout.js",
    () => Boolean(window.Razorpay),
    "Could not load Razorpay Checkout. Check your connection and try again.",
  );
}

function loadTurnstile() {
  return loadCheckoutScript(
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    () => Boolean(window.turnstile),
    "Security check did not load. Check your connection and reload this page.",
  );
}

function countryIsIndia(country: string) {
  return ["india", "in", "bharat"].includes(country.trim().toLowerCase());
}

function indianMobileDigits(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0091")) digits = digits.slice(4);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function razorpayContact(phone: string) {
  const digits = indianMobileDigits(phone);
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return phone.trim();
}

function razorpayFailureMessage(error?: {
  description?: string;
  reason?: string;
  source?: string;
}) {
  if (error?.reason === "payment_timed_out") {
    return "Razorpay did not receive a completed UPI approval. This can involve the app handoff or bank response. If no money was debited, use Show All Options in Razorpay to try another available method.";
  }
  if (error?.reason === "payment_risk_check_failed") {
    return "The bank or payment network declined this attempt. Retry with a different real card, UPI app or UPI QR.";
  }
  if (error?.reason === "incorrect_card_details") {
    return "This card could not be used. Check the card details or retry with UPI or another real card.";
  }
  return (
    error?.description || "Payment failed. Retry in Razorpay or choose another payment method."
  );
}

function validateCheckoutCustomer(customer: CheckoutCustomer) {
  if (!customer.name.trim()) throw new Error("Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
    throw new Error("Enter a valid email address.");
  }
  const phoneDigits = customer.phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new Error("Enter a valid WhatsApp number with country code.");
  }
  if (
    countryIsIndia(customer.country) &&
    !/^[6-9]\d{9}$/.test(indianMobileDigits(customer.phone))
  ) {
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }
  if (
    !customer.country.trim() ||
    !customer.address_line_1.trim() ||
    !customer.city.trim() ||
    (countryIsIndia(customer.country) && (!customer.state?.trim() || !customer.postal_code.trim()))
  ) {
    throw new Error("Complete your shipping address.");
  }
}

const BUILD_WHATSAPP_ORDER_NUMBER = String(
  import.meta.env.VITE_WHATSAPP_ORDER_NUMBER ?? "",
).replace(/\D/g, "");
const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim();
const RAZORPAY_KEY_ID = String(import.meta.env.VITE_RAZORPAY_KEY_ID ?? "").trim();
const RAZORPAY_IS_LIVE = RAZORPAY_KEY_ID.startsWith("rzp_live_");
const RAZORPAY_IS_AVAILABLE =
  RAZORPAY_IS_LIVE || (import.meta.env.DEV && RAZORPAY_KEY_ID.startsWith("rzp_test_"));

function CheckoutPage() {
  const cart = useCart();
  const auth = useAuth();
  const addresses = useQuery(api.addresses.listMine, auth.user ? {} : "skip");
  const navigate = useNavigate();
  const { detectedCountry, format, rateSource } = useCurrency();
  const [customer, setCustomer] = useState<CheckoutCustomer>({
    name: "",
    email: "",
    phone: "",
    country: "India",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [busy, setBusy] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [failureReference, setFailureReference] = useState("");
  const completingRef = useRef(false);
  const razorpayRef = useRef<RazorpayInstance | null>(null);
  const submitLockRef = useRef(false);
  const countryChosenRef = useRef(false);
  const recoveryStatus = useQuery(
    api.orders.checkoutStatus,
    pendingPayment
      ? {
          razorpay_order_id: pendingPayment.orderId,
          checkout_attempt_id: pendingPayment.attemptId,
        }
      : "skip",
  );
  const [savedAddressId, setSavedAddressId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [whatsappOrderNumber, setWhatsappOrderNumber] = useState(BUILD_WHATSAPP_ORDER_NUMBER);
  const [whatsappConfigLoading, setWhatsappConfigLoading] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [checkoutAttemptId, setCheckoutAttemptId] = useState(() => crypto.randomUUID());
  const turnstileHostRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const isIndia = countryIsIndia(customer.country);

  useEffect(() => {
    try {
      setPendingPayment(readPendingPayment(window.sessionStorage));
    } catch {
      /* Storage may be disabled. */
    }
  }, []);

  const completePayment = useCallback(
    async (orderNumber: string, payment: PendingPayment) => {
      if (!orderNumber || completingRef.current) return;
      completingRef.current = true;
      try {
        window.sessionStorage.removeItem(PAYMENT_RECOVERY_KEY);
      } catch {
        /* Optional recovery storage. */
      }
      // Do not erase products added after an earlier checkout was interrupted.
      if (cartFingerprint(cart.lines) === payment.cartFingerprint) cart.clear();
      setSuccess(`Payment confirmed: ${orderNumber}`);
      setMessage(null);
      setPendingPayment(null);
      try {
        razorpayRef.current?.close();
      } catch {
        /* Confirmation is already verified. */
      }
      setBusy(false);
      try {
        await navigate({
          to: "/order-confirmation",
          search: { order: orderNumber, email: payment.email },
        });
      } catch {
        window.location.assign(
          `/order-confirmation?${new URLSearchParams({ order: orderNumber, email: payment.email })}`,
        );
      }
    },
    [cart, navigate],
  );

  useEffect(() => {
    if (pendingPayment && recoveryStatus?.orderNumber) {
      void completePayment(recoveryStatus.orderNumber, pendingPayment);
    }
  }, [completePayment, pendingPayment, recoveryStatus]);

  useEffect(() => {
    void loadRazorpay().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/storefront-config", {
      headers: { accept: "application/json" },
      cache: "no-store",
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<StorefrontConfigResponse>)
          : Promise.reject(new Error(`Storefront configuration failed (${response.status})`)),
      )
      .then((data) => {
        if (cancelled) return;
        const digits = String(data.whatsappOrderNumber ?? "").replace(/\D/g, "");
        setWhatsappOrderNumber(digits.length >= 7 && digits.length <= 15 ? digits : "");
      })
      .catch(() => {
        if (!cancelled) setWhatsappOrderNumber(BUILD_WHATSAPP_ORDER_NUMBER);
      })
      .finally(() => {
        if (!cancelled) setWhatsappConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isIndia || !TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    void loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || !turnstileHostRef.current) return;
        turnstileWidgetIdRef.current = window.turnstile.render(turnstileHostRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: "checkout",
          theme: "light",
          size: "flexible",
          callback: (token) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () => setTurnstileToken(""),
        });
      })
      .catch((error) => {
        if (!cancelled)
          setMessage(error instanceof Error ? error.message : "Security check did not load.");
      });
    return () => {
      cancelled = true;
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      }
      turnstileWidgetIdRef.current = null;
      setTurnstileToken("");
    };
  }, [isIndia]);

  function resetCheckoutProtection(newAttempt = true) {
    setTurnstileToken("");
    if (newAttempt) setCheckoutAttemptId(crypto.randomUUID());
    if (turnstileWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  }

  useEffect(() => {
    if (!detectedCountry || countryChosenRef.current || submitLockRef.current) return;
    const detected = countryNameFromCode(detectedCountry);
    if (detected) setCustomer((current) => ({ ...current, country: detected }));
  }, [detectedCountry]);

  const savedAddressOptions = useMemo(
    () => [
      { value: "", label: "Enter a new address", keywords: "new blank" },
      ...(addresses || []).map((item) => ({
        value: item.id,
        label: `${item.full_name || "Saved address"} — ${item.city || item.country || ""}`,
        keywords: [item.address_line_1, item.state, item.postal_code, item.country]
          .filter(Boolean)
          .join(" "),
      })),
    ],
    [addresses],
  );

  const totalLabel = useMemo(
    () => (isIndia || rateSource === "fallback" ? inr(cart.subtotal) : format(cart.subtotal)),
    [cart.subtotal, format, isIndia, rateSource],
  );

  const update = (field: keyof CheckoutCustomer, value: string) => {
    if (field === "country") countryChosenRef.current = true;
    setCustomer((current) => ({ ...current, [field]: value }));
  };

  async function resolveCheckoutCart(): Promise<CheckoutCartLine[]> {
    const catalog = await checkoutDeadline(
      listActiveProducts(),
      "Could not refresh the cart. Check your connection and try again.",
      20000,
    );
    return cart.lines.map((line) => {
      const product = catalog.find(
        (candidate) => candidate.id === line.productId || candidate.slug === line.slug,
      );
      if (!product)
        throw new Error(`${line.name} is no longer available. Remove it and add it again.`);
      return {
        cartKey: line.id,
        productId: product.id,
        qty: line.qty,
        name: product.name,
        price: line.price,
        priceInr: line.price,
        image: line.image,
        slug: product.slug,
        selectedColor: line.selectedColor ?? null,
        selectedSize: line.selectedSize ?? null,
      };
    });
  }

  async function submitIndia() {
    if (!TURNSTILE_SITE_KEY || !turnstileToken) {
      throw new Error("Complete the security check before paying.");
    }
    await loadRazorpay();
    if (!window.Razorpay)
      throw new Error("Razorpay Checkout did not load. Check your connection and try again.");
    const checkoutCart = await resolveCheckoutCart();
    const payload = {
      cart: checkoutCart,
      customer,
      subtotal: cart.subtotal,
      shipping: 0,
      total: cart.subtotal,
    };
    let razorpayOrder: Awaited<ReturnType<typeof createRazorpayCheckoutOrder>>;
    try {
      razorpayOrder = await createRazorpayCheckoutOrder({
        ...payload,
        checkoutAttemptId,
        turnstileToken,
      });
    } catch (error) {
      // Turnstile tokens are single-use. Preserve the idempotency key if a
      // successful order response was lost, but request a fresh security token.
      const details =
        error instanceof ConvexError && typeof error.data === "object" && error.data
          ? error.data
          : null;
      if (details?.code === "CHECKOUT_ALREADY_PAID" && typeof details.orderId === "string") {
        const recovery: PendingPayment = {
          orderId: details.orderId,
          attemptId: checkoutAttemptId,
          email: typeof details.email === "string" ? details.email : customer.email,
          cartFingerprint: "",
          createdAt: Date.now(),
        };
        setPendingPayment(recovery);
        try {
          window.sessionStorage.setItem(PAYMENT_RECOVERY_KEY, JSON.stringify(recovery));
        } catch {
          /* Optional storage. */
        }
        return;
      }
      resetCheckoutProtection(
        details?.code === "CHECKOUT_CHANGED" || details?.code === "CHECKOUT_ATTEMPT_ENDED",
      );
      throw new Error(
        typeof details?.message === "string"
          ? details.message
          : error instanceof Error
            ? error.message
            : "Checkout could not start. Please try again.",
      );
    }
    const payment: PendingPayment = {
      orderId: razorpayOrder.orderId,
      attemptId: checkoutAttemptId,
      email: customer.email,
      cartFingerprint: cartFingerprint(cart.lines),
      createdAt: Date.now(),
    };
    setPendingPayment(payment);
    try {
      window.sessionStorage.setItem(PAYMENT_RECOVERY_KEY, JSON.stringify(payment));
    } catch {
      /* Webhooks still recover the order. */
    }

    let response: RazorpaySuccess;
    try {
      response = await new Promise<RazorpaySuccess>((resolve, reject) => {
        let settled = false;
        let lastFailureMessage = "";
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          callback();
        };
        const checkout = new window.Razorpay!({
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          order_id: razorpayOrder.orderId,
          name: "BADR",
          description: "BADR attar order",
          prefill: {
            name: customer.name,
            email: customer.email,
            contact: razorpayContact(customer.phone),
          },
          remember_customer: false,
          webview_intent: true,
          retry: { enabled: true },
          theme: { color: "#171717" },
          handler: (result: RazorpaySuccess) =>
            finish(() => {
              setMessage("");
              resolve(result);
            }),
          modal: {
            ondismiss: () =>
              finish(() =>
                reject(
                  new Error(
                    lastFailureMessage
                      ? lastFailureMessage
                      : "Payment window closed. If money was debited, do not pay again. We will show confirmation here once it reaches the store.",
                  ),
                ),
              ),
          },
        });
        checkout.on("payment.failed", (result) => {
          lastFailureMessage = razorpayFailureMessage(result.error);
          setMessage(lastFailureMessage);
          const paymentId = result.error?.metadata?.payment_id;
          const reason = result.error?.reason || result.error?.code || "payment_failed";
          setFailureReference(
            `${paymentId || razorpayOrder.orderId} · ${reason} · ${new Date().toISOString()}`,
          );
        });
        razorpayRef.current = checkout;
        checkout.open();
      });
    } catch (error) {
      if (completingRef.current) return;
      await cancelRazorpayCheckout(razorpayOrder.orderId, checkoutAttemptId).catch(() => undefined);
      resetCheckoutProtection();
      throw error;
    }

    if (completingRef.current) return;

    let order: any;
    try {
      order = await verifyRazorpayPaymentWithRetry({ ...payload, ...response });
    } catch {
      if (completingRef.current) return;
      setTurnstileToken("");
      throw new Error(
        "Payment response received, but confirmation is still processing. Do not pay again; check tracking shortly or contact us.",
      );
    }
    const orderNumber = String(order?.order_number ?? "");
    await completePayment(orderNumber, payment);
  }

  function submitInternational() {
    if (!whatsappOrderNumber) {
      throw new Error("International checkout is not configured yet. Contact the store directly.");
    }
    const reserved = window.open("about:blank", "_blank");
    if (!reserved) throw new Error("Allow popups so we can open your WhatsApp order message.");
    const itemText = cart.lines
      .map(
        (line, index) =>
          `${index + 1}. ${line.name}\n   Quantity: ${line.qty}\n   Variant/options: ${
            [line.selectedColor, line.selectedSize].filter(Boolean).join(", ") || "Standard"
          }\n   Product page: ${window.location.origin}/product/${line.slug}`,
      )
      .join("\n\n");
    const text = `Assalamu alaikum. I would like to order to ${customer.country}.\n\nName: ${customer.name}\nEmail: ${customer.email}\nWhatsApp number: ${customer.phone}\n\nCountry: ${customer.country}\nAddress: ${customer.address_line_1}${customer.address_line_2 ? `, ${customer.address_line_2}` : ""}\nCity: ${customer.city}\nState / province / region: ${customer.state || "-"}\nPostal code: ${customer.postal_code}\n\n${itemText}\n\nProduct subtotal: ${totalLabel}\nPlease confirm availability, international shipping, and payment details.`;
    reserved.opener = null;
    reserved.location.href = `https://wa.me/${whatsappOrderNumber}?text=${encodeURIComponent(text)}`;
    setSuccess("WhatsApp order message opened");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.lines.length || submitLockRef.current || pendingPayment) return;
    submitLockRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      validateCheckoutCustomer(customer);
      if (isIndia) await submitIndia();
      else submitInternational();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not be completed.");
    } finally {
      submitLockRef.current = false;
      setBusy(false);
    }
  }

  return (
    <StoreShell>
      <main className="min-h-screen bg-[#f5f2ec] px-4 pb-24 pt-28 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/"
            className="motion-link inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Continue shopping
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <form onSubmit={onSubmit} className="bg-background p-5 shadow-sm sm:p-8">
              <p className="eyebrow">Secure checkout</p>
              <h1 className="mt-4 font-display text-4xl sm:text-5xl">Where should we send it?</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                India orders pay securely with Razorpay. International orders continue on WhatsApp
                so shipping and payment can be confirmed first.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {addresses?.length ? (
                  <SearchSelect
                    label="Saved address"
                    value={savedAddressId}
                    options={savedAddressOptions}
                    searchPlaceholder="Search saved addresses…"
                    className="sm:col-span-2"
                    onValueChange={(id) => {
                      countryChosenRef.current = true;
                      setSavedAddressId(id);
                      if (!id) return;
                      const saved = addresses.find((item) => item.id === id);
                      if (!saved) return;
                      setCustomer((current) => ({
                        ...current,
                        name: saved.full_name || current.name,
                        phone: saved.phone || current.phone,
                        address_line_1: saved.address_line_1 || "",
                        address_line_2: saved.address_line_2 || "",
                        city: saved.city || "",
                        state: saved.state || "",
                        postal_code: saved.postal_code || "",
                        country: saved.country || "India",
                      }));
                    }}
                  />
                ) : null}
                <Field
                  label="Full name"
                  value={customer.name}
                  onChange={(value) => update("name", value)}
                />
                <Field
                  label="Email"
                  type="email"
                  value={customer.email}
                  onChange={(value) => update("email", value)}
                />
                <Field
                  label="WhatsApp number"
                  type="tel"
                  value={customer.phone}
                  onChange={(value) => update("phone", value)}
                />
                <SearchSelect
                  label="Country"
                  name="country"
                  value={customer.country}
                  options={COUNTRY_OPTIONS}
                  searchPlaceholder="Type a country or code…"
                  emptyText="No country found."
                  onValueChange={(value) => update("country", value)}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Address"
                    value={customer.address_line_1}
                    onChange={(value) => update("address_line_1", value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Apartment, suite, etc. (optional)"
                    required={false}
                    value={customer.address_line_2 || ""}
                    onChange={(value) => update("address_line_2", value)}
                  />
                </div>
                <Field
                  label="City"
                  value={customer.city}
                  onChange={(value) => update("city", value)}
                />
                <Field
                  label={isIndia ? "State" : "State / province / region"}
                  required={isIndia}
                  value={customer.state || ""}
                  onChange={(value) => update("state", value)}
                />
                <Field
                  label={isIndia ? "PIN code" : "Postal code"}
                  required={isIndia}
                  value={customer.postal_code}
                  onChange={(value) => update("postal_code", value)}
                />
              </div>

              {isIndia ? (
                <>
                  {!RAZORPAY_IS_AVAILABLE ? (
                    <p
                      role="status"
                      className="mt-6 border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
                    >
                      Online payments are being activated. India checkout is temporarily paused;
                      please try again shortly.
                    </p>
                  ) : null}
                  <div className="mt-6 border border-foreground/15 bg-[#faf8f4] p-3">
                    {TURNSTILE_SITE_KEY ? (
                      <div ref={turnstileHostRef} />
                    ) : (
                      <p className="text-sm text-red-800">Checkout security is not configured.</p>
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Paying with UPI? Choose your app in Razorpay, complete approval there, then
                    return here. If the app does not open, use Show All Options for another
                    available method. If money was debited, do not pay again.
                  </p>
                </>
              ) : null}

              {message ? (
                <p
                  role="alert"
                  className="mt-5 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {message}
                </p>
              ) : null}
              {success ? (
                <p className="mt-5 flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" /> {success}
                </p>
              ) : null}

              {pendingPayment ? (
                <div
                  className="mt-5 space-y-3 border border-foreground/20 p-4 text-sm leading-6"
                  role="status"
                >
                  <p>
                    Waiting for payment confirmation. This page updates automatically when the store
                    receives it, even if the payment window closes.
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    Reference: {failureReference || pendingPayment.orderId}
                  </p>
                  {!busy ? (
                    <>
                      <p>
                        If money was debited, wait for confirmation or contact us with this
                        reference. Only start another payment if you have confirmed no debit.
                      </p>
                      <button
                        type="button"
                        className="min-h-11 border border-foreground px-4 py-2 font-semibold"
                        onClick={() => {
                          void cancelRazorpayCheckout(
                            pendingPayment.orderId,
                            pendingPayment.attemptId,
                          ).catch(() => undefined);
                          try {
                            window.sessionStorage.removeItem(PAYMENT_RECOVERY_KEY);
                          } catch {
                            /* Optional storage. */
                          }
                          setPendingPayment(null);
                          setFailureReference("");
                          setMessage(null);
                          resetCheckoutProtection();
                        }}
                      >
                        No debit — start a new payment
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  busy ||
                  Boolean(pendingPayment) ||
                  cart.lines.length === 0 ||
                  (!isIndia && whatsappConfigLoading) ||
                  (isIndia && (!RAZORPAY_IS_AVAILABLE || !TURNSTILE_SITE_KEY || !turnstileToken))
                }
                className="motion-button mt-7 flex w-full items-center justify-center gap-2 bg-foreground px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isIndia ? (
                  <LockKeyhole className="h-4 w-4" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                {busy
                  ? "Please wait"
                  : !isIndia && whatsappConfigLoading
                    ? "Preparing WhatsApp"
                    : isIndia
                      ? RAZORPAY_IS_AVAILABLE
                        ? `Pay ${inr(cart.subtotal)} with Razorpay`
                        : "Online payments activating"
                      : "Continue on WhatsApp"}
              </button>
            </form>

            <aside className="bg-foreground p-5 text-background sm:p-7 lg:sticky lg:top-24">
              <p className="eyebrow text-background/50">Your order</p>
              <ul className="mt-5 divide-y divide-background/15">
                {cart.lines.map((line) => (
                  <li key={line.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] gap-3 py-4">
                    <img
                      src={line.image}
                      alt=""
                      className="h-14 w-14 bg-white object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{line.name}</p>
                      <p className="mt-1 text-xs text-background/55">
                        Qty {line.qty} · {line.selectedSize || "Standard"}
                      </p>
                    </div>
                    <p className="text-sm">
                      {isIndia || rateSource === "fallback"
                        ? inr(line.price * line.qty)
                        : format(line.price * line.qty)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-background/20 pt-5">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{totalLabel}</span>
                </div>
                <div className="mt-3 flex justify-between text-sm text-background/65">
                  <span>Shipping</span>
                  <span>{isIndia ? "Included" : "Confirmed on WhatsApp"}</span>
                </div>
                <div className="mt-5 flex justify-between border-t border-background/20 pt-5 font-display text-xl">
                  <span>Total</span>
                  <span>{totalLabel}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.13em]">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 border border-foreground/20 bg-transparent px-3 text-sm font-normal normal-case tracking-normal outline-none transition focus:border-foreground"
      />
    </label>
  );
}
