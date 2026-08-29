import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect } from "react";
import { PRODUCTS, inr } from "@/lib/products";
import { useCart } from "./CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";

export function CartDrawer() {
  const { open, setOpen, lines, subtotal, setQty, add } = useCart();
  const { detectedCountry } = useCurrency();
  const onClose = () => setOpen(false);
  const inCart = new Set(lines.map((l) => l.id));
  const suggestions = PRODUCTS.filter((p) => !inCart.has(p.id)).slice(0, 3);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, setOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-foreground/45 backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "visible translate-x-0 shadow-[-24px_0_70px_rgba(0,0,0,0.16)]" : "invisible translate-x-full shadow-none"}`}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-5">
          <h2 className="truncate text-sm font-semibold tracking-[0.18em] uppercase">
            Your cart ({lines.reduce((s, l) => s + l.qty, 0)})
          </h2>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="motion-button shrink-0 rounded-full p-2 hover:rotate-90 hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-border px-5 py-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em]">
            {detectedCountry === "IN"
              ? "India shipping included"
              : "International shipping and payment confirmed at checkout"}
          </p>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-5">
          {lines.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((line, index) => (
                <li
                  key={line.id}
                  className="cart-line-enter grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 py-5"
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  <img
                    src={line.image}
                    alt={line.name}
                    className="h-16 w-16 shrink-0 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold uppercase tracking-wide">
                      {line.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">6 ml roll-on</p>
                    <div className="mt-2 inline-flex items-center border border-border">
                      <button
                        aria-label={`Decrease ${line.name}`}
                        onClick={() => setQty(line.id, line.qty - 1)}
                        className="motion-button px-2.5 py-1.5 hover:bg-secondary"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-sm">{line.qty}</span>
                      <button
                        aria-label={`Increase ${line.name}`}
                        onClick={() => setQty(line.id, line.qty + 1)}
                        className="motion-button px-2.5 py-1.5 hover:bg-secondary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{inr(line.price * line.qty)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {suggestions.length > 0 && (
            <div className="border-t border-border py-6">
              <p className="eyebrow">Add more to save</p>
              <div className="no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 scroll-smooth">
                {suggestions.map((p) => (
                  <div
                    key={p.id}
                    className="motion-card w-36 shrink-0 snap-start border border-border p-3"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="mx-auto h-20 object-contain transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                    <p className="mt-2 truncate text-xs font-semibold uppercase">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{inr(p.price)}</p>
                    <button
                      onClick={() => add(p.id)}
                      className="motion-button mt-2 w-full border border-foreground py-1.5 text-[11px] font-semibold uppercase tracking-widest hover:bg-foreground hover:text-background"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-border bg-secondary px-5 pb-6 pt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="uppercase tracking-widest">Subtotal</span>
            <span className="text-lg font-semibold">{inr(subtotal)}</span>
          </div>
          {lines.length > 0 ? (
            <Link
              to="/checkout"
              onClick={onClose}
              className="motion-button mt-4 flex w-full items-center justify-center gap-2 bg-foreground py-4 text-sm font-semibold uppercase tracking-[0.2em] text-background hover:-translate-y-0.5 hover:shadow-xl"
            >
              <ShoppingBag className="h-4 w-4" /> Checkout
            </Link>
          ) : (
            <button
              className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 bg-foreground py-4 text-sm font-semibold uppercase tracking-[0.2em] text-background opacity-40"
              disabled
            >
              <ShoppingBag className="h-4 w-4" /> Checkout
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Secure Razorpay checkout in India · WhatsApp checkout internationally
          </p>
        </footer>
      </aside>
    </div>
  );
}
