# Informational pages: mobile layout

## Scope

- Journal index and all four guides, including How to apply attar.
- About, Contact, Shipping, Returns, Privacy and Terms.
- No shopping, account, admin, checkout, payment, backend or global typography changes.

## Changes

- Responsive mobile title sizes (32–40 px for guides/policies), with intermediate tablet sizes rather than jumping directly to desktop display sizes.
- 16 px body text, 28 px line height, clearer contrast, 22–24 px section headings and consistent left alignment.
- Less nested padding and more consistent spacing between headings, paragraphs and sections.
- Article byline/date wrap into intentional rows; contact links and flexible columns can wrap without forcing horizontal overflow.
- Guide product thumbnails cannot shrink; related guides align with the article column.
- Existing copy, URLs, metadata, canonical tags and JSON-LD preserved.

## Verification

- 109 Vitest tests passed, including 7 new editorial rendering tests.
- 43 checkout regression tests passed.
- TypeScript, production build, formatting and route bundle checks passed.
- Main shopping entry remains 341,758 bytes; admin remains a separate bundle.
- Wrangler dry-run passed with existing production variables preserved.
- Local production preview and live HTTP checks: all 11 informational routes, home, shop, Oud Zafar product page and checkout returned 200 without the page error fallback. Informational routes include the updated layout, headings, canonical links and structured data.
- Automated rendering assertions and HTTP checks are not visual device tests. Browser control returned no available browsers and agent-browser was not installed, so actual mobile rendering, tap targets and zoom were not visually verified in this session.

## Release

- Cloudflare Worker: badr-boutique-studio-v2
- Version: d14d0105-066c-4e31-9316-69feb0ea3538
- Live: https://houseofbadr.com
- Previous version: d9819200-8d35-4df3-8e15-99aaa26f3059
