import {
  PackageOpen,
  MapPin,
  Boxes,
  MessageSquare,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { ADMIN_NAV, type AdminTabKey } from "@/lib/adminNavigation";
import { Button } from "@/components/ui/button";

export type DashboardAction = "processing" | "tracking" | "inventory" | "reviews";
type Props = {
  awaitingShipment: number;
  missingTracking: number;
  stockAlerts: number;
  pendingReviews: number;
  onAction: (action: DashboardAction) => void;
  onNavigate: (key: AdminTabKey) => void;
};

const shortcuts = ADMIN_NAV.filter((item) =>
  ["products", "homepage", "offers", "announcement"].includes(item.key),
);

export function AdminDashboardOverview(props: Props) {
  const tasks = [
    {
      key: "processing" as const,
      label: "Awaiting shipment",
      count: props.awaitingShipment,
      Icon: PackageOpen,
    },
    {
      key: "tracking" as const,
      label: "Missing tracking",
      count: props.missingTracking,
      Icon: MapPin,
    },
    { key: "inventory" as const, label: "Stock alerts", count: props.stockAlerts, Icon: Boxes },
    {
      key: "reviews" as const,
      label: "Reviews to approve",
      count: props.pendingReviews,
      Icon: MessageSquare,
    },
  ].filter((task) => task.count > 0);
  return (
    <div className="space-y-7">
      <section aria-label="Quick actions" data-testid="admin-manage-store-actions">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {shortcuts.map(({ key, label, Icon }) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              onClick={() => props.onNavigate(key)}
              data-testid={`admin-manage-${key}-button`}
              className="admin-action-card h-auto min-h-16 justify-start gap-3 whitespace-normal border-[rgb(var(--vibe-border))] bg-white px-4 py-3 text-left text-sm shadow-none"
            >
              <Icon className="h-4 w-4 shrink-0 text-[rgb(var(--vibe-muted))]" aria-hidden="true" />
              <span className="leading-5">{label}</span>
            </Button>
          ))}
        </div>
      </section>
      <section aria-labelledby="admin-attention-title" data-testid="admin-needs-attention">
        <h2 id="admin-attention-title" className="mb-3 text-sm font-semibold">
          Needs attention
        </h2>
        {tasks.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tasks.map(({ key, label, count, Icon }) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                onClick={() => props.onAction(key)}
                className="admin-action-card h-auto min-h-24 justify-start gap-4 border-[rgb(var(--vibe-border))] bg-white p-4 text-left shadow-none"
                data-testid={`admin-attention-${key}`}
              >
                <Icon
                  className="h-5 w-5 shrink-0 text-[rgb(var(--vibe-muted))]"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl font-semibold tabular-nums">{count}</span>
                  <span className="mt-1 block whitespace-normal text-xs font-normal text-[rgb(var(--vibe-muted))]">
                    {label}
                  </span>
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-[rgb(var(--vibe-muted))]"
                  aria-hidden="true"
                />
              </Button>
            ))}
          </div>
        ) : (
          <div className="vibe-card flex items-center gap-3 p-5 text-sm text-[rgb(var(--vibe-muted))]">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> All caught up. Nothing needs
            attention.
          </div>
        )}
      </section>
    </div>
  );
}
