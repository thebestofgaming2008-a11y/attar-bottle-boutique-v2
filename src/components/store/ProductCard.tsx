import { Link } from "@tanstack/react-router";
import { inr, type Product } from "@/lib/products";
import { useCart } from "./CartContext";

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();

  return (
    <article className="motion-card group flex h-full flex-col border border-border bg-background">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block overflow-hidden bg-secondary px-6 py-10"
      >
        <img
          src={product.image}
          alt={`${product.name} attar, 6 ml`}
          className="mx-auto w-full max-w-[200px] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
          loading="lazy"
        />
        <span className="absolute inset-x-4 bottom-4 translate-y-3 bg-foreground px-4 py-3 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-background opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
          View scent
        </span>
      </Link>

      <div className="flex flex-1 flex-col px-5 py-5">
        <Link to="/product/$id" params={{ id: product.id }} className="min-w-0">
          <h3 className="truncate font-display text-xl leading-none">{product.name}</h3>
        </Link>
        <p className="mt-2 line-clamp-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {product.mood}
        </p>
        <p className="mt-3 text-sm">{inr(product.price)}</p>
        <button
          onClick={() => cart.add(product.id)}
          className="motion-button mt-5 w-full bg-foreground py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-background hover:-translate-y-0.5 hover:shadow-lg"
        >
          Add to bag
        </button>
      </div>
    </article>
  );
}
