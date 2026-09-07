# Admin interface cleanup

- Consolidated navigation into four groups with a distinct icon for every destination. All existing destinations remain available.
- Shared navigation rendering across desktop, mobile and the sign-in shell. Labels wrap rather than truncate, targets are at least 44px, and active destinations use aria-current.
- Replaced the unanimated mobile overlay with the existing accessible Sheet: enter/exit motion, Escape/backdrop dismissal, focus containment/restoration, independent scrolling, and mobile sign-out.
- Replaced the large dashboard instruction panel and repeated numbered navigation cards with compact shortcuts and a single actionable workload section. Removed the redundant combined “To action” total and non-actionable in-transit card. Zero queues are omitted; an empty workload has one clear state.
- Attention actions lead to the relevant screen; shipment/tracking actions reset order search and select the appropriate queue.
- Revenue headline now sums the displayed date range rather than all time. Removed hardcoded +0.0%. Best-seller timeframe is labelled all-time.
- Added lightweight tab fades, button feedback and card hover transitions scoped to admin. Existing reduced-motion overrides respected. Used React/shadcn composition guidance without changing the established palette or installing dependencies.

## Verification

TypeScript, production build and Wrangler dry run passed. 44 Vitest tests plus 43 checkout regression tests passed (87 total). Added static-render coverage for nonduplicated workload counts, empty state and complete shared navigation; icon uniqueness and four groups are enforced.

Browser checked the actual extracted presentation components in an isolated fixture at 390px and 1440px. Confirmed menu selection, Escape/focus return, queue action dispatch, empty state, no horizontal overflow or runtime errors. Normal menu animation was 0.5s; reduced-motion emulation reduced it to 0.00001s. Fixtures make no backend requests or production writes. Authenticated live CRUD was not re-exercised for this presentation-only change.

No product, promotion, order, payment, auth-policy, database, or secret changes. Deployment preserves Cloudflare variables with --keep-vars.
