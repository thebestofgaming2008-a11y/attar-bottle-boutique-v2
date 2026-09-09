# Live production audit — 9 September 2026

## Outcome

User confirmed a successful real payment. Read-only verification independently matched a captured INR 499 payment in the new Razorpay merchant to store order #3, payment status `paid`, fulfillment status `processing`. No payment, refund, customer record or production admin content was changed by this audit.

Both active and historical Razorpay credentials authenticate successfully. The merchant routing and webhook configuration from `RAZORPAY-MERCHANT-MIGRATION-2026-09-09.md` remain unchanged.

## Optimization shipped

- Removed an unused default export of the admin route component. TanStack could not automatically split that exported component, so all shoppers were downloading the admin dashboard/chart code.
- Main client entry: **938,973 -> 341,761 bytes**, approximately 64% smaller, uncompressed. This measures this file, not total page weight or a measured load-time improvement. Admin is now a separate 567,360-byte lazy chunk. Other shared chunks still load as required.
- The production preview caught a Nitro/Rolldown circular helper initialization (`__exportAll is not a function`) after splitting. Kept the generated SSR runtime helper in its own dependency-free chunk through the build configuration. Rebuilt and verified locally before publishing; the broken intermediate build was never deployed.
- Added `npm run test:bundles` after-build checks: separate admin chunk, entry size below 450 KB, no admin UI in the entry, SSR helpers without circular imports.
- Cloudflare deployment: `09c687d0-7aed-4722-a6dd-b554a1a200d8`.
- Rollback Worker version: `df6693c2-23df-4d2d-a47f-6cd783432ce2`. No database or payment environment rollback is necessary for this frontend/build-only change.

TanStack documents why exported route components prevent splitting: https://tanstack.com/router/latest/docs/guide/automatic-code-splitting#rules-of-splitting

## Verification

- 88 Vitest tests passed, including six added account/access checks: guest authorization, cross-account address ownership, address defaults/count limit, private order history and guest tracking email matching, admin settings restrictions, and password-reset capability gating.
- 43 checkout regression tests passed. Existing coverage includes gifts, promotions, bundles, checkout pricing, payment recovery, merchant migration, webhook/refund cases and review trust.
- TypeScript check passed; production build passed; bundle guard passed; Cloudflare dry run and deploy passed.
- `npm audit --omit=dev`: zero reported production dependency vulnerabilities at audit time. This is not a guarantee of absence of all security issues.
- Local production runtime returned 200 for homepage, shop, product, account, checkout, admin and tracking. Only admin preloaded its admin chunk.
- Browser preview: admin sign-in UI renders, product add-to-bag opens cart, cart link reaches the checkout form and correct INR total. No real checkout submitted in the preview.
- Post-deployment HTTP checks: those seven production routes return 200 with the new entry asset. Private routes retain `noindex` and `private, no-store` headers. HTTPS security headers remain present. Hashed static assets retain immutable caching.
- Post-deployment browser: account sign-in, admin sign-in and guest checkout render. Belgium detection shows the WhatsApp checkout path with EUR subtotal and shipping confirmed via WhatsApp. No WhatsApp message sent and no production cart changes in this audit.
- `/api/rates`: `source: exchangerate-api.com`; `/api/geo`: country BE from this environment.
- Live SEO audit: 18 public pages, zero detected issues; merchant feed contains five products; private pages excluded and missing routes return real 404. Five products have zero reviews and zero review markup, correctly.

## Remaining setup and limits

1. **Password-reset email is not configured in production.** `RESEND_API_KEY` and `AUTH_EMAIL_FROM` are absent. The account UI correctly does not advertise reset until both are present. Connect a verified sending domain/email provider and then test code delivery and password reset. Never publish an API key in frontend configuration or source control. Guest checkout is unaffected, but customers who forget passwords cannot currently use automated recovery.
2. Authenticated admin CRUD, upload and account sign-in/out were not executed against live customer records during this audit. Access-control and other mutations were exercised in isolated automated fixtures, not by changing live products/orders or creating test customers.
3. No physical-device UPI handoff matrix was run. The user's successful real payment plus the provider/store match is evidence for that payment, not a promise of approval on every bank/app/device.
4. The Web Performance skill's required Chrome DevTools connector was unavailable. No measured Lighthouse/Core Web Vitals claim is made. File size, HTTP checks and browser rendering are the evidence for this pass. The agent-browser CLI was also unavailable; in-app browser used for functional preview checks.
5. Maintain owner-approved shipping/return/business details and Search Console follow-up from `SEO-OWNER-CHECKLIST.md`. No invented reviews, return windows, business addresses or ranking guarantees were introduced.

## Commands

```text
npm run test:gifts
npm run test:checkout
npx tsc --noEmit
npm run build
npm run test:bundles
npx wrangler dev --local --port 8787 --local-upstream localhost
node scripts/seo-audit.mjs
npx wrangler deploy --dry-run --keep-vars
npx wrangler deploy --keep-vars
```

The local upstream override prevents production canonical-host redirection from looping through Wrangler's localhost proxy. Stop the preview before rebuilding on Windows to avoid locked output files.
