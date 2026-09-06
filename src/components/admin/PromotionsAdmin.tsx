import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Infer } from "convex/values";
import type { promotionConfig } from "../../../convex/promotionModel";
import type { Product } from "@/services/productService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { toast } from "sonner";

type Config = Infer<typeof promotionConfig>;
const types = [
  { value: "percent", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed discount (INR)" },
];
type Coupon = {
  id?: Id<"discounts">;
  code: string;
  label: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  minimum_subtotal_inr: number;
  ends_at: string;
  used_count?: number;
};
const blankCoupon: Coupon = {
  code: "",
  label: "",
  type: "percent",
  value: 0,
  active: false,
  minimum_subtotal_inr: 0,
  ends_at: "",
};
export function PromotionsAdmin({ products }: { products: Product[] }) {
  const stored = useQuery(api.promotions.adminConfig) as
    { draft: Config; published: Config } | undefined;
  const coupons = useQuery(api.promotions.listCoupons) as Coupon[] | undefined;
  const saveConfig = useMutation(api.promotions.saveConfig);
  const saveCoupon = useMutation(api.promotions.saveCoupon);
  const [draft, setDraft] = useState<Config | null>(null);
  const [coupon, setCoupon] = useState<Coupon>({ ...blankCoupon });
  const [busy, setBusy] = useState(false);
  const config = draft ?? stored?.draft;
  if (!config || !coupons) return <p role="status">Loading offers…</p>;
  const update = (patch: Partial<Config>) => setDraft({ ...config, ...patch });
  const save = async (publish: boolean) => {
    setBusy(true);
    try {
      await saveConfig({ config, publish });
      toast.success(publish ? "Offer settings published" : "Draft saved — live offers unchanged");
      setDraft(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save offers");
    } finally {
      setBusy(false);
    }
  };
  const saveCode = async (active: boolean) => {
    setBusy(true);
    try {
      const { used_count, ...input } = coupon;
      await saveCoupon({ ...input, active });
      toast.success(active ? "Coupon published" : "Coupon saved as inactive");
      setCoupon({ ...blankCoupon });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save coupon");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Offers & coupons</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Set your own savings. Drafts never change checkout. Best discount wins; coupons and
          quantity tiers do not add together. Gifts keep their own combination settings.
        </p>
      </header>
      <section className="space-y-5 rounded-lg border border-slate-300 bg-white p-5">
        <h3 className="text-lg font-semibold">Build-your-own bundle savings</h3>
        <p className="text-sm text-slate-600">
          Live status: {stored?.published.active ? "Enabled" : "Off"}. Applies to current selling
          prices of eligible individual attars, not fixed combos/packs or free gifts.
        </p>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={config.active}
            onChange={(e) => update({ active: e.target.checked })}
          />
          Enable quantity discounts when published
        </label>
        <p className="text-xs leading-5 text-slate-600">
          Example: choose a quantity of 2 and enter the discount you want to offer. No example
          discount is pre-filled.
        </p>
        {config.tiers.map((tier, index) => (
          <div
            key={index}
            className="grid items-end gap-3 rounded-md border border-slate-300 p-3 sm:grid-cols-[90px_1fr_100px_auto]"
          >
            <label className="text-xs font-medium">
              Buy at least
              <Input
                className="mt-2"
                type="number"
                min={2}
                max={99}
                value={tier.quantity || ""}
                onChange={(e) =>
                  update({
                    tiers: config.tiers.map((t, i) =>
                      i === index ? { ...t, quantity: Number(e.target.value) } : t,
                    ),
                  })
                }
              />
            </label>
            <SearchSelect
              label="Discount type"
              value={tier.type}
              options={types}
              onValueChange={(value) =>
                update({
                  tiers: config.tiers.map((t, i) =>
                    i === index ? { ...t, type: value as "percent" | "fixed" } : t,
                  ),
                })
              }
            />
            <label className="text-xs font-medium">
              Discount value
              <Input
                className="mt-2"
                type="number"
                min={0}
                step="0.01"
                value={tier.value || ""}
                onChange={(e) =>
                  update({
                    tiers: config.tiers.map((t, i) =>
                      i === index ? { ...t, value: Number(e.target.value) } : t,
                    ),
                  })
                }
              />
            </label>
            <Button
              variant="outline"
              onClick={() => update({ tiers: config.tiers.filter((_, i) => i !== index) })}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          disabled={config.tiers.length >= 8}
          onClick={() =>
            update({
              tiers: [
                ...config.tiers,
                { quantity: (config.tiers.at(-1)?.quantity ?? 1) + 1, type: "percent", value: 0 },
              ],
            })
          }
        >
          Add quantity tier
        </Button>
        <details className="rounded-md border border-slate-300 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Eligible attars:{" "}
            {config.product_ids.length
              ? `${config.product_ids.length} selected`
              : "All individual attars"}
          </summary>
          <p className="my-3 text-xs">
            Leave all unchecked to include every individual attar, including future ones.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {products
              .filter((p) => !p.bundle_kind || p.bundle_kind === "single")
              .map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.product_ids.includes(p.id as Id<"products">)}
                    onChange={(e) =>
                      update({
                        product_ids: e.target.checked
                          ? [...config.product_ids, p.id as Id<"products">]
                          : config.product_ids.filter((id) => id !== p.id),
                      })
                    }
                  />
                  {p.name}
                </label>
              ))}
          </div>
        </details>
        <div className="space-y-3 border-t border-slate-200 pt-5">
          <h3 className="text-lg font-semibold">Scrolling announcement banner</h3>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={config.banner_active}
              onChange={(e) => update({ banner_active: e.target.checked })}
            />
            Show banner when published
          </label>
          <label className="block text-sm">
            Messages (one per line)
            <textarea
              className="mt-2 min-h-24 w-full rounded border border-slate-300 p-3 text-sm"
              value={config.banner_messages.join("\n")}
              onChange={(e) => update({ banner_messages: e.target.value.split("\n") })}
              placeholder="Enter your delivery or offer announcement"
            />
          </label>
          <p className="text-xs text-slate-600">
            India delivery is already included. Only announce savings you have enabled.
          </p>
        </div>
        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap gap-3 border-t border-slate-300 bg-white p-5">
          <Button variant="outline" disabled={busy} onClick={() => void save(false)}>
            Save draft
          </Button>
          <Button disabled={busy} onClick={() => void save(true)}>
            Publish offer settings
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setDraft(stored!.published)}>
            Load live version
          </Button>
        </div>
      </section>
      <section className="space-y-4 rounded-lg border border-slate-300 bg-white p-5">
        <h3 className="text-lg font-semibold">Influencer & customer coupons</h3>
        <p className="text-sm leading-6 text-slate-600">
          One code per order, available to guests and accounts. Codes have unlimited redemptions
          until deactivated or expired. Fixed discounts are INR amounts. Paid uses are counted once,
          even if payment confirmation is retried.
        </p>
        {coupons.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 text-sm"
          >
            <div>
              <strong>{c.code}</strong> · {c.active ? "Live" : "Inactive"}
              <p className="mt-1 text-xs text-slate-600">
                {c.label || "No influencer label"} · {c.used_count} paid uses
              </p>
            </div>
            <Button variant="outline" onClick={() => setCoupon(c)}>
              Edit
            </Button>
          </div>
        ))}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Coupon code
            <Input
              className="mt-2"
              disabled={Boolean(coupon.id)}
              value={coupon.code}
              maxLength={32}
              onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })}
            />
          </label>
          <label className="text-sm">
            Influencer / internal label
            <Input
              className="mt-2"
              value={coupon.label}
              onChange={(e) => setCoupon({ ...coupon, label: e.target.value })}
            />
          </label>
          <SearchSelect
            label="Coupon discount type"
            value={coupon.type}
            options={types}
            onValueChange={(value) => setCoupon({ ...coupon, type: value as Coupon["type"] })}
          />
          <label className="text-sm">
            Discount value
            <Input
              className="mt-2"
              type="number"
              min={0}
              step="0.01"
              value={coupon.value || ""}
              onChange={(e) => setCoupon({ ...coupon, value: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm">
            Minimum subtotal (INR)
            <Input
              className="mt-2"
              type="number"
              min={0}
              value={coupon.minimum_subtotal_inr || ""}
              onChange={(e) =>
                setCoupon({ ...coupon, minimum_subtotal_inr: Number(e.target.value) })
              }
            />
          </label>
          <label className="text-sm">
            Expires at (UTC, optional)
            <Input
              className="mt-2"
              type="datetime-local"
              value={coupon.ends_at.slice(0, 16)}
              onChange={(e) =>
                setCoupon({ ...coupon, ends_at: e.target.value ? `${e.target.value}:00.000Z` : "" })
              }
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
          <Button variant="outline" disabled={busy} onClick={() => void saveCode(false)}>
            {coupon.active ? "Deactivate coupon" : "Save inactive coupon"}
          </Button>
          <Button disabled={busy} onClick={() => void saveCode(true)}>
            {coupon.active ? "Save live coupon" : "Publish coupon"}
          </Button>
          <Button variant="ghost" onClick={() => setCoupon({ ...blankCoupon })}>
            New coupon
          </Button>
        </div>
      </section>
    </div>
  );
}
