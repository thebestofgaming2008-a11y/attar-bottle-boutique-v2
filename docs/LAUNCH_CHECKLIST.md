# Badr Boutique launch checklist

The application code and staging deployment can be verified without production credentials. Do not accept real orders until every item below is complete.

## Owner-controlled launch setup

- Connect the final custom domain in Cloudflare and set `PUBLIC_SITE_URL`, `SITE_URL`, and the Razorpay registered website to that exact HTTPS origin.
- Replace the Razorpay test credentials with live `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Rotate any credential ever pasted into chat or another shared channel.
- Create a unique production `RAZORPAY_WEBHOOK_SECRET` and enable the webhook at `https://<CONVEX_SITE_URL>/razorpay/webhook` for:
  - `payment.captured`
  - `payment.failed`
  - `order.paid`
  - `refund.created`
  - `refund.processed`
  - `refund.failed`
  - `payment.refunded`
- Create real Cloudflare Turnstile keys, restrict them to the production hostname, and replace the development/test keys.
- Set `EXCHANGE_RATE_API_KEY` for live international currency conversion. Without it the store safely falls back to INR.
- Set the Cloudflare Worker runtime variable `WHATSAPP_ORDER_NUMBER` to the store's international-format number (digits only). `/api/storefront-config` supplies it to checkout at runtime; `VITE_WHATSAPP_ORDER_NUMBER` remains an optional local-build fallback. International checkout is intentionally blocked when neither value is configured.
- Set `RESEND_API_KEY` and `AUTH_EMAIL_FROM` using a verified sender domain so password-reset emails work.
- Confirm `ADMIN_EMAILS`, the R2 binding, and the R2 public media URL in the production environment.

## Final real-world acceptance test

1. Create a fresh customer account, verify sign-in/sign-out, save an address, add a wishlist item, and request a password reset.
2. Complete one captured Razorpay test payment from a real phone and verify the order appears in the customer account, tracking page, and admin.
3. Replay the same webhook and confirm no duplicate order or stock deduction is created.
4. Issue a partial test refund, then the remaining refund, and confirm payment/refund status and customer-spend totals update correctly.
5. Cancel one processing order with inventory restock and return one shipped/delivered order; confirm inventory is restored only once.
6. Complete an international WhatsApp checkout and verify the message contains the full address, product links, quantities, and variants.
7. Upload, paste, and drag/drop product images in the admin on a phone; verify cover/gallery ordering and storefront rendering.
8. Add tracking in admin and confirm the reserved WhatsApp window opens with the correct phone number, carrier, tracking number, and URL.
9. Submit a verified text review from a paid order and approve/hide it in admin.
10. Check all public routes on a real iPhone and Android device, including slow/mobile data conditions.

## Automated release checks

Run these before every deployment:

```powershell
npm ci
npx convex codegen
npx tsc --noEmit
npm run lint
npm audit --audit-level=high
npm run build
npx wrangler deploy --dry-run
```

Deploy Convex before the Worker whenever backend functions or the schema changed.
