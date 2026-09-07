// Presentation fixture only; no backend, auth bypass, orders or live store changes.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AdminNavList, AdminMobileNavigation } from "../src/components/admin/AdminNavigation";
import { AdminDashboardOverview } from "../src/components/admin/AdminDashboardOverview";
import { ADMIN_NAV, type AdminTabKey } from "../src/lib/adminNavigation";
import "../src/styles.css";

function Fixture() {
  const [tab, setTab] = useState<AdminTabKey>("dash");
  const [status, setStatus] = useState("");
  const [empty, setEmpty] = useState(false);
  return (
    <div className="vibe-admin admin-vibe flex min-h-screen bg-[rgb(var(--vibe-page))] text-[rgb(var(--vibe-foreground))]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[rgb(var(--vibe-border))] bg-white md:flex">
        <div className="border-b p-5 font-semibold">BADR admin</div>
        <AdminNavList active={tab} onSelect={setTab} />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[rgb(var(--vibe-border))] bg-white px-4">
          <AdminMobileNavigation
            active={tab}
            onSelect={setTab}
            onSignOut={() => setStatus("Signed out (fixture)")}
          />
          <h1 className="text-xl font-semibold">
            {ADMIN_NAV.find((item) => item.key === tab)?.label}
          </h1>
        </header>
        <main key={tab} className="admin-tab-enter mx-auto max-w-[1400px] space-y-7 p-4 sm:p-7">
          {tab === "dash" ? (
            <>
              <AdminDashboardOverview
                awaitingShipment={empty ? 0 : 7}
                missingTracking={empty ? 0 : 4}
                stockAlerts={empty ? 0 : 2}
                pendingReviews={empty ? 0 : 1}
                onNavigate={setTab}
                onAction={(action) => setStatus(`Open queue: ${action}`)}
              />
              <div className="vibe-card p-6">
                <h2 className="font-semibold">Revenue · last 7 days</h2>
                <p className="mt-2 text-2xl font-semibold">₹4,990</p>
                <p className="mt-6 text-sm text-[rgb(var(--vibe-muted))]">
                  Chart area — fixture only
                </p>
              </div>
              <button onClick={() => setEmpty(!empty)} className="admin-button">
                Toggle empty workload
              </button>
            </>
          ) : (
            <div className="vibe-card p-6">
              <p>{ADMIN_NAV.find((item) => item.key === tab)?.label} selected</p>
            </div>
          )}
          <p role="status">{status}</p>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
