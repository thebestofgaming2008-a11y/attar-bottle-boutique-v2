import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { PRODUCTS, inr, type Occasion } from "@/lib/products";
import { useCart } from "./CartContext";

const OCCASIONS: { key: Occasion; label: string }[] = [
  { key: "evening", label: "Evening & occasion" },
  { key: "everyday", label: "Everyday & work" },
  { key: "morning", label: "Morning & fresh" },
  { key: "close", label: "Close & warm" },
];

export function ScentFinder() {
  const cart = useCart();
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [intensity, setIntensity] = useState<"bold" | "soft" | null>(null);

  const result =
    occasion && intensity
      ? (PRODUCTS.find((p) => p.occasion === occasion && p.intensity === intensity) ??
        PRODUCTS.find((p) => p.occasion === occasion)!)
      : null;

  const chip = (active: boolean) =>
    `border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
      active
        ? "border-background bg-background text-foreground"
        : "border-background/30 text-background/80 hover:border-background"
    }`;

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-[11px] uppercase tracking-[0.24em] text-background/50">
        01 — When are you wearing it?
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {OCCASIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => {
              setOccasion(o.key);
              setIntensity(null);
            }}
            className={chip(occasion === o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div
        className={`transition-all duration-500 ${occasion ? "mt-10 opacity-100" : "pointer-events-none max-h-0 overflow-hidden opacity-0"}`}
      >
        <p className="text-[11px] uppercase tracking-[0.24em] text-background/50">02 — How loud?</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(["bold", "soft"] as const).map((i) => (
            <button key={i} onClick={() => setIntensity(i)} className={chip(intensity === i)}>
              {i}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="mt-10 grid grid-cols-[110px_minmax(0,1fr)] items-center gap-5 border border-background/25 p-5 duration-700 animate-in fade-in slide-in-from-bottom-4">
          <img src={result.image} alt={result.name} className="w-full" loading="lazy" />
          <div className="min-w-0">
            <h3 className="font-display text-2xl leading-none">{result.name}</h3>
            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-background/50">
              {result.mood}
            </p>
            <p className="mt-3 text-sm text-background/70">{result.hook}</p>
            <p className="mt-3 text-sm">{inr(result.price)}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => cart.add(result.id)}
                className="bg-background px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground"
              >
                Add to bag
              </button>
              <Link
                to="/product/$id"
                params={{ id: result.id }}
                className="border border-background/50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]"
              >
                See the scent
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
