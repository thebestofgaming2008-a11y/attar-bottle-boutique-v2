# Announcement viewport adjustment

The existing page padding/header offset is now shared by the cart and full-screen menu. Their top edge starts at 36px only when an announcement is present. Portalled quick-view/combo dialogs center within the remaining viewport and checkout summary panels are height-limited below the bar. Empty/whitespace-only announcements reserve no space. No admin or payment code changed.

Verification: TypeScript, production build, 49 Vitest tests and 43 checkout regression tests passed. Production preview tested at 390 × 844, 320 × 568 and 1440 × 1000. Cart top was 36px and its close button passed a browser hit test; closing worked. Menu top was 36px. Locally simulating announcement removal reset cart top to 0px and cleared the portal offset, without modifying saved settings. No browser runtime errors detected.
