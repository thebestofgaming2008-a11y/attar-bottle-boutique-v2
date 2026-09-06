import { Component, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCart, type CartLine } from "./CartContext";
import { GiftChoicePicker } from "./GiftChoicePicker";
import { usePromotionQuote } from "./PromotionOffers";

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
  const { giftSelections, setGiftSelections } = useCart();
  const pricing = usePromotionQuote();
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
          has_discount: Boolean(pricing?.snapshot?.coupon_id),
          selections: giftSelections.filter((s) => s.product_id),
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
        .filter((offer) => offer.reward_mode !== "choice")
        .flatMap((offer) =>
          offer.rewards.map((gift, index) => ({ id: `${offer.id}-${index}`, gift })),
        );
  const choiceOffers = reservation
    ? []
    : (result?.offers ?? []).filter(
        (offer) =>
          offer.reward_mode === "choice" &&
          offer.eligible &&
          (offer.earned || offer.selection_required),
      );
  const staleSelections =
    !reservation &&
    result &&
    giftSelections.some((s) => s.product_id && !choiceOffers.some((o) => o.id === s.campaign_id));
  if (!awards.length && !choiceOffers.length && !staleSelections) return null;
  return (
    <section aria-label="Free gifts" className="my-4 space-y-3 border border-current/20 p-4">
      <h3 className="text-sm font-semibold">
        {international
          ? "Eligible gift requests"
          : reservation
            ? "Your reserved gifts"
            : "Your free gifts"}
      </h3>
      {staleSelections && (
        <div className="space-y-2 text-xs leading-relaxed" role="status">
          <p>
            A selected offer no longer qualifies or its gift stock changed. Remove those selections
            to continue.
          </p>
          <button
            type="button"
            className="min-h-11 underline underline-offset-4"
            onClick={() =>
              setGiftSelections((previous) =>
                previous.filter((s) => choiceOffers.some((o) => o.id === s.campaign_id)),
              )
            }
          >
            Remove unavailable gift selections
          </button>
        </div>
      )}
      {choiceOffers.map((offer) => (
        <GiftChoicePicker
          key={offer.id}
          campaignId={offer.id}
          name={offer.name}
          quantity={offer.gift.quantity}
          choices={offer.choices}
          selections={giftSelections}
          message={offer.blocked_reason}
          onChange={(rows) =>
            setGiftSelections((previous) => [
              ...previous.filter((s) => s.campaign_id !== offer.id),
              ...rows,
            ])
          }
        />
      ))}
      {awards.map(({ id, gift }, index) => (
        <div key={`${id}-${index}`} className="flex items-center gap-3">
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
