import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { inr } from "@/lib/products";

export type QuickViewProduct = {
  id: string;
  slug: string;
  name: string;
  image: string;
  category: string;
  description: string;
  notes: string[];
  price: number;
  mrp?: number | null;
  inStock?: boolean;
};

export function ProductQuickView({
  product,
  open,
  onOpenChange,
  onAdd,
}: {
  product: QuickViewProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
}) {
  if (!product) return null;

  const canAdd = product.inStock !== false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] w-[calc(100%-1.5rem)] max-w-4xl gap-0 overflow-y-auto border-0 bg-[#f4f1ea] p-0 shadow-[0_30px_100px_rgba(0,0,0,0.32)] sm:rounded-none">
        <div className="grid sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden bg-white p-8 sm:min-h-[620px] sm:aspect-auto sm:p-12">
            <img
              src={product.image}
              alt={`${product.name} attar bottle`}
              className="h-full w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.035]"
              decoding="async"
            />
            <span className="absolute bottom-5 left-5 text-[9px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
              6 ml roll-on · Made in India
            </span>
          </div>

          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14">
            <p className="eyebrow">{product.category || "BADR attar"}</p>
            <DialogTitle className="mt-5 font-display text-5xl leading-[0.86] sm:text-6xl">
              {product.name}
            </DialogTitle>
            <DialogDescription className="mt-6 text-sm leading-7 text-foreground/65">
              {product.description}
            </DialogDescription>

            {product.notes.length ? (
              <ul className="mt-7 flex flex-wrap gap-2">
                {product.notes.slice(0, 5).map((note) => (
                  <li
                    key={note}
                    className="rounded-full bg-foreground/7 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em]"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-8 flex items-baseline gap-3 border-y border-foreground/15 py-5">
              <span className="font-display text-3xl">{inr(product.price)}</span>
              {product.mrp && product.mrp > product.price ? (
                <span className="text-sm text-foreground/40 line-through">{inr(product.mrp)}</span>
              ) : null}
            </div>

            <button
              type="button"
              disabled={!canAdd}
              onClick={() => {
                onOpenChange(false);
                onAdd();
              }}
              className="motion-button mt-7 flex w-full items-center justify-center gap-2 bg-foreground px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag className="h-4 w-4" /> {canAdd ? "Add to bag" : "Sold out"}
            </button>

            <Link
              to="/product/$id"
              params={{ id: product.slug }}
              onClick={() => onOpenChange(false)}
              className="motion-link mt-5 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground"
            >
              Full product details <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
