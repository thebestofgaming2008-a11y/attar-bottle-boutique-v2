import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { StoreShell } from "@/components/store/StoreShell";

export const Route = createFileRoute("/order-confirmation")({
  validateSearch: (search: Record<string, unknown>) => ({
    order: search["order"] ? String(search["order"]) : undefined,
    email: search["email"] ? String(search["email"]) : undefined,
  }),
  head: () => ({
    meta: [{ title: "Order confirmed — BADR" }, { name: "robots", content: "noindex" }],
  }),
  component: OrderConfirmation,
});

function OrderConfirmation() {
  const { order, email } = Route.useSearch();
  return (
    <StoreShell>
      <main className="grid min-h-screen place-items-center bg-[#f5f2ec] px-5 py-32 text-center">
        <div className="max-w-lg bg-background p-8 shadow-sm sm:p-12">
          <CheckCircle2 className="mx-auto h-12 w-12" />
          <p className="eyebrow mt-6">Payment verified</p>
          <h1 className="mt-4 font-display text-5xl">Your BADR order is in.</h1>
          {order ? (
            <p className="mt-5 text-sm">
              Order number: <strong>{order}</strong>
            </p>
          ) : null}
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Keep your order number and email to track delivery updates.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/track-order"
              search={{ order: order || undefined, email: email || undefined }}
              className="bg-foreground px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-background"
            >
              Track order
            </Link>
            <Link
              to="/"
              className="border border-foreground px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em]"
            >
              Back to shop
            </Link>
          </div>
        </div>
      </main>
    </StoreShell>
  );
}
