# BADR gift offers — 6 September 2026

## What changed

Ported the Fawzaanstore gift campaign engine and editor into BADR, adapting categories, product selectors and payment reservations. No existing campaigns were found in BADR. No real offer has been enabled and no production test order/payment was created.

- Admin → Gifts: create a draft, choose qualifying products/category/minimum spend, select a gift product and quantity, configure dates, save, test, publish or archive.
- Multiple conditions support all/any. Advanced controls support priority, combining gift campaigns and capped repeated awards.
- Gift products and categories use searchable dropdowns. The editor shows a plain-language offer summary and validation errors.
- A saved draft can be tested with a sample cart without reserving stock or creating an order. The tester intentionally ignores the campaign schedule/active state, but validates gift availability.
- Gifts display in cart and checkout, and are snapshotted at server-side checkout reservation. They do not qualify for further gifts or change the payment amount.
- The stock reservation, cancellation/expiration restoration, webhook finalization and order return/restock paths include gifts. Duplicate callbacks/actions do not double-deduct or double-restock.
- Completed order items preserve the original gift, selected options, campaign and zero price even if the campaign/product is later edited or archived.
- Admin order details now show the items to pack, images, quantities, options, gift campaign names and stock-attention warnings. Gifts are excluded from best-seller units-sold calculations.
- Account order history and guest tracking receive the same saved gift items.
- International WhatsApp checkout adds eligible gifts as requests subject to availability confirmation. It does not create a backend order or reserve gift stock. A gift lookup failure does not prevent the WhatsApp enquiry.
- No Razorpay keys, gateway settings, existing prices, existing orders or media were changed.

## Admin workflow

1. Sign in at https://houseofbadr.com/admin and open **Gifts**.
2. Create an offer and select the qualifying purchase and gift product. The gift product must exist in Products with its correct stock and options.
3. Save the draft, add a sample cart in **Test this offer**, then run the test.
4. Enable the offer and save to publish. Optional start/end dates use the admin device's timezone and are stored as ISO instants.
5. Archive an offer to stop future awards. Previously reserved/paid gifts remain promised on their original orders.

An offer may be eligible but not awarded when gift stock is unavailable or a higher-priority non-combining offer is applied. Never count previewed gifts as reserved until checkout is created. A late capture after a reservation expired still creates the paid order and preserves its promised gift, with stock attention flagged if necessary.

## Bounds / maintenance

- Up to 50 active campaigns; up to 100 current draft/live campaigns. Archive unused campaigns to free current slots (no lifetime offer limit).
- Admin loads current campaigns and the 30 most recently archived campaigns. Older campaign records remain in the database and order snapshots remain intact.
- Up to six conditions per offer and 99 gift units per campaign per order, respecting available stock.
- Reuses Convex and existing R2 media. No additional paid service or recurring polling job was introduced.

## Verification

- 43 checkout regression tests, including fourteen gift cases.
- Eight Convex-runtime tests covering real schema/argument/return validators, admin restrictions, campaign CRUD, read-only testing, reservations, captured order finalization, duplicate callbacks, shared stock, forgery rejection, schedules, slug carts, admin/account/guest order visibility and return restocking.
- TypeScript and production build passed. ESLint: no errors; pre-existing React Fast Refresh warnings remain.
- Isolated browser editor fixture: create, search category/product and save draft; 390px mobile layout has no horizontal overflow and no browser errors.
- Production mobile browser: product → add to bag → cart → checkout; Belgium/WhatsApp and India/Razorpay country states; no page errors observed. Authenticated live admin writes and a charged live payment were not performed.
- Production public gift evaluation returned no offers. Unauthenticated admin campaign access was rejected. New Gifts navigation appeared behind the existing sign-in gate.

## Safe rollback

Keep the additive gift schema fields and server snapshot finalization support if any gifted checkout has been reserved. Archive active campaigns to stop new awards first. Do not roll back to a backend that rejects gift order fields or loses promised reserved gifts. Historical pre-gift orders require no migration.

The isolated browser fixture is served only by `npx vite --config tests/browser.vite.ts` at `/tests/gift-editor.html`; it is not a production route and writes only to React memory.
# Follow-up: mix-and-match rewards and editable quantities

- Quantity inputs can be cleared and retyped. Empty/invalid values cannot be saved as valid offer quantities.
- Qualifying purchase supports all store products, a category, selected products, or minimum INR subtotal.
- Rewards support a fixed product or customer choice from all active store products / selected products.
- Example: Type of purchase → Any attars (all products), Quantity → 2; Who chooses → Customer chooses their free items; Customer can choose from → Any attars (all products); How many to give → 2.
- “All products” includes future active products, not only today's fragrances. Use selected products for exclusions. Repeated fragrances are allowed if combined purchased/reward stock permits.
- Customer selections persist with optional browser storage and are selected in the cart/checkout. Backend validation checks the reward pool, quantities, variants, qualification and stock, both before creating a Razorpay order and during atomic reservation. Selections never count as purchased products or reduce the payable subtotal.
- Missing/invalid choice for a qualifying available offer blocks payment preparation; obsolete selected offers require clearing/review rather than silently disappearing. Completed reservations retain their gift snapshot after catalogue/campaign edits.
- International WhatsApp includes the selected eligible rewards as availability requests, not automatic backend orders.
- Verification: 43 existing checkout regression tests + 16 Convex integration tests passed; TypeScript, lint (existing Fast Refresh warnings only), build and deployment dry-runs passed. Browser fixture verified clearing both quantity fields, typing 2, saving a local choice-offer draft, and selecting two different rewards at 390px with no overflow/errors. No paid live order or live campaign write was performed.
- Scope limits: at most 50 explicitly selected reward products; all-product reward pools support up to 200 active products. Existing campaign, per-award and repeat caps remain.
