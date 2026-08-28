import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD, PRODUCTS, inr } from "@/lib/products";
import { useCart } from "./CartContext";

export function CartDrawer() {
  const { open, setOpen, lines, subtotal, setQty, add } = useCart();
  const onClose = () => setOpen(false);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const inCart = new Set(lines.map((l) => l.id));
  const suggestions = PRODUCTS.filter((p) => !inCart.has(p.id)).slice(0, 3);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-foreground/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-5">
          <h2 className="truncate text-sm font-semibold tracking-[0.18em] uppercase">
            Your cart ({lines.reduce((s, l) => s + l.qty, 0)})
          </h2>
          <button onClick={onClose} aria-label="Close cart" className="shrink-0 p-1">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-border px-5 py-5">
          <p className="text-center text-sm">
            {remaining > 0 ? (
              <>
                You're <span className="font-semibold">{inr(remaining)}</span> away from free
                shipping
              </>
            ) : (
              <span className="font-semibold">Free shipping unlocked</span>
            )}
          </p>
          <div className="mt-3 h-[3px] w-full bg-border">
            <div
              className="h-full bg-foreground transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-5">
          {lines.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 py-5"
                >
                  <img
                    src={line.image}
                    alt={line.name}
                    className="h-16 w-16 shrink-0 object-contain"
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
                        className="px-2.5 py-1.5"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-sm">{line.qty}</span>
                      <button
                        aria-label={`Increase ${line.name}`}
                        onClick={() => setQty(line.id, line.qty + 1)}
                        className="px-2.5 py-1.5"
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
              <div className="no-scrollbar -mx-5 mt-4 flex gap-3 overflow-x-auto px-5">
                {suggestions.map((p) => (
                  <div key={p.id} className="w-36 shrink-0 border border-border p-3">
                    <img src={p.image} alt={p.name} className="mx-auto h-20 object-contain" />
                    <p className="mt-2 truncate text-xs font-semibold uppercase">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{inr(p.price)}</p>
                    <button
                      onClick={() => add(p.id)}
                      className="mt-2 w-full border border-foreground py-1.5 text-[11px] font-semibold uppercase tracking-widest"
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
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 bg-foreground py-4 text-sm font-semibold uppercase tracking-[0.2em] text-background disabled:opacity-40"
            disabled={lines.length === 0}
          >
            <ShoppingBag className="h-4 w-4" /> Checkout
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            COD available · Free returns within 7 days
          </p>
        </footer>
      </aside>
    </div>
  );
}
