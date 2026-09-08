# Product page and announcement polish — 8 September 2026

## Scope

- Removed the visible announcement pause button and dot separator. Each saved message has its own span with responsive spacing; equal-width copies loop without a gap jump. Hover/focus pause and reduced-motion static, scrollable messages remain available.
- Kept the existing header, gallery, product copy, imagery and white/neutral palette. Clearer product name, scent profile, price, description and purchase grouping; combo builder follows the main purchase controls.
- Reduced oversized/tightly spaced description headings. Fragrance notes have a dedicated heading; intensity, longevity and occasion use aligned definition rows.
- Narrow-phone thumbnails fit without horizontal overflow. Existing gallery pagination and sticky purchase behavior remain intact.

## SEO

- Shared metadata helper keeps document and structured-data copy consistent, respects admin overrides and distinguishes pack titles from individual attars.
- Social image uses the explicit admin social image or current product cover, not a hardcoded scene override.
- Removed invented manufacturer part numbers derived from internal SKUs. FAQ markup matches all visible accordion questions; review markup uses the six rendered reviews while the aggregate still represents approved reviews.
- Followed Google Search Central product structured-data guidance: https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- Ranking or rich-result appearance cannot be guaranteed; no search-engine ranking or Google Rich Results Test outcome is claimed.

## Verification

- TypeScript and production build passed; 49 Vitest and 43 checkout regression tests passed.
- Browser checked 320px, 390px and 1440px layouts. No horizontal overflow at 320px.
- Product thumbnails, pagination, quantity increment and primary/sticky add-to-bag exercised without placing an order.
- Production preview gallery images loaded, reduced motion stopped the announcement animation and hid duplicate messages; no browser runtime errors in production preview.
- Five core fragrance pages returned 200 with one H1, canonical product URLs and server-rendered Product/Offer data in INR.
- Initial development preview pointed at the older development Convex deployment; switched preview to production mode without modifying any deployment or credentials.

No backend functions, payment settings, offer settings or stored product data changed.
