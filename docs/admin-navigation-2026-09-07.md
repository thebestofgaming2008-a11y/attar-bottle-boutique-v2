# Admin announcement and combo navigation

## Fixed

- Announcement and coupon screens existed but were excluded from two hardcoded navigation allowlists. All desktop/mobile/login navigation now derives from one grouped destination list.
- Top announcement bar has its own Storefront tab.
- Combos & packs has its own Commerce tab, filtered to fixed combo and multipack products. Add combo / pack opens the existing product form with combo defaults, including no single-bottle size default. Existing editing, media, stock, publication and archival paths are reused.
- Bundle discounts remains separate for customer-selected, buy-more-and-save offers.
- Switching product destinations clears stale search/filter state. The mobile menu scrolls independently so lower destinations remain reachable.

## Verification

- TypeScript check, production build and Wrangler dry run passed.
- 39 Vitest tests plus 43 checkout regression tests passed (82 total). Three new tests cover complete, unique navigation; distinct promotion destinations; and filtering fixed sets.
- Browser: actual production-build admin sign-in sidebar lists all destinations; no page errors. Mobile in-memory editor fixture shows separate tabs, successful announcement publication, combo component/size selection, and no horizontal overflow at 390px. Fixture uses no production mutations. Authenticated live saving was not exercised.
- Read-only live check: five active single attars; no active combo/pack products. Announcement bar and bundle discounts are disabled with empty published messages/tiers. These settings were not changed.
- No backend/payment/checkout changes, no test catalog entries, no secret changes.

Deployment: Worker `badr-boutique-studio-v2`, version `c789ab3e-f292-4a79-835f-aa82f18f982c`, preserving environment variables with `--keep-vars`.

## Owner steps

- Top announcement bar: add messages, enable Show bar, then Publish.
- Combos & packs: Add combo / pack, select included attars and quantities, supply set name/photos/price, keep Active enabled and save.
- Bundle discounts: enter the quantity thresholds and discounts, enable, then Publish.
