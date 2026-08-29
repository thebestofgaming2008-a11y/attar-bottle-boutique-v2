import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { PackageSearch } from "lucide-react";
import { StoreShell, SiteFooter } from "@/components/store/StoreShell";
import { trackOrder } from "@/services/orderService";
import { submitOrderReview } from "@/services/reviewService";
import { inr } from "@/lib/products";
import { SearchSelect } from "@/components/ui/search-select";

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((rating) => ({
  value: String(rating),
  label: `${rating} star${rating === 1 ? "" : "s"}`,
}));

type TrackedOrder = {
  id: string;
  order_number: string;
  status?: string | null;
  payment_status?: string | null;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  total: number;
  items?: Array<{
    id: string;
    product_id?: string | null;
    product_name?: string | null;
    product_image_url?: string | null;
    quantity: number;
    subtotal: number;
  }>;
};

export const Route = createFileRoute("/track-order")({
  validateSearch: (search: Record<string, unknown>) => ({
    order: search["order"] ? String(search["order"]) : undefined,
    email: search["email"] ? String(search["email"]) : undefined,
  }),
  head: () => ({ meta: [{ title: "Track order — BADR" }, { name: "robots", content: "noindex" }] }),
  component: TrackOrderPage,
});

function TrackOrderPage() {
  const search = Route.useSearch();
  const [form, setForm] = useState({ order: search.order || "", email: search.email || "" });
  const [result, setResult] = useState<TrackedOrder | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [reviewDraft, setReviewDraft] = useState<{
    productId: string;
    itemName: string;
    rating: string;
    body: string;
  } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const order = (await trackOrder(form.order, form.email)) as TrackedOrder | null;
    setResult(order);
    if (!order) setMessage("No matching order was found. Check the order number and email.");
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewDraft || !result) return;
    setMessage(null);
    try {
      await submitOrderReview({
        orderNumber: result.order_number,
        email: form.email,
        productId: reviewDraft.productId,
        rating: Number(reviewDraft.rating),
        body: reviewDraft.body.trim(),
      });
      setReviewed((items) => new Set(items).add(reviewDraft.productId));
      setReviewDraft(null);
      setMessage("Thank you. Your verified review was sent for approval.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review could not be submitted.");
    }
  }
  return (
    <StoreShell>
      <main className="min-h-screen bg-[#f5f2ec] px-4 pb-24 pt-32 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <PackageSearch className="h-8 w-8" />
          <p className="eyebrow mt-6">Delivery status</p>
          <h1 className="mt-4 font-display text-6xl">Track your order.</h1>
          <form
            onSubmit={submit}
            className="mt-8 grid gap-3 bg-background p-5 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              required
              value={form.order}
              onChange={(event) => setForm((value) => ({ ...value, order: event.target.value }))}
              placeholder="Order number, e.g. #12"
              className="h-12 border border-foreground/20 px-3 text-sm outline-none"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
              placeholder="Checkout email"
              className="h-12 border border-foreground/20 px-3 text-sm outline-none"
            />
            <button className="bg-foreground px-5 text-xs font-semibold uppercase tracking-[0.14em] text-background">
              Track
            </button>
          </form>
          {message ? (
            <p className="mt-5 border border-red-300 bg-red-50 p-4 text-sm text-red-800">
              {message}
            </p>
          ) : null}
          {result ? (
            <section className="mt-6 bg-background p-5 sm:p-8">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    {result.order_number}
                  </p>
                  <h2 className="mt-2 font-display text-4xl capitalize">
                    {result.status || "Processing"}
                  </h2>
                </div>
                <p className="font-display text-2xl">{inr(result.total)}</p>
              </div>
              {result.tracking_number ? (
                <div className="mt-5 border border-foreground/15 p-4 text-sm">
                  {result.tracking_carrier || "Carrier"}: <strong>{result.tracking_number}</strong>
                  {result.tracking_url ? (
                    <a
                      href={result.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-3 underline"
                    >
                      Open tracking
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">
                  Tracking will appear here after dispatch.
                </p>
              )}
              <ul className="mt-6 grid gap-3">
                {(result.items || []).map((item) => (
                  <li
                    key={item.id}
                    className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3 border-t border-foreground/10 pt-4"
                  >
                    <img
                      src={item.product_image_url || ""}
                      alt=""
                      className="h-12 w-12 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="text-sm">
                      {item.product_name}
                      <small className="block text-muted-foreground">Qty {item.quantity}</small>
                      {result.payment_status === "paid" && item.product_id ? (
                        <button
                          disabled={reviewed.has(item.product_id)}
                          onClick={() =>
                            setReviewDraft({
                              productId: item.product_id!,
                              itemName: item.product_name || "Product",
                              rating: "5",
                              body: "",
                            })
                          }
                          className="mt-2 text-xs underline disabled:opacity-50"
                        >
                          {reviewed.has(item.product_id)
                            ? "Review submitted"
                            : "Write verified review"}
                        </button>
                      ) : null}
                    </div>
                    <span className="text-sm">{inr(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              {reviewDraft ? (
                <form onSubmit={review} className="mt-6 bg-[#f5f2ec] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Verified purchase review</p>
                      <h3 className="mt-1 font-medium">{reviewDraft.itemName}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewDraft(null)}
                      className="text-xs underline"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <SearchSelect
                      label="Rating"
                      value={reviewDraft.rating}
                      options={RATING_OPTIONS}
                      searchPlaceholder="Choose a rating…"
                      onValueChange={(rating) =>
                        setReviewDraft((draft) => (draft ? { ...draft, rating } : null))
                      }
                    />
                    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.13em]">
                      Your review
                      <textarea
                        required
                        minLength={8}
                        maxLength={1600}
                        rows={4}
                        value={reviewDraft.body}
                        onChange={(event) =>
                          setReviewDraft((draft) =>
                            draft ? { ...draft, body: event.target.value } : null,
                          )
                        }
                        className="min-h-28 resize-y border border-foreground/20 bg-background p-3 text-sm font-normal normal-case leading-6 tracking-normal outline-none focus:border-foreground"
                      />
                    </label>
                  </div>
                  <button className="mt-3 bg-foreground px-5 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-background">
                    Submit review
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}
