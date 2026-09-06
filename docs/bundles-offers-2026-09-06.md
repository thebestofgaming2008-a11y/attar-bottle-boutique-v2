# Bundles, quantity offers and coupons — 6 September 2026

## Admin instructions

Open https://houseofbadr.com/admin with an existing admin account.

### Fixed combos and multipacks

In **Products**, add a product and choose its selling format:

- **Combo**: at least two different individual products.
- **Multipack**: multiple bottles of one individual product.

Select the included products, their options and quantities. Set the price for the **whole pack**, upload its own cover/gallery, and save it as active when ready. Available pack stock is calculated from the included products' stock; do not enter separate pack inventory.

Packs contain 2–24 bottles across at most 12 component rows. Nested packs are not supported. An existing product's selling format cannot be changed: create a new product for a different format. Pack contents can be edited, but existing paid/pending orders retain the original contents and prices.

### Build-your-own bundles and quantity savings

Open **Offers & coupons**. Configure quantity thresholds and percentage or fixed-INR savings. Choose eligible individual attars, or leave the eligible list empty to include all individual attars, including future products.

Enable the quantity offer, then click **Publish offer settings**. **Save draft** does not change the live offer. **Load live version** restores the editor to the published configuration.

Customers can build a mixed selection on product/shop pages once an offer is published. The cart and checkout show progress and server-calculated savings. Fixed combos/multipacks and free gifts do not count toward these quantity tiers.

### Announcement banner

In the same settings, enter the announcement messages, enable the banner, and click **Publish offer settings**. The banner has a pause control and respects reduced-motion preferences. Only enter delivery/offer claims the business actually provides.

### Influencer/customer coupons

Create a coupon with its code, optional internal influencer label, percentage or fixed-INR discount, optional minimum subtotal and optional expiry (UTC). Use **Publish coupon** to activate it or save it inactive first. Existing coupons can be edited/deactivated; their code stays fixed.

Coupons have unlimited redemptions until disabled or expired. The count shown is completed paid uses, not attempts, and does not decrease for refunds. No influencer commission/payout system is included.

## Pricing and stock rules

- The customer receives the best available automatic or coupon discount; the two do not stack.
- Percentage discounts apply to the relevant server-calculated subtotal. Fixed discounts are capped to leave at least ₹1 payable and are described as "up to" that amount.
- Automatic quantity offers apply only to eligible individual attars. Coupons can also apply to fixed packs.
- Gift campaigns retain their coupon-combination setting. Automatic quantity discounts can coexist with gifts. Packs are not selectable as free-gift rewards.
- A purchased pack counts as one paid product for gift qualification, not the number of bottles inside it.
- Bundle components and individual cart lines share stock. Reservations, cancellation/expiry, captures and returned-order restocking use saved component snapshots.
- International WhatsApp orders list the selected contents and provisional discount/coupon for merchant confirmation; they do not create paid backend orders.
- Existing checkout intents without new optional fields remain compatible.

## Deployment and checks

- Convex deployed successfully to `impressive-stoat-118`; schema validation passed. Added `discounts.by_scope`; no indexes deleted.
- Cloudflare Worker `badr-boutique-studio-v2`: version `10e14a8e-a5ed-444c-b8de-db5e5e178064`, deployed 2026-09-06 17:28 UTC with existing variables preserved.
- TypeScript check, production build and Wrangler dry run passed.
- 77 automated tests passed: 43 checkout regressions and 34 gift/bundle/promotion tests.
- Local mobile UI fixtures checked quantity editing, component selection, bundle builder, draft/publish separation and coupon editing. Fixtures do not write to production.
- Live mobile-width smoke check: shop add-to-cart, invalid coupon rejection/removal, international checkout, India selection and ₹599 Razorpay pay label, no horizontal overflow, admin sign-in gate. No page exceptions reported in the browser checks.
- Live read-only backend probe: all five active catalogue products remain; a submitted client price of ₹1 was ignored and the selected product quoted correctly at ₹599.

At deployment, quantity offers and the announcement banner were disabled with empty settings. No test discounts, coupons, products or orders were published. No Razorpay keys or payment settings were changed.

## Before advertising an offer

The owner must choose the actual discounts and publish them. Verify the resulting cart and complete a real mobile checkout using the intended offer, then confirm its paid order, pack contents/gifts and discount in admin. No live payment was made during this implementation; automated tests do not establish bank/UPI-app success on every customer's phone.
