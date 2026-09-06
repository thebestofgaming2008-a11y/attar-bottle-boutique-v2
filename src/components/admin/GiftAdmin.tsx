import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GiftCampaignsPanel } from "./gift-campaigns-panel";
import {
  listGiftCampaigns,
  saveGiftCampaign,
  archiveGiftCampaign,
  type GiftCampaign,
  type AdminCategory,
} from "@/services/adminService";
import type { Product } from "@/services/productService";

export function GiftAdmin({
  products,
  categories,
}: {
  products: Product[];
  categories: AdminCategory[];
}) {
  const [campaigns, setCampaigns] = useState<GiftCampaign[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError("");
    listGiftCampaigns()
      .then((rows) => {
        if (!cancelled) setCampaigns(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load gifts.");
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);
  if (error)
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-white p-6">
        <p>{error}</p>
        <button
          className="mt-4 rounded bg-black px-4 py-2 text-white"
          onClick={() => setRetry((n) => n + 1)}
        >
          Retry loading gifts
        </button>
      </div>
    );
  if (!campaigns) return <p role="status">Loading gift offers…</p>;
  return (
    <GiftCampaignsPanel
      campaigns={campaigns}
      products={products}
      categories={categories}
      onSave={async (input, id) => {
        const saved = await saveGiftCampaign(input, id);
        setCampaigns((rows) => [...(rows ?? []).filter((row) => row.id !== saved.id), saved]);
        toast.success(saved.active ? "Gift offer published" : "Gift draft saved");
        return saved;
      }}
      onDelete={async (id) => {
        const archived = await archiveGiftCampaign(id);
        if (archived) {
          setCampaigns((rows) =>
            (rows ?? []).map((row) =>
              row.id === id
                ? { ...row, active: false, archived_at: new Date().toISOString() }
                : row,
            ),
          );
          toast.success("Gift offer archived. Existing orders are unchanged.");
        }
        return archived;
      }}
    />
  );
}
