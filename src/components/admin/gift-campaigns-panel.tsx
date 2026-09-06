import { Children, isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";
import { SearchSelect } from "@/components/ui/search-select";
import {
  AlertCircle,
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Gift,
  PackageCheck,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  blankGiftCampaign,
  blankGiftRequirement,
  giftCampaignDraft,
  giftCampaignSignature,
  giftCampaignStatus,
  giftCampaignSummary,
  slugifyGiftValue,
  validateGiftCampaign,
  type GiftCampaignDraft,
} from "@/components/admin/gift-campaign-builder";
import { cn } from "@/lib/utils";
import type {
  AdminCategory,
  GiftCampaign,
  GiftCampaignInput,
  GiftRequirement,
} from "@/services/adminService";
import type { Product } from "@/services/productService";

function GiftSelect({
  value,
  onChange,
  children,
  className,
  disabled,
}: {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value: string; children: ReactNode }>(child)) return [];
    return [
      { value: String(child.props.value), label: Children.toArray(child.props.children).join("") },
    ];
  });
  return (
    <SearchSelect
      value={value}
      onValueChange={(next) => onChange({ target: { value: next } })}
      options={options}
      placeholder="Choose an option"
      disabled={disabled}
      triggerClassName={className}
    />
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-[#CBD1D8] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10 disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]";
const labelClass = "mb-1.5 block text-xs font-semibold text-[#374151]";
const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#CBD1D8] bg-white px-3 text-sm font-medium text-[#25303D] transition hover:border-[#9CA3AF] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40";

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function productOptions(product: Product, type: "color" | "size") {
  return type === "color" ? (product.color_options ?? []) : (product.size_options ?? []);
}

function statusStyle(status: string) {
  if (status === "Live") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "Scheduled") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "Ended") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-[#F3F4F6] text-[#667085] ring-[#E5E7EB]";
}

function StepHeading({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#111827] text-xs font-semibold text-white">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#667085]">{description}</p>
      </div>
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>
        <span className="block text-sm font-medium text-[#111827]">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-[#667085]">{description}</span>
      </span>
      <span
        className={cn(
          "h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors",
          checked ? "bg-emerald-600" : "bg-[#CBD1D8]",
        )}
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}

function GiftPublishActions({
  active,
  saving,
  dirty,
  onAction,
}: {
  active: boolean;
  saving: boolean;
  dirty: boolean;
  onAction: (action: "save" | "publish" | "unpublish") => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Offer publishing">
      <button
        type="button"
        disabled={saving || !dirty}
        onClick={() => void onAction("save")}
        className={cn(secondaryButton, "h-11")}
      >
        {saving ? "Saving…" : active ? "Save changes" : "Save draft"}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => void onAction(active ? "unpublish" : "publish")}
        className={cn(
          "h-11 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          active
            ? "border border-[#CBD1D8] bg-white text-[#B42318] hover:bg-red-50 focus-visible:ring-red-700"
            : "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-700",
        )}
      >
        {active ? "Unpublish" : "Publish offer"}
      </button>
    </div>
  );
}

export function GiftCampaignsPanel({
  campaigns,
  products,
  categories,
  onSave,
  onDelete,
}: {
  campaigns: GiftCampaign[];
  products: Product[];
  categories: AdminCategory[];
  onSave: (input: GiftCampaignInput, id?: string) => Promise<GiftCampaign>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const firstCampaign = campaigns.find((campaign) => !campaign.archived_at) ?? campaigns[0];
  const initialDraft = firstCampaign ? giftCampaignDraft(firstCampaign) : null;
  const [draft, setDraft] = useState<GiftCampaignDraft | null>(initialDraft);
  const [savedSignature, setSavedSignature] = useState(giftCampaignSignature(initialDraft));
  const [productQuery, setProductQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [validatePublishing, setValidatePublishing] = useState(false);
  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active !== false),
    [products],
  );
  const categorys = useMemo(
    () =>
      categories
        .filter((category) => category.is_active !== false)
        .sort(
          (left, right) =>
            Number(left.sort_order ?? 999) - Number(right.sort_order ?? 999) ||
            left.name.localeCompare(right.name),
        )
        .map((category) => ({
          id: category.id,
          value: slugifyGiftValue(category.slug),
          label: category.name,
        })),
    [categories],
  );
  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return activeProducts.filter(
      (product) =>
        !query ||
        product.name.toLowerCase().includes(query) ||
        String(product.category ?? "")
          .toLowerCase()
          .includes(query),
    );
  }, [activeProducts, productQuery]);
  const reward = activeProducts.find((product) => product.id === draft?.gift_product_id);
  const readiness = draft
    ? validateGiftCampaign(
        { ...draft, active: draft.active || validatePublishing },
        reward ? Number(reward.stock_quantity ?? 0) : null,
      )
    : { errors: [], warnings: [] };
  const isDirty = Boolean(draft && giftCampaignSignature(draft) !== savedSignature);
  const currentCampaigns = campaigns.filter((campaign) => !campaign.archived_at);
  const archivedCampaigns = campaigns.filter((campaign) => campaign.archived_at);
  const liveCount = currentCampaigns.filter(
    (campaign) => giftCampaignStatus(campaign) === "Live",
  ).length;
  const otherLiveCampaigns = draft?.active
    ? currentCampaigns.filter(
        (campaign) => campaign.id !== draft.id && giftCampaignStatus(campaign) === "Live",
      ).length
    : 0;

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [isDirty]);

  const openDraft = (next: GiftCampaignDraft | null) => {
    if (isDirty && !window.confirm("Discard your unsaved gift offer changes?")) return;
    setDraft(next);
    setSavedSignature(giftCampaignSignature(next));
    setProductQuery("");
    setShowErrors(false);
    setValidatePublishing(false);
  };

  const createCampaign = () => {
    const nextSortOrder = Math.max(0, ...campaigns.map((campaign) => campaign.sort_order)) + 1;
    openDraft(blankGiftCampaign(nextSortOrder));
  };

  const updateRequirement = (index: number, patch: Partial<GiftRequirement>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            requirements: current.requirements.map((requirement, requirementIndex) =>
              requirementIndex === index ? { ...requirement, ...patch } : requirement,
            ),
          }
        : current,
    );
  };

  const submit = async (action: "save" | "publish" | "unpublish" = "save") => {
    if (!draft || saving || draft.archived_at) return;
    if (
      action === "unpublish" &&
      isDirty &&
      !window.confirm("Unpublish the saved offer and discard your unsaved edits?")
    )
      return;
    const source =
      action === "unpublish" ? campaigns.find((campaign) => campaign.id === draft.id) : null;
    const next = {
      ...(source ? giftCampaignDraft(source) : draft),
      active: action === "publish" ? true : action === "unpublish" ? false : draft.active,
    };
    setValidatePublishing(next.active);
    const nextReadiness = validateGiftCampaign(
      next,
      reward ? Number(reward.stock_quantity ?? 0) : null,
    );
    if (nextReadiness.errors.length) {
      setShowErrors(true);
      toast.error("Complete the highlighted setup items before saving.");
      document.getElementById("gift-offer-review")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setSaving(true);
    try {
      const { id, archived_at: _archivedAt, ...input } = next;
      const saved = await onSave(
        {
          ...input,
          name: input.name.trim(),
          requirements: input.requirements.map((requirement) => ({
            ...requirement,
            label:
              requirement.label.trim() ||
              (requirement.scope_type === "collection"
                ? categorys.find((item) => item.value === requirement.collection_slugs[0])?.label ||
                  "Selected category"
                : requirement.scope_type === "products"
                  ? "Selected products"
                  : requirement.scope_type === "all"
                    ? "All store products"
                    : "Cart total"),
          })),
        },
        id,
      );
      const savedDraft = giftCampaignDraft(saved);
      setDraft(savedDraft);
      setSavedSignature(giftCampaignSignature(savedDraft));
      setShowErrors(false);
      setValidatePublishing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gift offer could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (
      !draft?.id ||
      !window.confirm(
        `Archive ${draft.name}? It will stop immediately and remain attached to previous orders.`,
      )
    )
      return;
    try {
      if (await onDelete(draft.id)) {
        setDraft(null);
        setSavedSignature("");
        setProductQuery("");
        setShowErrors(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gift offer could not be archived.");
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#DDE2E8] bg-white lg:grid lg:min-h-[680px] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-[#DDE2E8] bg-[#F8FAFC] lg:border-b-0 lg:border-r">
        <div className="border-b border-[#DDE2E8] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">Free gifts</h2>
              <p className="mt-1 text-xs text-[#667085]">
                {liveCount} live · {currentCampaigns.length} total
              </p>
            </div>
            <button
              type="button"
              aria-label="Create free gift offer"
              title="Create free gift offer"
              onClick={createCampaign}
              className="grid h-9 w-9 place-items-center rounded-md bg-[#111827] text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 rounded-md border border-[#DCE3EA] bg-white px-3 py-2 text-xs leading-5 text-[#596579]">
            Gifts are added to qualifying orders automatically. No code is needed.
          </p>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2 lg:max-h-[calc(100vh-260px)]">
          {currentCampaigns.map((campaign) => {
            const status = giftCampaignStatus(campaign);
            const giftName = activeProducts.find(
              (product) => product.id === campaign.gift_product_id,
            )?.name;
            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => openDraft(giftCampaignDraft(campaign))}
                className={cn(
                  "mb-1 w-full rounded-md px-3 py-3 text-left transition",
                  draft?.id === campaign.id
                    ? "bg-white shadow-sm ring-1 ring-[#DDE2E8]"
                    : "hover:bg-white",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#182230]">
                    {campaign.name}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#98A2B3]" />
                </span>
                <span
                  className={cn(
                    "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                    statusStyle(status),
                  )}
                >
                  {status}
                </span>
                <span className="mt-2 line-clamp-2 block text-[11px] leading-4 text-[#667085]">
                  {giftCampaignSummary(giftCampaignDraft(campaign), giftName)}
                </span>
              </button>
            );
          })}

          {!currentCampaigns.length ? (
            <div className="px-4 py-10 text-center">
              <Gift className="mx-auto h-6 w-6 text-[#C94D2B]" />
              <p className="mt-3 text-sm font-medium text-[#344054]">No gift offers yet</p>
              <p className="mt-1 text-xs leading-5 text-[#667085]">
                Create one when you are ready to reward a purchase.
              </p>
            </div>
          ) : null}

          {archivedCampaigns.length ? (
            <details className="group mt-3 border-t border-[#DDE2E8] pt-2">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-[#667085] hover:bg-white">
                Archived ({archivedCampaigns.length})
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              {archivedCampaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => openDraft(giftCampaignDraft(campaign))}
                  className="mt-1 w-full truncate rounded-md px-3 py-2 text-left text-xs text-[#667085] hover:bg-white"
                >
                  {campaign.name}
                </button>
              ))}
            </details>
          ) : null}
        </div>
      </aside>

      {draft ? (
        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE2E8] bg-white/95 px-5 py-4 backdrop-blur md:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase text-[#667085]">
                  {draft.id ? "Gift offer" : "New gift offer"}
                </span>
                {isDirty ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                    Unsaved
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1 truncate text-lg font-semibold text-[#111827]">
                {draft.name || "Untitled offer"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {draft.archived_at ? (
                <button
                  type="button"
                  onClick={() => {
                    const nextSortOrder =
                      Math.max(0, ...campaigns.map((campaign) => campaign.sort_order)) + 1;
                    const duplicate = {
                      ...draft,
                      id: undefined,
                      archived_at: null,
                      active: false,
                      name: `Copy of ${draft.name}`,
                      sort_order: nextSortOrder,
                      priority: Math.max(1, 100 - nextSortOrder),
                    };
                    setDraft(duplicate);
                    setSavedSignature("");
                    setShowErrors(false);
                  }}
                  className={secondaryButton}
                >
                  <Copy className="h-4 w-4" /> Duplicate
                </button>
              ) : null}
              {draft.id && !draft.archived_at ? (
                <button
                  type="button"
                  aria-label="Archive gift offer"
                  title="Archive gift offer"
                  disabled={saving}
                  onClick={() => void archive()}
                  className="grid h-10 w-10 place-items-center rounded-md border border-[#CBD1D8] text-[#B42318] transition hover:bg-red-50"
                >
                  <Archive className="h-4 w-4" />
                </button>
              ) : null}
              {!draft.archived_at ? (
                <GiftPublishActions
                  active={draft.active}
                  saving={saving}
                  dirty={isDirty}
                  onAction={submit}
                />
              ) : null}
            </div>
          </header>

          <fieldset disabled={Boolean(draft.archived_at) || saving} className="disabled:opacity-70">
            {draft.archived_at ? (
              <div className="m-5 flex items-start gap-3 rounded-md border border-[#DDE2E8] bg-[#F8FAFC] px-4 py-3 text-sm text-[#596579] md:m-6">
                <Archive className="mt-0.5 h-4 w-4 shrink-0" />
                This offer is archived. Its settings remain visible because previous orders may
                reference it.
              </div>
            ) : null}

            <section className="px-5 py-6 md:px-6 md:py-7">
              <StepHeading
                number={1}
                title="Choose the qualifying purchase"
                description="Describe what a customer needs to buy. The offer name is only visible in the dashboard."
              />

              <label className="mt-5 block max-w-xl">
                <span className={labelClass}>Offer name</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Example: Buy two attars, get a free sample"
                  className={inputClass}
                />
                <span className="mt-1.5 block text-[11px] text-[#667085]">
                  Use a name you will recognize later. Customers do not see this.
                </span>
              </label>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase text-[#667085]">
                  Customers qualify when they
                </p>
                <div className="mt-3 space-y-3">
                  {draft.requirements.map((requirement, index) => (
                    <div
                      key={index}
                      className="rounded-md border border-[#DDE2E8] bg-[#F8FAFC] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-[#344054]">
                          {draft.requirements.length > 1 ? `Condition ${index + 1}` : "Purchase"}
                        </p>
                        <button
                          type="button"
                          aria-label={`Remove condition ${index + 1}`}
                          title="Remove condition"
                          disabled={draft.requirements.length === 1}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              requirements: draft.requirements.filter(
                                (_, requirementIndex) => requirementIndex !== index,
                              ),
                            })
                          }
                          className="grid h-8 w-8 place-items-center rounded-md text-[#667085] transition hover:bg-white hover:text-[#B42318] disabled:pointer-events-none disabled:opacity-25"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-[190px_120px_minmax(0,1fr)]">
                        <label>
                          <span className={labelClass}>Type of purchase</span>
                          <GiftSelect
                            value={requirement.scope_type}
                            onChange={(event) =>
                              updateRequirement(index, {
                                scope_type: event.target.value as
                                  "all" | "collection" | "products" | "subtotal",
                                collection_slugs: [],
                                category_ids: [],
                                product_ids: [],
                                label: "",
                              })
                            }
                            className={inputClass}
                          >
                            <option value="all">Any attars (all products)</option>
                            <option value="collection">From a category</option>
                            <option value="products">Specific products</option>
                            <option value="subtotal">Minimum cart total</option>
                          </GiftSelect>
                        </label>

                        <label>
                          <span className={labelClass}>
                            {requirement.scope_type === "subtotal" ? "Amount (INR)" : "Quantity"}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={requirement.scope_type === "subtotal" ? 10000000 : 99}
                            value={requirement.required_quantity || ""}
                            onChange={(event) =>
                              updateRequirement(index, {
                                required_quantity: Number(event.target.value),
                              })
                            }
                            className={inputClass}
                          />
                        </label>

                        {requirement.scope_type === "collection" ? (
                          <label>
                            <span className={labelClass}>Category</span>
                            <GiftSelect
                              value={requirement.collection_slugs[0] ?? ""}
                              onChange={(event) => {
                                const category = categorys.find(
                                  (item) => item.value === event.target.value,
                                );
                                updateRequirement(index, {
                                  collection_slugs: category ? [category.value] : [],
                                  category_ids: category ? [category.id] : [],
                                  label: category?.label ?? "",
                                });
                              }}
                              className={inputClass}
                            >
                              <option value="">Choose a category</option>
                              {categorys.map((category) => (
                                <option key={category.value} value={category.value}>
                                  {category.label}
                                </option>
                              ))}
                            </GiftSelect>
                          </label>
                        ) : requirement.scope_type === "products" ? (
                          <div>
                            <span className={labelClass}>Products</span>
                            <details className="group/product relative">
                              <summary
                                className={cn(
                                  inputClass,
                                  "flex cursor-pointer list-none items-center justify-between",
                                )}
                              >
                                <span className="truncate">
                                  {requirement.product_ids.length
                                    ? `${requirement.product_ids.length} selected`
                                    : "Choose products"}
                                </span>
                                <ChevronDown className="h-4 w-4 shrink-0 text-[#667085] transition-transform group-open/product:rotate-180" />
                              </summary>
                              <div className="absolute right-0 z-30 mt-1 w-full min-w-[280px] rounded-md border border-[#CBD1D8] bg-white p-2 shadow-xl">
                                <label className="flex h-10 items-center gap-2 border-b border-[#E5E7EB] px-2">
                                  <Search className="h-4 w-4 text-[#98A2B3]" />
                                  <input
                                    value={productQuery}
                                    onChange={(event) => setProductQuery(event.target.value)}
                                    placeholder="Search products"
                                    className="min-w-0 flex-1 text-sm outline-none"
                                  />
                                </label>
                                <div className="max-h-56 overflow-y-auto py-1">
                                  {visibleProducts.map((product) => {
                                    const selected = requirement.product_ids.includes(product.id);
                                    return (
                                      <label
                                        key={product.id}
                                        className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-[#F3F4F6]"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selected}
                                          onChange={() =>
                                            updateRequirement(index, {
                                              product_ids: selected
                                                ? requirement.product_ids.filter(
                                                    (id) => id !== product.id,
                                                  )
                                                : [...requirement.product_ids, product.id],
                                              label: "Selected products",
                                            })
                                          }
                                        />
                                        {product.cover_image_url ? (
                                          <img
                                            src={product.cover_image_url}
                                            alt=""
                                            className="h-8 w-8 rounded object-cover"
                                          />
                                        ) : null}
                                        <span className="min-w-0 flex-1 truncate">
                                          {product.name}
                                        </span>
                                      </label>
                                    );
                                  })}
                                  {!visibleProducts.length ? (
                                    <p className="px-2 py-4 text-center text-xs text-[#667085]">
                                      No products found.
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </details>
                          </div>
                        ) : (
                          <div className="flex h-11 items-center self-end rounded-md border border-[#DDE2E8] bg-white px-3 text-xs leading-5 text-[#667085]">
                            {requirement.scope_type === "all"
                              ? "Mix any products together. Quantities are added up; gifts do not count."
                              : "Calculated from the verified cart total before shipping."}
                          </div>
                        )}
                      </div>

                      {requirement.scope_type === "products" && requirement.product_ids.length ? (
                        <p className="mt-3 text-xs leading-5 text-[#667085]">
                          {requirement.product_ids
                            .map((id) => activeProducts.find((product) => product.id === id)?.name)
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {draft.requirements.length > 1 ? (
                  <div className="mt-4 rounded-md border border-[#DDE2E8] p-4">
                    <p className="text-sm font-semibold text-[#344054]">
                      How should multiple conditions work?
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(["all", "any"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setDraft({ ...draft, match_mode: mode })}
                          className={cn(
                            "rounded-md border p-3 text-left transition",
                            draft.match_mode === mode
                              ? "border-[#111827] bg-[#F8FAFC] ring-1 ring-[#111827]"
                              : "border-[#DDE2E8] hover:border-[#98A2B3]",
                          )}
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                            <span
                              className={cn(
                                "grid h-4 w-4 place-items-center rounded-full border",
                                draft.match_mode === mode
                                  ? "border-[#111827] bg-[#111827] text-white"
                                  : "border-[#98A2B3]",
                              )}
                            >
                              {draft.match_mode === mode ? <Check className="h-3 w-3" /> : null}
                            </span>
                            {mode === "all" ? "Complete every condition" : "Complete any one"}
                          </span>
                          <span className="mt-1.5 block pl-6 text-xs leading-5 text-[#667085]">
                            {mode === "all"
                              ? "Use this for offers such as: buy one oud attar and one floral attar."
                              : "Use this when any listed purchase should unlock the same gift."}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={draft.requirements.length >= 6}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      requirements: [...draft.requirements, blankGiftRequirement()],
                    })
                  }
                  className={cn(secondaryButton, "mt-4")}
                >
                  <Plus className="h-4 w-4" /> Add another condition
                </button>
              </div>
            </section>

            <section className="border-t border-[#DDE2E8] px-5 py-6 md:px-6 md:py-7">
              <StepHeading
                number={2}
                title="Choose the free gift"
                description="The selected product must have stock. Its price is recorded as zero on the order."
              />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className={labelClass}>Who chooses the free items?</span>
                  <GiftSelect
                    value={draft.reward_mode ?? "fixed"}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        reward_mode: event.target.value as "fixed" | "choice",
                        gift_color: null,
                        gift_size: null,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="fixed">Give a fixed product automatically</option>
                    <option value="choice">Customer chooses their free items</option>
                  </GiftSelect>
                </label>
                {draft.reward_mode === "choice" ? (
                  <label>
                    <span className={labelClass}>Customer can choose from</span>
                    <GiftSelect
                      value={draft.reward_scope ?? "all"}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          reward_scope: event.target.value as "all" | "products",
                        })
                      }
                      className={inputClass}
                    >
                      <option value="all">Any attars (all products)</option>
                      <option value="products">Selected products only</option>
                    </GiftSelect>
                  </label>
                ) : (
                  <label>
                    <span className={labelClass}>Gift product</span>
                    <GiftSelect
                      value={draft.gift_product_id ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          gift_product_id: event.target.value,
                          gift_color: null,
                          gift_size: null,
                        })
                      }
                      className={inputClass}
                    >
                      <option value="">Choose a product</option>
                      {activeProducts
                        .filter((p) => !p.bundle_kind || p.bundle_kind === "single")
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} · {product.stock_quantity ?? 0} in stock
                          </option>
                        ))}
                    </GiftSelect>
                  </label>
                )}
                <label>
                  <span className={labelClass}>How many to give</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={draft.gift_quantity || ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        gift_quantity: Number(event.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </label>
              </div>

              {draft.reward_mode === "choice" && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm leading-6 text-[#475467]">
                    Customers choose these extra items in their bag or at checkout. They can mix
                    fragrances or choose the same one twice, subject to stock. Gifts do not count
                    towards the qualifying purchase. “All products” includes new products added
                    later.
                  </p>
                  {draft.reward_scope === "products" && (
                    <>
                      <input
                        className={inputClass}
                        aria-label="Search reward products"
                        placeholder="Search reward products…"
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                      />
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-[#CBD1D8] p-3">
                        {visibleProducts
                          .filter((p) => !p.bundle_kind || p.bundle_kind === "single")
                          .map((product) => (
                            <label
                              key={product.id}
                              className="flex items-center gap-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={(draft.reward_product_ids ?? []).includes(product.id)}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    reward_product_ids: e.target.checked
                                      ? [...(draft.reward_product_ids ?? []), product.id]
                                      : (draft.reward_product_ids ?? []).filter(
                                          (id) => id !== product.id,
                                        ),
                                  })
                                }
                              />
                              <span>
                                {product.name} · {product.stock_quantity ?? 0} in stock
                              </span>
                            </label>
                          ))}
                      </div>
                      <p className="text-xs">
                        {draft.reward_product_ids?.length ?? 0} reward products selected
                      </p>
                    </>
                  )}
                </div>
              )}
              {reward && draft.reward_mode !== "choice" ? (
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-md border border-[#DDE2E8] bg-[#F8FAFC] p-4">
                  {reward.cover_image_url ? (
                    <img
                      src={reward.cover_image_url}
                      alt=""
                      className="h-16 w-16 rounded-md bg-white object-cover"
                    />
                  ) : (
                    <span className="grid h-16 w-16 place-items-center rounded-md bg-white text-[#98A2B3]">
                      <Gift className="h-6 w-6" />
                    </span>
                  )}
                  <div className="min-w-[160px] flex-1">
                    <p className="text-sm font-semibold text-[#111827]">{reward.name}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-medium",
                        Number(reward.stock_quantity ?? 0) >= draft.gift_quantity
                          ? "text-emerald-700"
                          : "text-[#B42318]",
                      )}
                    >
                      {reward.stock_quantity ?? 0} available
                    </p>
                  </div>
                  {productOptions(reward, "color").length ? (
                    <label className="min-w-[150px]">
                      <span className={labelClass}>Gift colour</span>
                      <GiftSelect
                        value={draft.gift_color ?? ""}
                        onChange={(event) =>
                          setDraft({ ...draft, gift_color: event.target.value || null })
                        }
                        className={inputClass}
                      >
                        <option value="">First available</option>
                        {productOptions(reward, "color").map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </GiftSelect>
                    </label>
                  ) : null}
                  {productOptions(reward, "size").length ? (
                    <label className="min-w-[150px]">
                      <span className={labelClass}>Gift size</span>
                      <GiftSelect
                        value={draft.gift_size ?? ""}
                        onChange={(event) =>
                          setDraft({ ...draft, gift_size: event.target.value || null })
                        }
                        className={inputClass}
                      >
                        <option value="">First available</option>
                        {productOptions(reward, "size").map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </GiftSelect>
                    </label>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="border-t border-[#DDE2E8] px-5 py-6 md:px-6 md:py-7">
              <StepHeading
                number={3}
                title="Choose when the offer runs"
                description="Optional: set a start or end time. Publish offer saves and enables it. Times use the timezone on this device."
              />

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Start date and time</span>
                  <input
                    type="datetime-local"
                    value={toLocalDateTime(draft.starts_at)}
                    onChange={(event) =>
                      setDraft({ ...draft, starts_at: toIsoDateTime(event.target.value) })
                    }
                    className={inputClass}
                  />
                  <span className="mt-1.5 block text-[11px] text-[#667085]">
                    Leave empty to start when you click Publish offer.
                  </span>
                </label>
                <label>
                  <span className={labelClass}>End date and time</span>
                  <input
                    type="datetime-local"
                    value={toLocalDateTime(draft.ends_at)}
                    onChange={(event) =>
                      setDraft({ ...draft, ends_at: toIsoDateTime(event.target.value) })
                    }
                    className={inputClass}
                  />
                  <span className="mt-1.5 block text-[11px] text-[#667085]">
                    Leave empty to run until you click Unpublish.
                  </span>
                </label>
              </div>

              <details className="group mt-5 rounded-md border border-[#DDE2E8]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#111827]">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#344054]">
                    <CircleHelp className="h-4 w-4 text-[#667085]" /> Optional controls
                  </span>
                  <ChevronDown className="h-4 w-4 text-[#667085] transition-transform group-open:rotate-180" />
                </summary>
                <div className="divide-y divide-[#E5E7EB] border-t border-[#DDE2E8] px-4">
                  <ToggleRow
                    checked={draft.repeatable}
                    onChange={(repeatable) =>
                      setDraft({
                        ...draft,
                        repeatable,
                        max_awards_per_order: repeatable
                          ? Math.max(1, draft.max_awards_per_order)
                          : 1,
                      })
                    }
                    title="Let the offer repeat in one order"
                    description="Example: buying 8 items can earn two gifts when the requirement is 4."
                  />
                  {draft.repeatable ? (
                    <label className="block py-3">
                      <span className={labelClass}>
                        Maximum times this offer can repeat per order
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={draft.max_awards_per_order || ""}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            max_awards_per_order: Number(event.target.value),
                          })
                        }
                        className={cn(inputClass, "max-w-[160px]")}
                      />
                    </label>
                  ) : null}
                  <ToggleRow
                    checked={draft.combines_with_other_gifts}
                    onChange={(combines_with_other_gifts) =>
                      setDraft({ ...draft, combines_with_other_gifts })
                    }
                    title="Allow another gift offer on the same order"
                    description="Usually leave this off. Turn it on only when customers may receive multiple different offers together."
                  />
                </div>
              </details>
            </section>

            <section
              id="gift-offer-review"
              className="border-t border-[#DDE2E8] px-5 py-6 md:px-6 md:py-7"
            >
              <StepHeading
                number={4}
                title="Review and save"
                description="This is the offer the store will calculate automatically in the cart and at checkout."
              />

              <div className="mt-5 rounded-md bg-[#111827] p-5 text-white">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-white/60">
                  <PackageCheck className="h-4 w-4" /> Customer offer
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6">
                  {giftCampaignSummary(draft, reward?.name)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-white/10 px-2.5 py-1">
                    {giftCampaignStatus(draft)}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">
                    {draft.starts_at
                      ? "Scheduled start"
                      : draft.active
                        ? "Starts immediately"
                        : "Starts when published"}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">
                    {draft.ends_at ? "Scheduled end" : "No end date"}
                  </span>
                </div>
              </div>

              {showErrors && readiness.errors.length ? (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4" role="alert">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#B42318]">
                    <AlertCircle className="h-4 w-4" /> Complete these items
                  </p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-[#912018]">
                    {readiness.errors.map((error) => (
                      <li key={error}>· {error}</li>
                    ))}
                  </ul>
                </div>
              ) : readiness.errors.length ? (
                <p className="mt-4 flex items-center gap-2 text-xs font-medium text-[#B54708]">
                  <AlertCircle className="h-4 w-4" /> {readiness.errors.length} setup item
                  {readiness.errors.length === 1 ? "" : "s"} still to complete
                </p>
              ) : (
                <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Check className="h-4 w-4" /> Everything required is complete
                </p>
              )}

              {readiness.warnings.map((warning) => (
                <p
                  key={warning}
                  className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {warning}
                </p>
              ))}

              {otherLiveCampaigns ? (
                <p className="mt-3 flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
                  <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
                  {otherLiveCampaigns} other gift offer{otherLiveCampaigns === 1 ? " is" : "s are"}
                  live. If the same order qualifies for both, the store safely applies the first
                  eligible offer unless combining is enabled.
                </p>
              ) : null}

              {!draft.archived_at ? (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <GiftPublishActions
                    active={draft.active}
                    saving={saving}
                    dirty={isDirty}
                    onAction={submit}
                  />
                  <p className="text-xs leading-5 text-[#667085]">
                    {draft.active
                      ? "Save changes updates the published offer. Unpublish stops it and keeps it as a draft."
                      : "Save draft keeps it private. Publish offer saves and enables it for customers, starting at the scheduled time if set."}
                  </p>
                </div>
              ) : null}
            </section>
          </fieldset>
        </div>
      ) : (
        <div className="grid min-h-[520px] place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FFF1EA] text-[#C94D2B]">
              <Gift className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-[#111827]">Create a free gift offer</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#667085]">
              Choose what customers buy, the gift they receive, and when the offer runs. The store
              handles everything else automatically.
            </p>
            <button
              type="button"
              onClick={createCampaign}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Create gift offer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
