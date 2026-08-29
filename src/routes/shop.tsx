import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { StoreShell, SiteFooter } from "@/components/store/StoreShell";
import { useCart } from "@/components/store/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { listActiveProducts } from "@/services/productService";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/shop")({
  loader: async () => ({ products: await listActiveProducts() }),
  head: () => ({
    meta: [
      { title: "Shop all attars — BADR" },
      { name: "description", content: "Shop the live BADR attar collection." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { products } = Route.useLoaderData();
  const cart = useCart();
  const auth = useAuth();
  const wishlistIds = useQuery(api.wishlists.listMine, auth.user ? {} : "skip");
  const toggleWishlist = useMutation(api.wishlists.toggle);
  const { format } = useCurrency();
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("all");
  const collections = useMemo(
    () =>
      Array.from(
        new Set(products.map((product) => product.category_id).filter(Boolean)),
      ) as string[],
    [products],
  );
  const filtered = products.filter((product) => {
    const matchesCollection = collection === "all" || product.category_id === collection;
    const haystack = [product.name, product.category, product.category_id, ...(product.tags || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesCollection && haystack.includes(search.trim().toLowerCase());
  });

  return (
    <StoreShell>
      <main className="min-h-screen bg-[#f5f2ec] px-4 pb-24 pt-32 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow">Live catalog</p>
          <h1 className="mt-4 font-display text-5xl sm:text-7xl">The BADR collection.</h1>
          <div className="mt-9 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="flex h-12 items-center gap-3 border border-foreground/20 bg-background px-4">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search scents and notes"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={collection}
              onChange={(event) => setCollection(event.target.value)}
              className="h-12 border border-foreground/20 bg-background px-4 text-sm capitalize outline-none"
            >
              <option value="all">All collections</option>
              {collections.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {filtered.length ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => {
                const price = product.sale_price_inr ?? product.sale_price ?? product.price_inr;
                return (
                  <article
                    key={product.id}
                    className="motion-card group flex h-full flex-col bg-background"
                  >
                    <Link
                      to="/product/$id"
                      params={{ id: product.slug || product.id }}
                      className="relative block aspect-square overflow-hidden bg-white p-5"
                    >
                      <img
                        src={product.cover_image_url || ""}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-105"
                      />
                      <span className="product-preview absolute inset-x-4 bottom-4 translate-y-3 bg-foreground px-4 py-3 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-background opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                        View scent
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {product.category_id || "Attar"}
                      </p>
                      <Link
                        to="/product/$id"
                        params={{ id: product.slug || product.id }}
                        className="mt-2"
                      >
                        <h2 className="line-clamp-2 min-h-[2.5rem] font-display text-2xl leading-5">
                          {product.name}
                        </h2>
                      </Link>
                      <div className="mt-4 flex items-baseline gap-2 text-sm">
                        <span>{format(price)}</span>
                        {product.sale_price_inr ? (
                          <span className="text-xs text-muted-foreground line-through">
                            {format(product.price_inr)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                        <button
                          type="button"
                          disabled={!product.in_stock || (product.stock_quantity ?? 0) < 1}
                          onClick={() =>
                            cart.addProduct({
                              productId: product.id,
                              slug: product.slug || product.id,
                              name: product.name,
                              image: product.cover_image_url || "",
                              price,
                              mrp: product.price_inr,
                              selectedSize: product.size_options?.[0] || null,
                            })
                          }
                          className="motion-button flex w-full items-center justify-center gap-2 bg-foreground py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-background disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />{" "}
                          {product.in_stock ? "Add to bag" : "Sold out"}
                        </button>
                        {auth.user ? (
                          <button
                            type="button"
                            aria-label={`Toggle ${product.name} wishlist`}
                            onClick={() => void toggleWishlist({ productId: product.id })}
                            className="border border-foreground px-3"
                          >
                            <Heart
                              className={`h-4 w-4 ${wishlistIds?.includes(product.id) ? "fill-current" : ""}`}
                            />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-14 border border-foreground/15 bg-background p-8 text-center text-sm text-muted-foreground">
              No scents match those filters.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}
