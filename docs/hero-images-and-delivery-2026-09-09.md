# Hero bottle images and checkout presentation

## Client workflow

Open Admin → Homepage → Hero → Hero bottle images. Choose a fragrance, upload its replacement image (or select an existing product photo), then adjust bottle size and left/right/up/down position. Match the bottle cap and base to the same green guides for each fragrance. Preview the homepage and publish when ready.

The images belong to the homepage draft, independently of product galleries. Uploading does not publish. The original hero image remains available using “Use original hero image”; homepage revision restore also includes image settings. No existing published homepage content was changed during this release.

There is no automatic crop, background removal, stretching, or bottle detection. A common proportional frame is shared by editor and storefront; photos with different internal padding need manual adjustment. Transparent PNG/WebP is preferable on the dark background. The existing R2 uploader may proportionally resize/compress large uploads, but does not crop. Check the entire bottle remains inside the preview after increasing its size.

India checkout shipping is now uppercase green FREE. International shipping remains “Confirmed on WhatsApp”. Actual promotion savings in cart and checkout are green. Pricing, payment and gift calculations are unchanged.

## Verification

- 93 Vitest tests passed, including five new tests covering draft isolation, publication/restore, admin permissions, bounded settings, unsafe URLs, shared image rendering, and delivery/savings presentation.
- 43 checkout regression tests passed.
- TypeScript, production build and route-bundle guard passed; main entry remains 341,761 bytes with admin code split separately.
- Production build served HTTP 200 locally for homepage, shop, Dariya product, checkout and admin, without the error-page response.
- Convex production schema/function deployment succeeded, with no deleted indexes.
- Browser visual verification was unavailable: CUA reported no browsers and could not open the in-app browser. No real-phone or authenticated R2 upload test is claimed for this release.
- A backend-free visual fixture is available at `/tests/hero-editor.html` using `npx vite --config tests/browser.vite.ts`. Its phone-width toggle checks container-responsive controls; it is not part of the production build.

No payment transaction, real order, secret, merchant setting or customer data was changed.
