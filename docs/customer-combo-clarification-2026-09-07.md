# Customer-selected combos

The client's clarification means automatic mix-and-match quantity discounts, not a fixed product assembled by the merchant.

- The existing automatic promotion destination is now labelled **Build your own combo**, in Commerce directly after Products.
- Fixed sets remain available under **Ready-made packs**; the empty state links to the customer-selected offer editor.
- Admin and storefront builder headings now use consistent terminology. The editor explicitly says discounts apply automatically in cart and checkout.
- No live discount values, enabled flags, products, payment configuration, or backend code changed.

Verification: TypeScript and production build pass. 40 Vitest tests and 43 checkout regression tests pass. Added isolated guest/authenticated coverage proving automatic 1 → 2 → 3 → 1 quantity changes update both storefront preview and server checkout quotes without a coupon. Sample test percentages are not production settings. Mobile editor checked at 390px: correct destinations/headings, no horizontal overflow, no browser errors.

Owner setup: Admin → Build your own combo → add quantity/discount tiers → Enabled → Publish. Use all individual attars or choose eligible fragrances. The client has mentioned 2 attars / 10%; further discount amounts are unspecified and were not invented or published.
