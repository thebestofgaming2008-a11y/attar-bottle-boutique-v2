import { SearchSelect } from "@/components/ui/search-select";
import type { GiftSelection } from "../../../convex/gifts";

export type GiftChoice = {
  id: string;
  name: string;
  image: string | null;
  available: number;
  colors: string[];
  sizes: string[];
};

export function GiftChoicePicker({
  campaignId,
  name,
  quantity,
  choices,
  selections,
  onChange,
  message,
}: {
  campaignId: string;
  name: string;
  quantity: number;
  choices: GiftChoice[];
  selections: GiftSelection[];
  onChange: (selections: GiftSelection[]) => void;
  message?: string | null;
}) {
  const slots = selections
    .filter((s) => s.campaign_id === campaignId)
    .flatMap((s) =>
      Array.from({ length: Math.min(99, s.quantity) }, () => ({ ...s, quantity: 1 })),
    );
  const update = (index: number, next: Partial<GiftSelection>) => {
    const rows = Array.from(
      { length: quantity },
      (_, i) => slots[i] ?? { campaign_id: campaignId, product_id: "", quantity: 1 },
    );
    rows[index] = { ...rows[index], ...next };
    onChange(rows);
  };
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="mt-1 text-xs leading-relaxed">
          Choose {quantity} free {quantity === 1 ? "item" : "items"}. Mix fragrances or repeat a
          favourite.
        </p>
      </div>
      {Array.from({ length: quantity }, (_, index) => {
        const selection = slots[index];
        const selected = choices.find((c) => c.id === selection?.product_id);
        const available = choices.filter(
          (c) =>
            c.available >
            slots.slice(0, quantity).filter((s, i) => i !== index && s.product_id === c.id).length,
        );
        return (
          <div key={index} className="space-y-2">
            <SearchSelect
              label={`Free item ${index + 1}`}
              placeholder="Choose your fragrance"
              value={selection?.product_id ?? ""}
              options={[
                { value: "", label: "Choose your fragrance" },
                ...available.map((c) => ({ value: c.id, label: c.name })),
              ]}
              onValueChange={(product_id) => update(index, { product_id, color: null, size: null })}
            />
            {selected && (
              <div className="flex items-center gap-3">
                {selected.image && (
                  <img src={selected.image} alt="" className="h-12 w-12 shrink-0 object-contain" />
                )}
                <p className="text-xs">{selected.name} · Free</p>
              </div>
            )}
            {selected && selected.colors.length > 1 && (
              <SearchSelect
                label={`Free item ${index + 1} colour`}
                value={selection.color ?? selected.colors[0]}
                options={selected.colors.map((value) => ({ value, label: value }))}
                onValueChange={(color) => update(index, { color })}
              />
            )}
            {selected && selected.sizes.length > 1 && (
              <SearchSelect
                label={`Free item ${index + 1} size`}
                value={selection.size ?? selected.sizes[0]}
                options={selected.sizes.map((value) => ({ value, label: value }))}
                onValueChange={(size) => update(index, { size })}
              />
            )}
            {selection?.product_id && !available.some((c) => c.id === selection.product_id) && (
              <p role="status" className="text-xs text-red-700">
                This selection is no longer available. Choose another item.
              </p>
            )}
          </div>
        );
      })}
      {message && (
        <p role="status" className="text-xs leading-relaxed">
          {message}
        </p>
      )}
    </div>
  );
}
