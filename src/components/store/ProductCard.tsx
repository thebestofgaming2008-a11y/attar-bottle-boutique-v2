import { Link } from "@tanstack/react-router";
import { useCurrency } from "@/contexts/CurrencyContext";
import { type Product } from "@/lib/products";
import { useCart } from "./CartContext";

export function ProductCard({
  product,
  dark = false,
  showType = false,
}: {
  product: Product;
  dark?: boolean;
  showType?: boolean;
}) {
  const cart = useCart();
  const { format } = useCurrency();

  return (
    <article
      className={`group flex min-w-0 flex-col text-center ${dark ? "text-white" : "text-black"}`}
    >
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden bg-white"
      >
        <img
          src={product.image}
          alt={`${product.name} attar, ${product.volume || "6 ml"}`}
          className="h-full w-full object-contain p-[8%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]"
          loading="lazy"
          decoding="async"
        />
        {product.badge ? (
          <span className="absolute left-0 top-0 bg-black px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-white">
            {product.badge}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col items-center px-1 pb-2 pt-4">
        <Link to="/product/$id" params={{ id: product.id }}>
          <h3 className="font-display text-[15px] leading-tight sm:text-lg">
            {product.name} <span className="whitespace-nowrap">({product.volume || "6 ml"})</span>
          </h3>
        </Link>
        {showType ? (
          <p
            className={`mt-2 text-[9px] uppercase tracking-[0.12em] ${dark ? "text-white/55" : "text-black/50"}`}
          >
            {product.category}
          </p>
        ) : null}
        <div className="mt-3 flex items-baseline justify-center gap-2 text-xs sm:text-sm">
          <span>{format(product.price)}</span>
          {product.mrp > product.price ? (
            <span className={dark ? "text-white/40 line-through" : "text-black/35 line-through"}>
              {format(product.mrp)}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={product.inStock === false}
          onClick={() => cart.add(product.id)}
          className={`mt-4 min-h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-40 ${
            dark ? "bg-white text-black hover:bg-white/75" : "bg-black text-white hover:bg-black/70"
          }`}
        >
          {product.inStock === false ? "Sold out" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}
