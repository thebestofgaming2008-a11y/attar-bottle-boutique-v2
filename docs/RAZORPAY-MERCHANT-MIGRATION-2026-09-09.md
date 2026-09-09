# Razorpay merchant migration — 9 September 2026

## Production configuration

- Site: https://houseofbadr.com
- New merchant: `TZnqdxFmJ3DigO`; domain approved, UPI activated, automatic capture enabled (authorisation within 12 minutes). Capture/refund policies were not changed.
- New public live key: `rzp_live_TZoV8fRy6DYGe3`.
- Previous public key retained: `rzp_live_TXyBPkKkc7QWSV`.
- Convex production: `impressive-stoat-118`; development was not changed.
- Webhook: https://impressive-stoat-118.convex.site/razorpay/webhook
- New webhook ID: `TZohBmFrIV1zqd`, enabled with its own random secret.
- Events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`.
- Failure-alert email: `houseofbadr@gmail.com`. No support tickets, contact-number changes, bank changes, live charges or actual refunds were made.
- Cloudflare Worker version: `df6693c2-23df-4d2d-a47f-6cd783432ce2`.

## Credential ownership and safe rollback

`RAZORPAY_MERCHANT_CONFIG` is now the authoritative **server-only Convex secret**. It contains `activeKeyId`, immutable `legacyKeyId`, and an `accounts` array. Each account has a public `keyId`, private `keySecret`, private `webhookSecrets` array, and optional `merchantId`. Never expose or commit this value.

New checkout intents record their public merchant key ID. Paid orders inherit it. Records created before this upgrade use `legacyKeyId`. Browser signature verification, checkout replay, captured-payment recovery, refund requests, webhook API lookups and the daily audit use the owning merchant. The daily audit checks both accounts independently; a retired-account outage does not skip the current account.

The original `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` and previous-secret variables remain unchanged as the pre-migration fallback. They do **not** select the active merchant while `RAZORPAY_MERCHANT_CONFIG` exists. The frontend receives the actual checkout key from the backend; the Vite public key only controls the availability/mode gate.

To roll new checkouts back, securely read the JSON secret, change only `activeKeyId` to the retained old public key, and write the entire JSON back using `npx convex env set --prod RAZORPAY_MERCHANT_CONFIG` with stdin. Keep **both accounts**, their secrets, `legacyKeyId` and the new backend code. Do not revert to single-merchant code or delete the config after new-merchant payments exist: doing so would break their recovery/refunds. Keep old merchant access and its webhook available for historical payment operations. Secret/key rotation within either merchant also needs an explicit compatibility migration for stored key IDs.

## Verified

- 125 automated tests passed: 82 Vitest and 43 checkout regression tests. Thirteen new migration cases cover fresh server-priced checkout, legacy replay, both merchants' callback/capture/duplicate webhook/refund flows, old browser-closed recovery, cross-merchant rejection and partial provider outages during audit. Tests use isolated fixtures and mocked gateway responses; they do not charge cards or create production customer orders.
- TypeScript, production build, Convex schema/code deployment and Wrangler dry run/deployment passed.
- Production `orders:checkPaymentConnections` authenticated both merchants; after atomic cutover it reported the new public key active. This internal action is a read-only operator diagnostic, not a public endpoint.
- Production signed non-payment probes accepted for both secrets (HTTP 202, ignored without database changes); unsigned probe rejected (HTTP 401). These probes verify deployed signature handling, not actual Razorpay delivery of a captured event.
- New merchant dashboard confirms the enabled webhook, correct URL, seven selected events, secret supplied and client failure-alert email.
- API created unpaid setup order `order_TZomIqxGsQXHa4`, INR 100 paise, status `created`, amount paid zero. This is a provider-only integration probe, not a store order. It was not paid or captured.
- Live server-side quotes passed for all five products, despite test requests supplying zero frontend prices: Oud Zafar/Oud Gulaab 59900 paise; Fitoor/Dariya/Ulfat 49900 paise.
- Production recent-payment audit: one recent payment checked, no errors/orphans, no recovery or refund updates. Scheduled-recovery invocation found no currently due unresolved intents. This is bounded coverage, not an audit of all historical payments.
- Live browser: product/add-to-cart/cart/guest checkout loaded; searchable country selector worked; Belgium showed WhatsApp, India showed Razorpay and shipping included; production Turnstile showed success. Only the test-added cart line was removed afterwards; the pre-existing cart item was retained. No checkout form was submitted with invented customer details.
- Live SEO audit: 18 public routes, five feed items, private-route protections and real 404s passed, with zero reported issues. Zero-review products still have no invented review/rating markup.
- `/api/rates` source: `exchangerate-api.com`; `/api/geo` returned the test visitor's country (`BE`).

## Required real-device launch acceptance

1. Client completes one normal purchase on their actual mobile browser/UPI app using real details.
2. Confirm Razorpay shows **Captured** in the new merchant, and the store admin shows exactly one corresponding paid order with correct total, address, products, quantities and gifts/discounts where applicable.
3. Verify guest confirmation/tracking and, for a signed-in purchase, account order history. Check the new webhook's delivery status after the payment.
4. If money was debited but confirmation is delayed, do not pay again. Retain payment ID, timestamp and order reference; check webhook/reconciliation before retrying.

No real bank-authorised payment or phone-to-UPI-app handoff was completed by the agent. A successful API setup and regression suite do not guarantee an individual bank/app approval. This migration does not claim to fix Google Pay device-specific failures previously reported by the client.
