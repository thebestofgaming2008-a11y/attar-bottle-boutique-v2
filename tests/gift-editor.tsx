// Isolated visual fixture: saves only in React memory, never to a live database.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { GiftCampaignsPanel } from "../src/components/admin/gift-campaigns-panel";
import type { GiftCampaign, AdminCategory } from "../src/services/adminService";
import type { Product } from "../src/services/productService";
import "../src/styles.css";
import { GiftChoicePicker } from "../src/components/store/GiftChoicePicker";
import type { GiftSelection } from "../convex/gifts";
import { blankGiftCampaign } from "../src/components/admin/gift-campaign-builder";

const products = [
  {
    id: "qualifier",
    name: "Oud Zafar",
    slug: "oud-zafar",
    price: 499,
    price_inr: 499,
    stock_quantity: 10,
    is_active: true,
    category: "oud",
    size_options: ["6 ml"],
  },
  {
    id: "reward",
    name: "Fitoor sample",
    slug: "fitoor",
    price: 99,
    price_inr: 99,
    stock_quantity: 20,
    is_active: true,
    category: "fresh",
    size_options: ["2 ml"],
  },
] as Product[];
const categories = [
  { id: "oud-category", slug: "oud", name: "Oud", type: "category", is_active: true },
] as AdminCategory[];
export function Fixture() {
  const [campaigns, setCampaigns] = useState<GiftCampaign[]>(() =>
    new URLSearchParams(location.search).has("publication")
      ? [
          {
            ...blankGiftCampaign(1),
            id: "publication-fixture",
            name: "Buy any two, choose two free",
            requirements: [
              {
                label: "All products",
                scope_type: "all",
                product_ids: [],
                category_ids: [],
                collection_slugs: [],
                required_quantity: 2,
              },
            ],
            reward_mode: "choice",
            reward_scope: "all",
            gift_quantity: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
      : [],
  );
  const [status, setStatus] = useState("No local changes");
  const [selections, setSelections] = useState<GiftSelection[]>([]);
  return (
    <main className="min-h-screen bg-[#f5f6f8] p-4 md:p-8">
      <p role="status" className="mb-5 text-sm">
        Local UI test — no production writes. {status}
      </p>
      <GiftCampaignsPanel
        campaigns={campaigns}
        products={products}
        categories={categories}
        onSave={async (input, id) => {
          const saved = {
            ...input,
            id: id || `fixture-${campaigns.length}`,
            archived_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setCampaigns((rows) => [...rows.filter((row) => row.id !== saved.id), saved]);
          setStatus(`Saved ${saved.name} (${saved.active ? "active" : "draft"})`);
          return saved;
        }}
        onDelete={async (id) => {
          setCampaigns((rows) =>
            rows.map((row) =>
              row.id === id
                ? { ...row, active: false, archived_at: new Date().toISOString() }
                : row,
            ),
          );
          setStatus("Archived");
          return true;
        }}
      />
      <Toaster />
      <section
        className="mx-auto mt-10 max-w-md bg-white p-5"
        aria-label="Customer gift picker test"
      >
        <h2 className="mb-4 text-lg font-bold">Customer gift picker test</h2>
        <GiftChoicePicker
          campaignId="fixture-choice"
          name="Buy any 2, choose any 2 free"
          quantity={2}
          selections={selections}
          onChange={setSelections}
          choices={products.map((p) => ({
            id: p.id,
            name: p.name,
            image: null,
            available: 5,
            colors: [],
            sizes: p.size_options ?? [],
          }))}
        />
        <p role="status" className="mt-4 text-xs">
          Selected gifts:{" "}
          {selections
            .filter((s) => s.product_id)
            .map((s) => `${s.quantity} × ${s.product_id}`)
            .join(", ") || "none"}
        </p>
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
