# Admin layout correction — 7 September 2026

Restores the familiar dashboard cards from f54c886 after the broader cleanup in 2992926. The top Manage Store shortcuts remain removed. Orders and Products quick tiles now show one count each, without a second action/active count alongside it. Revenue-period correctness and distinct navigation icons are retained.

The mobile menu uses a plain 200 ms horizontal slide in both directions. Removed the keyed tab fade, button movement and new hover lift. Reduced-motion preferences, Escape dismissal and focus return remain supported.

No database, checkout, payment, offer, gift, permission or saved-setting changes.

Verification:

- TypeScript check and production build passed.
- 44 Vitest tests and 43 checkout regression tests passed.
- Actual admin presentation components checked in the isolated fixture at 390 × 844 and 1440 × 1000.
- Browser confirmed open/closed slide keyframes, 200 ms duration and constant opacity; four rapid open/close cycles left no dialog or pointer lock.
- Reduced motion effectively disables animation; Escape restores focus to the menu button.
- No browser runtime errors in fixture checks. Authenticated production CRUD was not exercised or changed.
- Cloudflare dry run passed before deployment with dashboard variables preserved.
