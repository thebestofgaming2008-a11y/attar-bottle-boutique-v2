# Payments and orders runbook

This store treats Razorpay as the payment source of truth and Convex as the order and inventory source of truth. A browser callback improves customer experience, but a paid order must remain recoverable when the browser closes, the network fails, or the callback is never delivered.

## Invariants

- Catalog prices, availability, variants, totals, and stock are recalculated in Convex. Browser totals are never trusted.
- An India checkout reserves stock once and records whether that reservation is still held.
- A checkout attempt ID is single-use. Repeated submissions reuse one Razorpay order and cannot reserve stock twice.
- Closing or failing the Razorpay modal releases stock immediately. Late captured payments remain recoverable and subtract stock exactly once.
- A Convex order is created only after a captured Razorpay payment is independently confirmed.
- Razorpay order ID and payment ID are unique order keys. Webhook event IDs are idempotency keys.
- Webhooks require a valid raw-body HMAC signature, an event ID, valid JSON, and a body no larger than 256 KiB.
- Failed finalization is atomic. Partial orders and partial inventory writes do not commit.
- Reconciliation runs every five minutes; a broader Razorpay audit runs daily; expired technical records are deleted daily.

## Required production configuration

Convex secrets:

- `RAZORPAY_KEY_ID` using an `rzp_live_` key
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_ALLOWED_HOSTNAMES` containing the exact production hostname

Frontend build variable:

- `VITE_TURNSTILE_SITE_KEY`

Razorpay webhook:

- URL: `https://<convex-site-url>/razorpay/webhook`
- Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`, `payment.refunded`

Cloudflare Turnstile must use a real Managed widget restricted to the production hostname. Dummy keys are only for staging tests.

## Normal operations

Check the admin notifications daily. Act immediately on:

- “Paid orders need recovery”
- “Payment recovery needs attention”
- “Razorpay audit needs attention”
- “Paid orders need inventory review”

For every customer payment complaint, search Razorpay first by payment ID, email, phone, or approximate time. Never ask the customer to pay again until Razorpay confirms that no payment was captured.

Do not mark a paid order cancelled as a substitute for issuing a refund. Fulfilment status and payment/refund status are separate.

Admin refunds use Razorpay's `X-Refund-Idempotency` header. If the admin reports an uncertain outcome, retry only the same amount so the stored idempotency key is reused; verify the payment in Razorpay before choosing a different amount. Cancelling or returning an order asks separately whether inventory should be restocked and records that restock only once.

## Incident procedures

### Customer paid but sees no confirmation

1. Tell the customer not to pay again.
2. Wait at least five minutes for webhook/reconciliation recovery.
3. Check admin payment-recovery and audit notices.
4. Confirm the payment is captured in Razorpay and that amount/currency match.
5. If an order is still absent, preserve the checkout intent and payment IDs for manual recovery. Do not edit stock blindly.

### Duplicate customer charge

1. Confirm both payment IDs in Razorpay.
2. Fulfil only the intended order.
3. Refund the duplicate from Razorpay.
4. Confirm the refund status later appears in admin.

### Webhook delivery failures

1. Confirm the webhook remains enabled and the URL is exact.
2. Inspect Razorpay delivery attempts and Convex logs.
3. HTTP 401 means the configured webhook secrets do not match.
4. HTTP 413 means the payload exceeded the accepted safety limit and should be investigated.
5. HTTP 500 should be allowed to retry; do not disable the webhook.

### Webhook secret rotation

1. Put the old value in `RAZORPAY_WEBHOOK_SECRET_PREVIOUS`.
2. Put the new value in `RAZORPAY_WEBHOOK_SECRET` and update Razorpay.
3. Confirm signed deliveries succeed.
4. Remove `RAZORPAY_WEBHOOK_SECRET_PREVIOUS` after Razorpay retries using the old secret have ended.

### Razorpay API key rotation

Rotate outside peak checkout time. Webhook recovery remains the fallback for in-flight browser callbacks. Keep the webhook secret independent from API credentials.

## Free-tier controls

- Turnstile blocks automated checkout creation without consuming Convex database writes.
- Checkout attempts are idempotent and cancellations release stock immediately.
- Queries and cleanup jobs use indexes and bounded batches.
- Reconciliation checks only unresolved intents and backs off repeated checks.
- Technical checkout/webhook records are retained for 30 days and then deleted in bounded batches.
- Product media stays in R2 rather than Convex storage.
- New browser image uploads are resized and WebP-compressed before R2 storage.
- No paid queue, cache, monitoring, email, or database service is required.

Provider free tiers are hard caps, not unlimited hosting guarantees. If traffic exceeds a cap, requests can fail instead of remaining free. Razorpay transaction fees are also separate from hosting and cannot be eliminated by architecture.

## Release verification

Before every payment-related deployment:

1. Run `npx tsc --noEmit`.
2. Run `npm run build`.
3. Run `npx convex dev --once` or deploy the intended Convex environment.
4. Create one Razorpay test order and confirm server-side repricing.
5. Confirm modal cancellation restores stock once.
6. Confirm a signed webhook succeeds and a replay does not duplicate inventory/order writes.
7. Confirm forged signatures return 401 and oversized payloads return 413.
8. Complete one real Razorpay test-mode payment on a phone before switching to live mode.
