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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Config = Infer<typeof promotionConfig>;
export type PromotionSection = "bundles" | "coupons" | "announcement";
const types = [
  { value: "percent", label: "Percentage (%)" },
  { value: "fixed", label: "Amount (₹)" },
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
const titles = {
  bundles: "Build your own bundle",
  coupons: "Coupons",
  announcement: "Announcement bar",
};
const descriptions = {
  bundles: "Customers choose the fragrances. You set the savings.",
  coupons: "Create a discount code for customers or creators.",
  announcement: "Short messages above your store header.",
};
const card = "rounded-lg border border-slate-200 bg-white p-5 sm:p-7";

export function PromotionsAdmin({
  products,
  section = "bundles",
}: {
  products: Product[];
  section?: PromotionSection;
}) {
  const stored = useQuery(api.promotions.adminConfig) as
    { draft: Config; published: Config } | undefined;
  const coupons = useQuery(api.promotions.listCoupons, section === "coupons" ? {} : "skip") as
    Coupon[] | undefined;
  const saveConfig = useMutation(api.promotions.saveConfig);
  const saveCoupon = useMutation(api.promotions.saveCoupon);
  const [draft, setDraft] = useState<Config | null>(null);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [busy, setBusy] = useState(false);
  const config = draft ?? stored?.draft;
  if (!config || !stored || (section === "coupons" && !coupons))
    return <p role="status">Loading…</p>;
  const update = (patch: Partial<Config>) => setDraft({ ...config, ...patch });
  const live =
    section === "announcement" ? stored.published.banner_active : stored.published.active;
  const save = async (publish: boolean) => {
    if (section === "coupons") return;
    setBusy(true);
    try {
      await saveConfig({ config, publish, section });
      toast.success(publish ? `${titles[section]} published` : "Draft saved");
      setDraft(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };
  const saveCode = async (active: boolean) => {
    if (!coupon) return;
    setBusy(true);
    try {
      const { used_count, ...input } = coupon;
      await saveCoupon({ ...input, active });
      toast.success(active ? "Coupon published" : "Coupon saved as inactive");
      setCoupon(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save coupon");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-3xl space-y-6 pb-8 [&_button]:min-h-11 [&_input[type=number]]:min-h-11 [&_input[type=text]]:min-h-11">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{titles[section]}</h2>
          <p className="mt-2 text-sm text-slate-600">{descriptions[section]}</p>
        </div>
        {section === "coupons" ? (
          <Button onClick={() => setCoupon({ ...blankCoupon })}>
            <Plus className="mr-2 h-4 w-4" />
            Create code
          </Button>
        ) : (
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${live ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"}`}
          >
            {live ? "Live" : "Not live"}
          </span>
        )}
      </header>

      {section === "bundles" ? (
        <>
          <section className={`${card} space-y-6`}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-semibold">Quantity discounts</h3>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={config.active}
                  onChange={(e) => update({ active: e.target.checked })}
                />
                Enabled
              </label>
            </div>
            {!config.tiers.length ? (
              <p className="py-4 text-sm text-slate-500">Add your first offer to get started.</p>
            ) : null}
            <div className="space-y-4">
              {config.tiers.map((tier, index) => (
                <div key={index} className="space-y-4 rounded-md bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium">
                      Buy {tier.quantity || "…"}+ · {tier.value || "…"}
                      {tier.type === "percent" ? "%" : " INR"} off
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove offer ${index + 1}`}
                      onClick={() => update({ tiers: config.tiers.filter((_, i) => i !== index) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 items-end gap-4 sm:grid-cols-3">
                    <label className="space-y-2 text-xs font-medium">
                      <span>Buy at least</span>
                      <Input
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
                    <label className="space-y-2 text-xs font-medium">
                      <span>Save {tier.type === "percent" ? "(%)" : "(₹)"}</span>
                      <Input
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
                    <SearchSelect
                      className="col-span-2 sm:col-span-1"
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
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              disabled={config.tiers.length >= 8}
              onClick={() =>
                update({
                  tiers: [
                    ...config.tiers,
                    {
                      quantity: (config.tiers.at(-1)?.quantity ?? 1) + 1,
                      type: "percent",
                      value: 0,
                    },
                  ],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add offer
            </Button>
          </section>
          <details className={card}>
            <summary className="cursor-pointer text-sm font-medium">
              Fragrances ·{" "}
              {config.product_ids.length
                ? `${config.product_ids.length} selected`
                : "All individual attars"}
            </summary>
            <div className="mt-5 space-y-4">
              <Button variant="outline" onClick={() => update({ product_ids: [] })}>
                Use all attars
              </Button>
              <div className="grid gap-1 sm:grid-cols-2">
                {products
                  .filter((p) => !p.bundle_kind || p.bundle_kind === "single")
                  .map((p) => (
                    <label key={p.id} className="flex min-h-11 items-center gap-3 text-sm">
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
              <p className="text-xs text-slate-500">
                No selection means all individual attars, including new ones.
              </p>
            </div>
          </details>
          <details className="px-1 text-sm text-slate-600">
            <summary className="cursor-pointer py-2">How it works</summary>
            <p className="mt-3 max-w-lg leading-6">
              Savings apply automatically to eligible attars. Fixed packs and free gifts do not
              count. Customers receive the better of a bundle discount or coupon, not both.
            </p>
          </details>
        </>
      ) : null}

      {section === "announcement" ? (
        <section className={`${card} space-y-6`}>
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold">Messages</h3>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={config.banner_active}
                onChange={(e) => update({ banner_active: e.target.checked })}
              />
              Show bar
            </label>
          </div>
          <div className="space-y-5">
            {config.banner_messages.map((message, index) => (
              <div key={index} className="flex items-end gap-2">
                <label className="flex-1 space-y-2 text-xs font-medium">
                  <span>Message {index + 1}</span>
                  <Input
                    value={message}
                    maxLength={160}
                    placeholder="Your announcement"
                    onChange={(e) =>
                      update({
                        banner_messages: config.banner_messages.map((s, i) =>
                          i === index ? e.target.value : s,
                        ),
                      })
                    }
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove message ${index + 1}`}
                  onClick={() =>
                    update({
                      banner_messages: config.banner_messages.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            disabled={config.banner_messages.length >= 6}
            onClick={() => update({ banner_messages: [...config.banner_messages, ""] })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add message
          </Button>
          <div className="space-y-3 pt-3">
            <p className="text-xs font-medium text-slate-500">Preview</p>
            <div className="overflow-hidden bg-black px-5 py-3 text-center text-xs font-medium tracking-wide text-white">
              {config.banner_messages.filter(Boolean).join("  ·  ") ||
                "Your announcement appears here"}
            </div>
          </div>
        </section>
      ) : null}

      {section !== "coupons" ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Button variant="ghost" disabled={busy} onClick={() => setDraft(stored.published)}>
            Reset to live
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" disabled={busy} onClick={() => void save(false)}>
              Save draft
            </Button>
            <Button disabled={busy} onClick={() => void save(true)}>
              {busy ? "Saving…" : "Publish"}
            </Button>
          </div>
        </div>
      ) : null}

      {section === "coupons" ? (
        <section className={card}>
          {!coupons?.length ? (
            <div className="py-10 text-center">
              <p className="font-medium">No coupon codes yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Create a code when you're ready to offer a discount.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {coupons.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 py-5">
                  <div>
                    <p className="text-sm font-semibold">{c.code}</p>
                    <p className="mt-2 text-xs text-slate-600">
                      {c.type === "percent" ? `${c.value}%` : `₹${c.value}`} off ·{" "}
                      {c.active ? "Live" : "Inactive"} · {c.used_count ?? 0} uses
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setCoupon(c)}>
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
      <Dialog
        open={Boolean(coupon)}
        onOpenChange={(open) => {
          if (!open && !busy) setCoupon(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg [&_input]:h-12 [&_button]:min-h-11">
          <DialogHeader>
            <DialogTitle>{coupon?.id ? "Edit coupon" : "Create coupon"}</DialogTitle>
            <DialogDescription>One code per order. The best discount applies.</DialogDescription>
          </DialogHeader>
          {coupon ? (
            <div className="space-y-6 pt-3">
              <label className="block space-y-2 text-sm">
                <span>Code</span>
                <Input
                  autoCapitalize="characters"
                  disabled={Boolean(coupon.id)}
                  value={coupon.code}
                  maxLength={32}
                  onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })}
                />
              </label>
              <div className="grid grid-cols-2 items-end gap-4">
                <SearchSelect
                  label="Discount type"
                  value={coupon.type}
                  options={types}
                  onValueChange={(value) => setCoupon({ ...coupon, type: value as Coupon["type"] })}
                />
                <label className="space-y-2 text-sm">
                  <span>Save {coupon.type === "percent" ? "(%)" : "(₹)"}</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={coupon.value || ""}
                    onChange={(e) => setCoupon({ ...coupon, value: Number(e.target.value) })}
                  />
                </label>
              </div>
              <details className="border-t border-slate-200 pt-4">
                <summary className="cursor-pointer text-sm font-medium">More options</summary>
                <div className="mt-5 space-y-5">
                  <label className="block space-y-2 text-sm">
                    <span>Creator / internal label</span>
                    <Input
                      value={coupon.label}
                      onChange={(e) => setCoupon({ ...coupon, label: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span>Minimum spend (₹)</span>
                    <Input
                      type="number"
                      min={0}
                      value={coupon.minimum_subtotal_inr || ""}
                      onChange={(e) =>
                        setCoupon({ ...coupon, minimum_subtotal_inr: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span>Expiry (UTC, optional)</span>
                    <Input
                      type="datetime-local"
                      value={coupon.ends_at.slice(0, 16)}
                      onChange={(e) =>
                        setCoupon({
                          ...coupon,
                          ends_at: e.target.value ? `${e.target.value}:00.000Z` : "",
                        })
                      }
                    />
                  </label>
                  <p className="text-xs leading-5 text-slate-500">
                    Unlimited uses until disabled or expired.
                  </p>
                </div>
              </details>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <Button variant="outline" disabled={busy} onClick={() => void saveCode(false)}>
                  {coupon.active ? "Deactivate" : "Save inactive"}
                </Button>
                <Button disabled={busy} onClick={() => void saveCode(true)}>
                  {busy ? "Saving…" : coupon.active ? "Save changes" : "Publish code"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
