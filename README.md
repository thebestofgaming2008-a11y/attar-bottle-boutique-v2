# BADR Attar Boutique

Mobile-first BADR fragrance storefront with a Convex backend, Cloudflare Worker and R2 media, Razorpay checkout for India, and WhatsApp checkout for international customers.

## Local development

1. Copy `.env.example` to `.env.local` and fill in the development values.
2. Copy `.dev.vars.example` to `.dev.vars` for Cloudflare Worker secrets.
3. Install dependencies with `npm install`.
4. Start Convex with `npx convex dev`.
5. Start the storefront with `npm run dev`.

## Verification

```sh
npm run lint
npx tsc --noEmit
npm run build
npx convex dev --once
```

Razorpay secrets must only be stored in Convex environment variables. The public Razorpay key ID may be exposed to the checkout client; the key secret and webhook secret must never be placed in frontend source or public environment variables.

## Deployment

- Deploy Convex functions with `npx convex deploy`.
- Configure production environment variables from `.env.example` in Convex and Cloudflare.
- Build and deploy the Cloudflare Worker with `npm run build` and `npx wrangler deploy`.
- Configure Razorpay to send `payment.captured`, `payment.failed`, and `order.paid` to `https://<convex-site-url>/razorpay/webhook`.

Test credentials are suitable only for staging. Use separately generated live credentials after Razorpay has approved the production domain.
