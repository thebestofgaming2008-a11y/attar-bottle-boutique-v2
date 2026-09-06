import { Component, useEffect, useId, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { Link } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { useCart } from "./CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";

export function usePromotionQuote() {
  const cart = useCart();
  return useQuery(
    api.promotions.preview,
    cart.lines.length
      ? {
          cart: cart.lines.map((l) => ({ productId: l.productId || l.slug, qty: l.qty })),
          coupon: cart.coupon,
        }
      : "skip",
  );
}
export function tierLabel(tier: { quantity: number; type: string; value: number }) {
  return `${tier.quantity}+ attars · ${tier.type === "percent" ? `${tier.value}%` : `up to ₹${tier.value}`} off`;
}
class OfferBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <p className="text-xs leading-5">
        Offers could not load. Refresh before paying to check your savings.
      </p>
    ) : (
      this.props.children
    );
  }
}
export function PromotionOffers({ disabled = false }: { disabled?: boolean }) {
  return (
    <OfferBoundary>
      <OfferContent disabled={disabled} />
    </OfferBoundary>
  );
}
function OfferContent({ disabled }: { disabled: boolean }) {
  const inputId = useId();
  const config = useQuery(api.promotions.publicConfig);
  const quote = usePromotionQuote();
  const cart = useCart();
  const [input, setInput] = useState(cart.coupon);
  useEffect(() => setInput(cart.coupon), [cart.coupon]);
  const { format, detectedCountry } = useCurrency();
  const tiers = config?.active ? config.tiers : [];
  const count = quote?.eligibleQuantity ?? 0;
  const next = tiers.find((t) => t.quantity > count);
  return (
    <section
      aria-label="Bundle savings and coupon"
      className="my-4 space-y-4 border border-current/20 p-4 text-sm"
    >
      {tiers.length ? (
        <div>
          <p className="font-semibold">Mix fragrances. Unlock savings.</p>
          <p className="mt-2 text-xs leading-5">
            {next
              ? `Add ${next.quantity - count} more eligible attar${next.quantity - count === 1 ? "" : "s"} to reach ${tierLabel(next)}.`
              : "You’ve reached the highest quantity tier."}
          </p>
          <div
            className="my-3 h-1.5 overflow-hidden bg-current/15"
            role="progressbar"
            aria-label="Bundle quantity"
            aria-valuemin={0}
            aria-valuemax={tiers.at(-1)!.quantity}
            aria-valuenow={Math.min(count, tiers.at(-1)!.quantity)}
          >
            <div
              className="h-full bg-current transition-[width] duration-300"
              style={{ width: `${Math.min(100, (count / tiers.at(-1)!.quantity) * 100)}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs">
            {tiers.map((t) => (
              <span
                key={t.quantity}
                className={count >= t.quantity ? "font-semibold" : "opacity-65"}
              >
                {tierLabel(t)}
              </span>
            ))}
          </div>
          <Link
            to="/shop"
            className="mt-3 inline-block underline underline-offset-4"
            onClick={() => cart.setOpen(false)}
          >
            Choose more fragrances
          </Link>
        </div>
      ) : null}
      {detectedCountry === "IN" ? (
        <p className="text-xs">Delivery included in India—even for one attar.</p>
      ) : (
        <p className="text-xs">
          Delivery included in India. International shipping confirmed on WhatsApp.
        </p>
      )}
      <div>
        <label className="mb-2 block text-xs font-semibold" htmlFor={inputId}>
          Have a coupon?
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            value={input}
            maxLength={32}
            disabled={disabled}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="Coupon code"
            className="min-w-0 flex-1 border border-current/30 bg-transparent px-3 py-3 text-sm"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                cart.setCoupon(input.trim().toUpperCase());
              }
            }}
          />
          <button
            type="button"
            disabled={disabled || !input.trim()}
            className="border border-current px-4 font-semibold disabled:opacity-40"
            onClick={() => cart.setCoupon(input.trim().toUpperCase())}
          >
            Apply
          </button>
        </div>
        {cart.coupon ? (
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <span>{cart.coupon}</span>
            <button
              type="button"
              disabled={disabled}
              className="underline"
              onClick={() => {
                cart.setCoupon("");
                setInput("");
              }}
            >
              Remove code
            </button>
          </div>
        ) : null}
        {quote?.error ? (
          <p role="alert" className="mt-2 text-xs leading-5">
            {quote.error} Remove or correct the code before paying.
          </p>
        ) : quote?.couponMessage ? (
          <p role="status" className="mt-2 text-xs leading-5">
            {quote.couponMessage}
          </p>
        ) : null}
      </div>
      {quote && quote.discount > 0 ? (
        <p className="font-semibold">
          {quote.snapshot.label}: save {format(quote.discount)}
        </p>
      ) : null}
      {disabled ? (
        <p className="text-xs">
          An existing payment keeps its reserved price and offer. Finish or cancel it before
          changing the coupon.
        </p>
      ) : (
        <p className="text-xs opacity-70">
          Best available discount applied. Coupon and quantity savings do not stack.
        </p>
      )}
    </section>
  );
}
