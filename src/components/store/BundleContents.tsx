export type BundlePart = {
  name: string;
  quantity: number;
  selected_color?: string;
  selected_size?: string;
};
export function bundleSummary(items: BundlePart[] | undefined) {
  return (items ?? [])
    .map(
      (i) =>
        `${i.quantity} × ${i.name}${[i.selected_color, i.selected_size].filter(Boolean).length ? ` (${[i.selected_color, i.selected_size].filter(Boolean).join(", ")})` : ""}`,
    )
    .join("; ");
}
export function BundleContents({
  items,
  quantity = 1,
}: {
  items?: BundlePart[];
  quantity?: number;
}) {
  if (!items?.length) return null;
  return (
    <div className="my-3 text-sm leading-6">
      <p className="font-semibold">
        Included {quantity > 1 ? `in ${quantity} packs` : "in this pack"}
      </p>
      <ul className="mt-1 space-y-1 text-foreground/75">
        {items.map((item, i) => (
          <li key={i}>
            {item.quantity * quantity} × {item.name}
            {[item.selected_color, item.selected_size].filter(Boolean).length
              ? ` · ${[item.selected_color, item.selected_size].filter(Boolean).join(" · ")}`
              : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
