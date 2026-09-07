import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AdminDashboardOverview } from "../src/components/admin/AdminDashboardOverview";
import { AdminNavList } from "../src/components/admin/AdminNavigation";
import { ADMIN_NAV } from "../src/lib/adminNavigation";

test("original quick tiles show one count each, not total and active/action counts together", () => {
  const html = renderToStaticMarkup(
    createElement(AdminDashboardOverview, {
      awaitingShipment: 7,
      missingTracking: 4,
      stockAlerts: 2,
      pendingReviews: 1,
      inTransit: 3,
      orderCount: 15,
      productCount: 5,
      onNavigate() {},
    }),
  );
  const quickTiles = html.slice(html.indexOf('data-testid="admin-quick-nav"'));
  for (const count of [15, 5, 2, 1])
    expect(quickTiles.match(new RegExp(`>${count}<`, "g"))).toHaveLength(1);
  expect(quickTiles).not.toContain("to action");
  expect(quickTiles).not.toContain(" active");
  expect(html).not.toContain("Quick actions");
  expect(html).not.toContain("+0.0%");
});

test("original dashboard cards stay in place when counts reach zero", () => {
  const html = renderToStaticMarkup(
    createElement(AdminDashboardOverview, {
      awaitingShipment: 0,
      missingTracking: 0,
      stockAlerts: 0,
      pendingReviews: 0,
      inTransit: 0,
      orderCount: 0,
      productCount: 0,
      onNavigate() {},
    }),
  );
  expect(html).toContain("Awaiting shipment");
  expect(html).toContain("In transit");
  expect(html).toContain('data-testid="admin-quick-nav"');
  expect(html).not.toContain('data-testid="admin-manage-store-actions"');
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
