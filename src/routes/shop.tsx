import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StoreShell, SiteFooter } from "@/components/store/StoreShell";
import { useCart } from "@/components/store/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { listActiveProducts } from "@/services/productService";
import { BOTTLE_IMAGES } from "@/lib/products";
import { SearchSelect } from "@/components/ui/search-select";

const SITE_ORIGIN = "https://houseofbadr.com";

export const Route = createFileRoute("/shop")({
  loader: async () => ({ products: await listActiveProducts() }),
  head: () => ({
    meta: [
      { title: "Shop all attars — BADR" },
      {
        name: "description",
        content:
          "Shop BADR's unisex 6 ml attars: oud, floral, fruity, fresh aquatic and gourmand perfume oils made in India.",
      },
      {
        name: "keywords",
        content: "shop attar online, unisex attar India, oud perfume oil, BADR attar collection",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: `${SITE_ORIGIN}/shop`,
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { products } = Route.useLoaderData();
  const cart = useCart();
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
  const collectionOptions = useMemo(
    () => [
      { value: "all", label: "All collections" },
      ...collections.map((value) => ({
        value,
        label: value.replace(
          /(^|-)([a-z])/g,
          (_, separator, letter) => `${separator === "-" ? " " : ""}${letter.toUpperCase()}`,
        ),
      })),
    ],
    [collections],
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
      <main className="min-h-screen bg-white px-3 pb-24 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-center font-display text-3xl sm:text-5xl">Shop the collection</h1>
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="flex h-12 items-center gap-3 border border-foreground/20 bg-background px-4">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search scents and notes"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <SearchSelect
              value={collection}
              onValueChange={setCollection}
              options={collectionOptions}
              searchPlaceholder="Search collections…"
            />
          </div>

          {filtered.length ? (
            <div className="mt-12 grid grid-cols-2 gap-x-2 gap-y-12 lg:grid-cols-4">
              {filtered.map((product) => {
                const price = product.sale_price_inr ?? product.sale_price ?? product.price_inr;
                const slug = product.slug || product.id;
                const sourceImage = product.cover_image_url || "";
                const displayImage = sourceImage.includes(`/products/sku-${slug}.webp`)
                  ? BOTTLE_IMAGES[slug] || sourceImage
                  : sourceImage;
                return (
                  <article
                    key={product.id}
                    className="group flex h-full min-w-0 flex-col text-center"
                  >
                    <div className="relative aspect-square overflow-hidden bg-white">
                      <Link to="/product/$id" params={{ id: slug }} className="block h-full">
                        <img
                          src={displayImage}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-[8%] transition-transform duration-700 group-hover:scale-[1.045]"
                        />
                      </Link>
                    </div>
                    <div className="flex flex-1 flex-col items-center px-1 pt-4">
                      <Link to="/product/$id" params={{ id: slug }}>
                        <h2 className="font-display text-[15px] leading-tight sm:text-lg">
                          {product.name}{" "}
                          <span className="whitespace-nowrap">
                            ({product.volume_label || "6 ml"})
                          </span>
                        </h2>
                      </Link>
                      <p className="mt-2 text-[9px] uppercase tracking-[0.1em] text-black/50">
                        {product.product_type || product.category_id || "Attar"}
                      </p>
                      <div className="mt-3 flex items-baseline gap-2 text-xs sm:text-sm">
                        <span>{format(price)}</span>
                        {product.sale_price_inr ? (
                          <span className="text-xs text-muted-foreground line-through">
                            {format(product.price_inr)}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={!product.in_stock || (product.stock_quantity ?? 0) < 1}
                        onClick={() =>
                          cart.addProduct({
                            productId: product.id,
                            slug,
                            name: product.name,
                            image: displayImage,
                            price,
                            mrp: product.price_inr,
                            selectedSize: product.size_options?.[0] || null,
                          })
                        }
                        className="mt-4 min-h-10 bg-black px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {product.in_stock ? "Add to cart" : "Sold out"}
                      </button>
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
