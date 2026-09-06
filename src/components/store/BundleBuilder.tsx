import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SearchSelect } from "@/components/ui/search-select";
import { useCart } from "./CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { listActiveProducts, type Product } from "@/services/productService";
import { tierLabel } from "./PromotionOffers";

export function BundleBuilder({ initialProductId }: { initialProductId?: string }) {
  const config = useQuery(api.promotions.publicConfig);
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<
    Record<string, { qty: number; size?: string; color?: string }>
  >({});
  const cart = useCart();
  const { format } = useCurrency();
  const lines = Object.entries(selected).filter(([, l]) => l.qty > 0);
  const quote = useQuery(
    api.promotions.preview,
    open && lines.length
      ? { cart: lines.map(([productId, l]) => ({ productId, qty: l.qty })) }
      : "skip",
  );
  if (
    !config?.active ||
    !config.tiers.length ||
    (initialProductId &&
      config.product_ids.length &&
      !config.product_ids.includes(initialProductId as never))
  )
    return null;
  const begin = async () => {
    setOpen(true);
    setError("");
    setLoading(true);
    try {
      const catalog = (await listActiveProducts()).filter(
        (p) =>
          (!p.bundle_kind || p.bundle_kind === "single") &&
          p.in_stock !== false &&
          (p.stock_quantity ?? 0) > 0 &&
          (!config.product_ids.length || config.product_ids.includes(p.id as never)),
      );
      setProducts(catalog);
      const initial = catalog.find((p) => p.id === initialProductId);
      setSelected(
        initial
          ? {
              [initial.id]: {
                qty: 1,
                size: initial.size_options?.[0],
                color: initial.color_options?.[0],
              },
            }
          : {},
      );
    } catch {
      setError("Could not load the fragrances. Close and try again.");
    } finally {
      setLoading(false);
    }
  };
  const add = () => {
    for (const [id, line] of lines) {
      const p = products.find((p) => p.id === id)!;
      cart.addProduct(
        {
          productId: p.id,
          slug: p.slug || p.id,
          name: p.name,
          image: p.cover_image_url || "",
          price: p.sale_price_inr ?? p.price_inr,
          mrp: p.price_inr,
          selectedSize: line.size || p.size_options?.[0] || null,
          selectedColor: line.color || p.color_options?.[0] || null,
        },
        line.qty,
      );
    }
    setOpen(false);
  };
  return (
    <section className="my-6 border border-current/20 p-4 text-sm">
      <h3 className="font-semibold">Build your own bundle</h3>
      <p className="mt-2 leading-6">
        Mix your favourites. {config.tiers.map(tierLabel).join(" · ")}
      </p>
      <button
        type="button"
        onClick={() => void begin()}
        className="mt-4 min-h-11 bg-black px-5 font-semibold text-white"
      >
        Choose fragrances
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-none sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Make it yours</DialogTitle>
            <DialogDescription>
              Choose your attars. Savings apply automatically to your full cart. Free gifts are
              chosen in the cart when eligible.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <p role="status">Loading fragrances…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              <div className="space-y-4">
                {products.map((p) => {
                  const line = selected[p.id] ?? {
                    qty: 0,
                    size: p.size_options?.[0],
                    color: p.color_options?.[0],
                  };
                  const update = (patch: Partial<typeof line>) =>
                    setSelected((state) => ({ ...state, [p.id]: { ...line, ...patch } }));
                  return (
                    <div key={p.id} className="border-b border-black/15 pb-4">
                      <div className="grid grid-cols-[56px_1fr_70px] items-center gap-3">
                        <img
                          alt=""
                          src={p.cover_image_url || ""}
                          className="h-16 w-14 object-contain"
                        />
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="mt-1 text-sm">{format(p.sale_price_inr ?? p.price_inr)}</p>
                        </div>
                        <label className="text-xs">
                          Quantity
                          <input
                            type="number"
                            min={0}
                            max={Math.min(99, p.stock_quantity ?? 0)}
                            value={line.qty || ""}
                            placeholder="0"
                            className="mt-1 w-full border border-black/30 p-2 text-base"
                            onChange={(e) =>
                              update({
                                qty: Math.min(
                                  Math.max(0, Math.floor(Number(e.target.value))),
                                  p.stock_quantity ?? 0,
                                  99,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                      {line.qty > 0 && (p.size_options?.length ?? 0) > 1 ? (
                        <SearchSelect
                          label={`${p.name} size`}
                          value={line.size || ""}
                          options={p.size_options!.map((value) => ({ value, label: value }))}
                          onValueChange={(size) => update({ size })}
                        />
                      ) : null}
                      {line.qty > 0 && (p.color_options?.length ?? 0) > 1 ? (
                        <SearchSelect
                          label={`${p.name} colour`}
                          value={line.color || ""}
                          options={p.color_options!.map((value) => ({ value, label: value }))}
                          onValueChange={(color) => update({ color })}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {!products.length ? <p>No eligible fragrances are currently in stock.</p> : null}
              <div className="sticky bottom-0 space-y-3 border-t border-black/20 bg-white py-4">
                <p className="text-sm">
                  {lines.reduce((n, [, l]) => n + l.qty, 0)} attars selected
                  {quote ? ` · ${format(quote.total)}` : ""}
                </p>
                {quote?.discount ? (
                  <p className="text-sm">Selection savings: {format(quote.discount)}</p>
                ) : null}
                <button
                  type="button"
                  disabled={!lines.length || !quote || Boolean(quote.error)}
                  className="min-h-12 w-full bg-black px-5 font-semibold text-white disabled:opacity-40"
                  onClick={add}
                >
                  Add selection to cart
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
