import { Component, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { CartLine } from "./CartContext";

class GiftBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <p className="py-3 text-xs">
        Gift offers could not load. Please refresh to check availability.
      </p>
    ) : (
      this.props.children
    );
  }
}

function OfferRows({
  lines,
  international = false,
  reservation,
}: {
  lines: CartLine[];
  international?: boolean;
  reservation?: { orderId: string; attemptId: string } | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  const result = useQuery(
    api.gifts.evaluateStorefront,
    lines.length && !reservation
      ? {
          cart: lines.map((line) => ({
            product_id: line.productId || line.slug,
            quantity: line.qty,
          })),
          evaluation_time: now,
        }
      : "skip",
  );
  const reserved = useQuery(
    api.gifts.reservedForCheckout,
    reservation ? { order_id: reservation.orderId, attempt_id: reservation.attemptId } : "skip",
  );
  useEffect(() => {
    if (!result?.next_change_at) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(2_147_000_000, Math.max(100, result.next_change_at - Date.now() + 100)),
    );
    return () => window.clearTimeout(timer);
  }, [result?.next_change_at, now]);
  const awards = reservation
    ? (reserved ?? []).map((gift) => ({ id: gift.campaign_id, gift }))
    : (result?.offers ?? [])
        .filter((offer) => offer.earned)
        .map((offer) => ({ id: offer.id, gift: offer.gift }));
  if (!awards.length) return null;
  return (
    <section aria-label="Free gifts" className="my-4 space-y-3 border border-current/20 p-4">
      <h3 className="text-sm font-semibold">
        {international
          ? "Eligible gift requests"
          : reservation
            ? "Your reserved gifts"
            : "Your free gifts"}
      </h3>
      {awards.map(({ id, gift }) => (
        <div key={id} className="flex items-center gap-3">
          {gift.image && (
            <img
              src={gift.image}
              alt=""
              loading="lazy"
              className="h-12 w-12 shrink-0 bg-white object-contain"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{gift.name}</p>
            <p className="mt-1 text-xs opacity-75">
              Qty {gift.quantity}
              {[gift.color, gift.size].filter(Boolean).length
                ? ` · ${[gift.color, gift.size].filter(Boolean).join(" · ")}`
                : ""}
            </p>
          </div>
          <span className="text-sm font-semibold">Free</span>
        </div>
      ))}
      <p className="text-xs leading-relaxed opacity-75">
        {international
          ? "Please ask us to confirm gifts, availability and international shipping on WhatsApp."
          : reservation
            ? "Included at no extra charge with this checkout."
            : "Applied automatically at checkout, subject to gift stock and offer eligibility."}
      </p>
    </section>
  );
}

export function GiftOffers(props: Parameters<typeof OfferRows>[0]) {
  return (
    <GiftBoundary>
      <OfferRows {...props} />
    </GiftBoundary>
  );
}
