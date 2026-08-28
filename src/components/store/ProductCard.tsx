import { Link } from "@tanstack/react-router";
import { inr, type Product } from "@/lib/products";
import { useCart } from "./CartContext";

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();

  return (
    <article className="group flex h-full flex-col border border-border bg-background">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="block overflow-hidden bg-secondary px-6 py-10"
      >
        <img
          src={product.image}
          alt={`${product.name} attar, 6 ml`}
          className="mx-auto w-full max-w-[200px] transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          loading="lazy"
        />
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
          className="mt-5 w-full bg-foreground py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-85"
        >
          Add to bag
        </button>
      </div>
    </article>
  );
}
