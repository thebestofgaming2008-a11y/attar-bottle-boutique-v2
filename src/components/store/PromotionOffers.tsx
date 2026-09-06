import { Component, useEffect, useId, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
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
export function PromotionOffers({
  disabled = false,
  variant = "all",
}: {
  disabled?: boolean;
  variant?: "all" | "progress" | "coupon";
}) {
  return (
    <OfferBoundary>
      <OfferContent disabled={disabled} variant={variant} />
    </OfferBoundary>
  );
}
function OfferContent({
  disabled,
  variant,
}: {
  disabled: boolean;
  variant: "all" | "progress" | "coupon";
}) {
  const inputId = useId();
  const config = useQuery(api.promotions.publicConfig);
  const quote = usePromotionQuote();
  const cart = useCart();
  const [input, setInput] = useState(cart.coupon);
  useEffect(() => setInput(cart.coupon), [cart.coupon]);
  const { format } = useCurrency();
  const tiers = config?.active ? config.tiers : [];
  const count = quote?.eligibleQuantity ?? 0;
  const next = tiers.find((t) => t.quantity > count);
  if (variant === "progress" && !tiers.length) return null;
  return (
    <section
      aria-label={variant === "progress" ? "Bundle savings" : "Discount code"}
      className="my-6 space-y-5 text-sm"
    >
      {variant !== "coupon" && tiers.length ? (
        <div>
          <p className="text-sm leading-6">
            {next
              ? `Add ${next.quantity - count} more for ${next.type === "percent" ? `${next.value}%` : `up to ₹${next.value}`} off.`
              : `Bundle complete${quote?.discount ? ` · You save ${format(quote.discount)}` : ""}.`}
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
        </div>
      ) : null}
      {variant !== "progress" ? (
        <div>
          <label className="sr-only" htmlFor={inputId}>
            Discount code
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={input}
              maxLength={32}
              disabled={disabled}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="Discount code"
              className="h-12 min-w-0 flex-1 border border-current/25 bg-transparent px-3 text-base outline-none focus:border-current"
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
              className="min-h-12 border border-current/25 px-5 text-sm font-medium disabled:opacity-40"
              onClick={() => cart.setCoupon(input.trim().toUpperCase())}
            >
              Apply
            </button>
          </div>
          {cart.coupon ? (
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium">{cart.coupon}</span>
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
              {quote.error}
            </p>
          ) : quote?.couponMessage ? (
            <p role="status" className="mt-2 text-xs leading-5">
              {quote.couponMessage}
            </p>
          ) : null}
          {disabled ? (
            <p className="mt-2 text-xs opacity-70">Code locked while payment is pending.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
