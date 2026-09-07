import {
  PackageOpen,
  CircleAlert,
  Truck,
  Clock,
  ShoppingBag,
  Package,
  Boxes,
  MessageSquare,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { AdminTabKey } from "@/lib/adminNavigation";
import { cn } from "@/lib/utils";

type Props = {
  awaitingShipment: number;
  missingTracking: number;
  inTransit: number;
  orderCount: number;
  productCount: number;
  stockAlerts: number;
  pendingReviews: number;
  onNavigate: (key: AdminTabKey) => void;
};

export function AdminDashboardOverview({
  awaitingShipment,
  missingTracking,
  inTransit,
  orderCount,
  productCount,
  stockAlerts,
  pendingReviews,
  onNavigate,
}: Props) {
  return (
    <div className="space-y-6">
      <section data-testid="admin-needs-attention">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[12px] font-medium uppercase tracking-widest text-[rgb(var(--vibe-muted))]">
            Needs your attention
          </h2>
          <button
            type="button"
            onClick={() => onNavigate("orders")}
            className="inline-flex items-center gap-1 text-[11px] text-[rgb(var(--vibe-muted))] transition-colors hover:text-[rgb(var(--vibe-foreground))]"
          >
            Go to orders <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AttentionCard
            title="Awaiting shipment"
            count={awaitingShipment}
            description="Orders not yet sent"
            Icon={PackageOpen}
            accent="warning"
          />
          <AttentionCard
            title="Missing tracking"
            count={missingTracking}
            description="Shipped without tracker"
            Icon={CircleAlert}
            accent="info"
          />
          <AttentionCard
            title="In transit"
            count={inTransit}
            description="On the way"
            Icon={Truck}
          />
          <AttentionCard
            title="To action"
            count={awaitingShipment + missingTracking}
            description="Unshipped + missing tracking"
            Icon={Clock}
          />
        </div>
      </section>

      <QuickAdminNav
        items={[
          {
            label: "Orders",
            value: orderCount,
            detail: "total orders",
            Icon: ShoppingBag,
            onClick: () => onNavigate("orders"),
          },
          {
            label: "Products",
            value: productCount,
            detail: "catalog items",
            Icon: Package,
            onClick: () => onNavigate("products"),
          },
          {
            label: "Inventory",
            value: stockAlerts,
            detail: "need attention",
            Icon: Boxes,
            onClick: () => onNavigate("inventory"),
          },
          {
            label: "Reviews",
            value: pendingReviews,
            detail: "pending",
            Icon: MessageSquare,
            onClick: () => onNavigate("reviews"),
          },
        ]}
      />
    </div>
  );
}

function AttentionCard({
  title,
  count,
  description,
  Icon,
  accent = "neutral",
}: {
  title: string;
  count: number;
  description: string;
  Icon: LucideIcon;
  accent?: "neutral" | "warning" | "info";
}) {
  const iconColor =
    accent === "warning"
      ? "text-amber-500"
      : accent === "info"
        ? "text-blue-500"
        : "text-[rgb(var(--vibe-muted))]";

  return (
    <div className="vibe-card p-4 transition-colors hover:border-zinc-400 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[12px] text-[rgb(var(--vibe-muted))] sm:text-[13px]">
          {title}
        </span>
        <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
      </div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold tracking-tight tabular-nums sm:text-[24px]">
          {count}
        </span>
        <span className="text-[11px] text-[rgb(var(--vibe-muted))]">orders</span>
      </div>
      <p className="line-clamp-2 text-[11px] text-[rgb(var(--vibe-muted))]">{description}</p>
    </div>
  );
}

function QuickAdminNav({
  items,
}: {
  items: Array<{
    label: string;
    value: number;
    detail: string;
    Icon: LucideIcon;
    onClick: () => void;
  }>;
}) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="admin-quick-nav">
      {items.map(({ label, value, detail, Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="vibe-card flex items-center gap-3 p-3 text-left transition-colors hover:border-zinc-400 hover:bg-white sm:p-4"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[rgb(var(--vibe-soft))] text-[rgb(var(--vibe-foreground))]">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{label}</span>
            <span className="mt-0.5 block text-xs text-[rgb(var(--vibe-muted))]">
              <span className="font-semibold tabular-nums text-[rgb(var(--vibe-foreground))]">
                {value}
              </span>{" "}
              {detail}
            </span>
          </span>
        </button>
      ))}
    </section>
  );
}
