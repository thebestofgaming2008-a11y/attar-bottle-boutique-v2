import { SearchSelect } from "@/components/ui/search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/services/productService";
import type { ProductInput } from "@/services/adminService";

type Props = {
  kind: NonNullable<ProductInput["bundle_kind"]>;
  items: NonNullable<ProductInput["bundle_items"]>;
  products: Product[];
  locked?: boolean;
  onChange: (patch: Pick<ProductInput, "bundle_kind" | "bundle_items">) => void;
};

export function BundleEditor({ kind, items, products, locked, onChange }: Props) {
  const available = products.filter(
    (p) => (!p.bundle_kind || p.bundle_kind === "single") && p.is_active !== false,
  );
  const update = (index: number, patch: Partial<Props["items"][number]>) =>
    onChange({
      bundle_items: items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  const totals = new Map<string, number>();
  for (const item of items)
    totals.set(item.product_id, (totals.get(item.product_id) ?? 0) + item.quantity);
  const stock = totals.size
    ? Math.max(
        0,
        Math.min(
          ...Array.from(totals, ([id, qty]) => {
            const p = available.find((p) => p.id === id);
            return qty > 0 && p && p.in_stock !== false
              ? Math.floor((p.stock_quantity ?? 0) / qty)
              : 0;
          }),
        ),
      )
    : 0;
  return (
    <section className="space-y-4 rounded-lg border border-slate-300 bg-slate-50 p-4">
      <div>
        <h3 className="text-base font-semibold text-slate-950">Individual, combo or multipack</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Sell one attar, a set of different attars, or several bottles of the same attar.
        </p>
      </div>
      <SearchSelect
        label="Selling format"
        value={kind}
        disabled={locked}
        options={[
          { value: "single", label: "Individual attar" },
          { value: "combo", label: "Combo — different attars" },
          { value: "pack", label: "Multipack — one attar, multiple bottles" },
        ]}
        onValueChange={(value) =>
          onChange({ bundle_kind: value as Props["kind"], bundle_items: [] })
        }
      />
      {locked ? (
        <p className="text-xs text-slate-600">
          To change the selling format, create a new product. You can still edit this pack’s
          contents.
        </p>
      ) : null}
      {kind !== "single" ? (
        <>
          <p className="text-sm leading-6 text-slate-700">
            Contents below are for <strong>one pack</strong>. Set the total pack price and its
            photos in the product form. Stock updates automatically from the included bottles.
          </p>
          {items.map((item, index) => {
            const p = products.find((p) => p.id === item.product_id);
            return (
              <div
                key={index}
                className="space-y-3 rounded-md border border-slate-300 bg-white p-3"
              >
                <SearchSelect
                  label={`Included attar ${index + 1}`}
                  value={item.product_id}
                  placeholder="Choose an attar"
                  options={available.map((p) => ({ value: p.id, label: p.name }))}
                  onValueChange={(id) => {
                    const next = available.find((p) => p.id === id);
                    update(index, {
                      product_id: id,
                      selected_color: next?.color_options?.[0],
                      selected_size: next?.size_options?.[0],
                    });
                  }}
                />
                {p?.color_options?.length ? (
                  <SearchSelect
                    label={`Colour for item ${index + 1}`}
                    value={item.selected_color ?? ""}
                    options={p.color_options.map((value) => ({ value, label: value }))}
                    onValueChange={(value) => update(index, { selected_color: value })}
                  />
                ) : null}
                {p?.size_options?.length ? (
                  <SearchSelect
                    label={`Size for item ${index + 1}`}
                    value={item.selected_size ?? ""}
                    options={p.size_options.map((value) => ({ value, label: value }))}
                    onValueChange={(value) => update(index, { selected_size: value })}
                  />
                ) : null}
                <div className="flex items-end justify-between gap-3">
                  <label className="block max-w-40 text-sm font-medium">
                    Bottles per pack
                    <Input
                      aria-label={`Quantity for item ${index + 1}`}
                      className="mt-2 bg-white"
                      type="number"
                      min={1}
                      max={24}
                      step={1}
                      required
                      value={item.quantity || ""}
                      onChange={(e) => update(index, { quantity: Number(e.target.value) })}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onChange({ bundle_items: items.filter((_, i) => i !== index) })}
                  >
                    Remove item
                  </Button>
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            disabled={items.length >= 12 || (kind === "pack" && items.length > 0)}
            onClick={() =>
              onChange({
                bundle_items: [...items, { product_id: "", quantity: kind === "pack" ? 2 : 1 }],
              })
            }
          >
            Add included attar
          </Button>
          <p role="status" className="text-sm font-medium text-slate-800">
            {stock} complete packs available · {items.reduce((sum, i) => sum + i.quantity, 0)}{" "}
            bottles per pack
          </p>
          <p className="text-xs leading-5 text-slate-600">
            Combos need two different attars. Multipacks need at least two bottles. Maximum 24
            bottles per pack. Gift offers count a purchased pack as one product; free rewards remain
            individual attars.
          </p>
        </>
      ) : null}
    </section>
  );
}
