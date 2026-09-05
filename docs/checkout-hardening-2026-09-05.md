# Checkout hardening — 5 September 2026

## Release

Deployed to `https://houseofbadr.com` and production Convex
`impressive-stoat-118`. Cloudflare Worker version:
`d4d3b1c5-c036-463b-9a5f-7724b0d54c72`.

This is a site-side reliability/security release, not proof that the affected
phone's UPI payment now succeeds. No real payment, refund, customer signup or
production test order was created during this audit. Design and payment keys
were not changed. No paid service or new background schedule was introduced.

## Fixed in this release

- Cart option lines sharing a product now check combined quantity and deduct
  stock correctly. Fractional quantities and unsafe amounts are rejected.
- Retrying an attempt cannot silently reuse different cart/address details.
  Expired attempts get a fresh ID; interrupted requests retain their ID, and an
  already-paid attempt recovers confirmation instead of asking for another charge.
- Browser verification requires the server's reserved checkout snapshot. It
  cannot manufacture an order from client totals or unrelated signed payments.
- Refund amounts cannot move backwards on stale delivery. A delayed created/failed
  event cannot undo processed state for the same refund. Refund events containing
  a captured payment entity are no longer misclassified as fresh captures.
- Incomplete paid webhook payloads remain retryable. Unsigned requests are
  rejected before body processing, and body reading is bounded to 256 KiB.
- Catalog refresh, order preparation and verification have bounded waits and
  late-response handling. A timeout does not cancel backend processing or mean
  that no payment occurred.
- A late geo response cannot overwrite a country selected by the customer.
- Confirmation survives gateway-close/router exceptions, with a full-page
  confirmation-navigation fallback.
- Restricted/full browser storage no longer crashes cart, currency or auth.
  Auth uses per-provider memory fallback; SSR never retains tokens. In browsers
  which deny storage, login/cart/recovery cannot be promised across page reloads.
- Checkout, account, admin, tracking and confirmation responses explicitly use
  `private, no-store, max-age=0`. Public asset caching remains intact.

Existing protections retained: trusted server prices, stock reservations,
signature/captured-status verification, idempotent paid-order finalization,
webhook and scheduled reconciliation, duplicate-submit locking, session recovery,
no-debit warnings, and payment references on failure. UPI intent remains enabled
with `webview_intent: true`, gateway retries enabled, no forced payment method,
and the current official Standard Checkout script.

## Evidence

- Latest supplied live CSV key ID and secret exactly match production backend
  values; authenticated read-only Razorpay API call succeeded. Secrets were not
  printed or added to source. Production webhook secret is configured.
- Recent production records contain captured/failed payment deliveries and
  refund-created/refund-processed deliveries. Reconciliation health had zero
  reported errors in the inspected record. This is not an exhaustive ledger audit.
- `npm run test:checkout`: **29/29 pass**. Tests exercise actual registered backend
  handlers against a simulated database, including option-line inventory,
  duplicate events, late capture, changed catalog snapshots, wrong amount/currency,
  forged signatures, missing intents, refunds, privacy, storage denial and timeouts.
  They do not simulate Convex's distributed transaction engine or a real bank.
- `npx tsc --noEmit`: pass. `npm run lint`: no errors, 10 existing Fast Refresh
  warnings. `npm run build`: pass.
- Production Convex schema validation/typechecking/deploy: pass, no indexes deleted.
- Cloudflare dry run/deploy: pass with existing variables retained.
- Live `/checkout`: HTTP 200, new checkout bundle, no-store header and
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` confirmed.
- Live unsigned webhook: HTTP 401. Unknown checkout capability query: no result.
- Isolated Chromium at 390×844: product added to bag, checkout survives reload,
  searchable country selection changes international WhatsApp checkout to India
  Razorpay checkout, Indian address labels render, Razorpay SDK and Turnstile load,
  no horizontal overflow, no reported page exceptions. Account sign-in form loads.
  No security challenge was bypassed and no payment was submitted.

## Merchant-dashboard checks still requiring access

No authenticated Razorpay dashboard session was available. Do not describe these
UI settings as freshly verified:

1. Use Live mode for the live store. Registered website should be
   `https://houseofbadr.com`; confirm account activation and enabled payment methods.
2. Confirm the enabled production webhook is
   `https://impressive-stoat-118.convex.site/razorpay/webhook`, with the matching
   existing webhook secret (separate from the API secret), and recent successful
   deliveries for `payment.captured`, `payment.failed`, `order.paid`,
   `refund.created`, `refund.processed`, `refund.failed`.
3. Confirm automatic capture policy and UPI availability. The backend also handles
   authorised-payment capture/reconciliation; never switch off verification to
   work around a payment failure.
4. If the clean mobile attempt fails, use ticket **#20729149** and the evidence in
   `payment-incident-2026-09-05.md`. Ask for a trace of the failing attempt's
   intent/PSP/bank path, not just a successful attempt from a different phone.

Razorpay's [Standard Checkout guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
supports the handler plus webhook flow. Adding a WebView redirect callback to
ordinary web checkout can bypass its handler; no speculative redirect was added.
[UPI intent documentation](https://razorpay.com/docs/payments/payment-methods/upi/upi-intent/)
distinguishes mobile intent from desktop QR. A desktop success therefore does not
test the exact mobile handoff. Third-party WebViews also need their host app's
native intent support, which website JavaScript cannot install.

## Clean retry on the affected Android phone

First check any previous debit/pending order and save its payment/order reference.
Do not pay again while a debit is unresolved. Resetting site data clears the local
cart, sign-in and payment-recovery state, but does not delete backend orders.

1. Update Chrome and the intended UPI app through the Play Store. Close all BADR
   and Razorpay tabs.
2. Clear only BADR and Razorpay site data. In Chrome's site settings, find
   `houseofbadr.com` and any listed `razorpay.com` / `checkout.razorpay.com` entries
   and clear their stored data/reset permissions. Labels vary by Chrome version;
   [Google's site-cookie instructions](https://support.google.com/chrome/answer/95647?co=GENIE.Platform%3DAndroid&hl=en)
   explain the site-specific removal route. Do not wipe saved passwords or UPI app data.
3. Fully close/reopen Chrome and type `https://houseofbadr.com` directly into a
   normal Chrome tab, not an Instagram/WhatsApp in-app browser. Make one fresh
   checkout, select the installed UPI app, complete its approval, then return.
4. Check BADR confirmation and the admin paid order. If it fails, save the payment
   ID, exact time, phone model, Chrome/UPI app versions and whether the UPI app
   opened / reached PIN approval. Do not share a PIN, OTP or bank credentials.
5. A separate attempt on the wife's phone can narrow the problem, but a different
   payer/bank changes more than the device. Success there does not close the
   affected-phone incident; continue tracing that phone with Razorpay.

Cache is only a hypothesis, not an established cause. The supplied screenshots
also show a failure on Razorpay's hosted payment page. The affected mobile flow
remains an open incident until a genuine transaction succeeds and its order is
confirmed, or the provider identifies and resolves the failing path.
