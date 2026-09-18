# Customer photo reviews

Each fragrance page now has a bottom-of-page Customer reviews section, including an honest empty state and Write a review button. Buyers can give 1–5 stars, write feedback and attach up to three photos. Signed-in eligible purchasers use their account; guests verify with the order number and checkout email.

Reviews remain pending until an administrator publishes them in Admin → Reviews. Admins can inspect photo thumbnails/full-size links before publishing or hiding. Approved reviews display their stars, text and optional photos. Existing account and tracking-page text review flows remain available. No fabricated reviews or ratings were created.

## Upload safety and cost controls

- Originals are limited to 12 MB / 40 megapixels in the browser; JPG, PNG, WebP and AVIF only (HEIC requires export).
- Browser canvas re-encodes to WebP, removes source metadata and scales proportionally to at most 1200 px, under 500 KB per image.
- The Convex action checks the encoded size and WebP signature, authorizes ownership or guest paid-order credentials, and enforces three attached photos / six upload attempts per review.
- Uploads use the existing R2 handler server-to-server; the customer never receives the admin upload token and cannot supply arbitrary attachment URLs.
- R2 uses unguessable public media URLs, as with existing media. Moderation controls storefront visibility, not access by someone who already has a direct file URL. The form warns against personal details and explains public use.
- A failed photo does not lose the written review. The open form can retry remaining photos or finish without them. Closing and reopening the form on the same page preserves its state. Reloading/navigating away does not persist the photo draft.
- Upload completion cannot append to a published/hidden review. Failed/abandoned upload attempts are bounded, but an upload interrupted between R2 storage and attachment can leave an unreferenced object; no automatic R2 cleanup was introduced.

## Verification

- 102 Vitest tests and 43 checkout regressions passed (145 total).
- Tests cover paid/guest verification, ownership, duplicate account/guest reviews, moderation, photo count, retry budget, invalid/oversized data, late attachment rejection, public privacy and review rendering.
- Integration test passes through the real Worker upload handler with a simulated R2 bucket, checking headers and bytes.
- Production upload credential handshake accepted; unsupported file rejected before storage. No production test reviews or orders were created.
- TypeScript, production build and route-bundle guard passed. Existing admin code remains split from the main entry.
- Local production server returned HTTP 200 for all five fragrances, homepage, shop, checkout and admin; all five fragrance responses contain the review section and invitation.
- Browser connection unavailable (no enabled browser surfaces); no interactive phone test or real customer upload is claimed.

Production deployment target: Convex impressive-stoat-118 and Cloudflare badr-boutique-studio-v2 / houseofbadr.com. Payment code, merchant credentials, orders, gifts and published homepage content were not changed.
