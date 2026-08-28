import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Heart, ShoppingBag } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { StoreShell, SiteFooter } from "@/components/store/StoreShell";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/components/store/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — BADR" }, { name: "robots", content: "noindex" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const auth = useAuth();
  const ids = useQuery(api.wishlists.listMine, auth.user ? {} : "skip");
  const products = useQuery(api.products.listByIds, ids ? { ids } : "skip");
  const toggle = useMutation(api.wishlists.toggle);
  const cart = useCart();
  const { format } = useCurrency();
  return (
    <StoreShell>
      <main className="min-h-screen bg-[#f5f2ec] px-4 pb-24 pt-32 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Saved for later</p>
          <h1 className="mt-4 font-display text-6xl">Wishlist.</h1>
          {!auth.user ? (
            <div className="mt-10 bg-background p-8 text-center">
              <p className="text-sm">Sign in to keep a wishlist across devices.</p>
              <Link
                to="/account"
                className="mt-5 inline-block bg-foreground px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-background"
              >
                Sign in
              </Link>
            </div>
          ) : products === undefined ? (
            <p className="mt-10">Loading…</p>
          ) : products.length === 0 ? (
            <p className="mt-10 bg-background p-8 text-center text-sm text-muted-foreground">
              Your wishlist is empty.
            </p>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const price = product.sale_price_inr ?? product.sale_price ?? product.price_inr;
                return (
                  <article key={product.id} className="bg-background p-5">
                    <Link to="/product/$id" params={{ id: product.slug || product.id }}>
                      <img
                        src={product.cover_image_url || ""}
                        alt={product.name}
                        className="aspect-square w-full object-contain"
                      />
                    </Link>
                    <h2 className="mt-4 font-display text-2xl">{product.name}</h2>
                    <p className="mt-2 text-sm">{format(price)}</p>
                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                      <button
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
                        className="flex items-center justify-center gap-2 bg-foreground py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-background"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" /> Add
                      </button>
                      <button
                        aria-label={`Remove ${product.name} from wishlist`}
                        onClick={() => void toggle({ productId: product.id })}
                        className="border border-foreground px-3"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}
