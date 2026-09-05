# BADR mobile UPI incident — 5 September 2026

## Findings

The supplied screenshots show the same generic Razorpay failure on both BADR's
embedded ₹499 checkout and a Razorpay-hosted ₹1 payment page opened in Chrome.
This is evidence against BADR's integration being the sole cause. It does not
identify whether the shared failure is in app handoff, the payer device/app,
bank, or Razorpay's payment processing.

The live merchant API authenticated successfully. Recent UPI attempts report
`BAD_REQUEST_ERROR`, `payment_authentication`, `payment_timed_out`. Razorpay's
[UPI error documentation](https://razorpay.com/docs/errors/payments/upi/)
includes both exceeded payment time and partner-bank downtime under this reason.
A timeout record is not proof that the customer delayed approval.

Read-only checks found a captured ₹499 website payment linked to a saved paid
store order. This proves that path worked for that attempt, not that the affected
phone's UPI flow works. No new payment was charged during these checks.

## Fixes deployed

- Payment/security script loads now have a deadline, share concurrent loads,
  remove failed scripts, and allow payment-script retries.
- Refresh the single-use security token following order-creation errors while
  retaining the attempt's idempotency key.
- Block duplicate submits while a payment attempt is active.
- Remember the pending attempt in tab-session storage and subscribe to its
  backend order status, allowing webhook confirmation to recover after reload
  or a missing browser callback. Storage is optional and expires after 24 hours.
- Recovery requires both gateway order ID and the opaque checkout-attempt
  credential. It returns only state and order number, never customer details.
- Do not say closing checkout means no order was placed. Delayed payments can
  still be reconciled. Warn against paying again after a debit.
- Failure messages include a reference and, when delivered by Razorpay's browser
  event, payment ID, reason, and UTC timestamp.
- Preserve cart contents changed after an earlier interrupted checkout.

UPI intent remains enabled; no payment methods, keys, prices, or webhook signature
checks were bypassed. No native Android app is owned by this project. The
`webview_intent` parameter cannot install native intent handlers in third-party
apps; Razorpay's [Android WebView guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/webview/upi-intent-android/)
also requires the host app to handle deep links.

## Verification

- `npm run test:checkout`: 11 regression tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: no errors; 10 existing React Fast Refresh warnings.
- `npm run build`: passed.
- Production Convex deployment with typechecking: passed.
- Cloudflare dry run and deployment: passed; version
  `79823554-6f59-40dd-bcc2-b85a1beb6612`.
- Production status query: confirmed attempt returns order number; failed
  attempt returns no order number; wrong capability returns null.
- Browser at 390×844: checkout loads, pending notice survives reload, no page
  errors. Recovery using an existing captured attempt reached order confirmation,
  removed recovery state, and preserved subsequently changed cart contents.

These checks do not emulate a real Android UPI app or bank authorisation.
The client's underlying payment failure remains unconfirmed as resolved.

## Ready-to-send follow-up for Razorpay ticket #20729149

The customer reproduces the same generic payment failure in both our Standard
Web Checkout and your hosted ₹1 payment page in Chrome (screenshots attached).
Please investigate the failing payer-side flow, not only a successful payment
from a different device. Our live keys authenticate and captured website payments
are saved as paid orders. WebView intent support is enabled in our checkout.

Please trace these recent failed UPI payments (all on 5 September 2026):

| Payment ID | Amount | Created UTC | Created IST |
| --- | --- | --- | --- |
| pay_TYQi23PzVu8XTk | ₹499 | 16:58:56 | 22:28:56 |
| pay_TYQgsMFRxjRP6z | ₹499 | 16:57:50 | 22:27:50 |
| pay_TYQfR0c3buJguC | ₹599 | 16:56:29 | 22:26:29 |
| pay_TYJAnD0SK9CNyR | ₹1 | 09:36:37 | 15:06:37 |

These references come from the merchant API; we cannot establish which exact
attempt each screenshot depicts. They report `payment_authentication` /
`payment_timed_out`. Please identify whether an external UPI intent was generated
and handed off, whether the PSP/NPCI/bank received it, and the underlying response
or missing acknowledgement. If terminal routing is involved, please inspect the
failed routing path and advise the merchant. We do not have a device recording or
UPI PIN-stage confirmation beyond the supplied screenshots.
