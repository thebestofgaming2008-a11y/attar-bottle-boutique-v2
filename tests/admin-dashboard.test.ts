import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AdminDashboardOverview } from "../src/components/admin/AdminDashboardOverview";
import { AdminNavList } from "../src/components/admin/AdminNavigation";
import { ADMIN_NAV } from "../src/lib/adminNavigation";

test("dashboard displays each workload count once, without combined or in-transit counters", () => {
  const html = renderToStaticMarkup(
    createElement(AdminDashboardOverview, {
      awaitingShipment: 7,
      missingTracking: 4,
      stockAlerts: 2,
      pendingReviews: 1,
      onAction() {},
      onNavigate() {},
    }),
  );
  for (const count of [7, 4, 2, 1])
    expect(html.match(new RegExp(`>${count}<`, "g"))).toHaveLength(1);
  expect(html).not.toContain("To action");
  expect(html).not.toContain("In transit");
  expect(html).not.toContain("+0.0%");
});

test("empty dashboard shows one calm state, not four zero cards", () => {
  const html = renderToStaticMarkup(
    createElement(AdminDashboardOverview, {
      awaitingShipment: 0,
      missingTracking: 0,
      stockAlerts: 0,
      pendingReviews: 0,
      onAction() {},
      onNavigate() {},
    }),
  );
  expect(html).toContain("All caught up");
  expect(html).not.toContain('data-testid="admin-attention-');
});

test("the shared menu renders every destination once with an accessible current destination", () => {
  const html = renderToStaticMarkup(createElement(AdminNavList, { active: "offers" }));
  for (const item of ADMIN_NAV) {
    expect(html.match(new RegExp(`data-testid="admin-nav-${item.key}-button"`, "g"))).toHaveLength(
      1,
    );
  }
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
});
