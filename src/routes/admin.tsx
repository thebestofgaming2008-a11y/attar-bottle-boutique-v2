import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState, type ClipboardEvent, type DragEvent, type FormEvent } from "react";
import {
  ImagePlus,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Package,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { StoreShell } from "@/components/store/StoreShell";
import { useAuth } from "@/contexts/AuthContext";
import { uploadProductImage } from "@/services/adminService";
import { clearProductListCache } from "@/services/productService";
import { inr } from "@/lib/products";

type Tab = "products" | "orders" | "reviews" | "customers" | "health";
type ProductForm = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  sale: string;
  stock: string;
  sku: string;
  badge: string;
  collection: string;
  active: boolean;
  cover: string;
  images: string[];
};

const emptyProduct: ProductForm = {
  id: "",
  name: "",
  slug: "",
  description: "",
  price: "",
  sale: "",
  stock: "0",
  sku: "",
  badge: "",
  collection: "oud",
  active: true,
  cover: "",
  images: [],
};

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "BADR admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>("products");
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const products = useQuery(api.products.listAllProducts, auth.isAdmin ? {} : "skip");
  const orders = useQuery(api.orders.listAll, auth.isAdmin ? { limit: 100 } : "skip");
  const reviews = useQuery(api.reviews.listAll, auth.isAdmin ? { limit: 200 } : "skip");
  const customers = useQuery(api.users.listCustomers, auth.isAdmin ? { limit: 200 } : "skip");
  const readiness = useQuery(api.admin.launchReadiness, auth.isAdmin ? {} : "skip");
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const updateStatus = useMutation(api.orders.updateStatus);
  const closeOrder = useMutation(api.orders.closeOrder);
  const refundOrder = useAction(api.orders.refundOrder);
  const updateTracking = useMutation(api.orders.updateTracking);
  const updateReview = useMutation(api.reviews.updateStatus);
  const removeReview = useMutation(api.reviews.remove);

  if (auth.loading)
    return (
      <StoreShell>
        <main className="grid min-h-screen place-items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </main>
      </StoreShell>
    );
  if (!auth.user)
    return (
      <StoreShell>
        <main className="grid min-h-screen place-items-center bg-[#f5f2ec] px-5">
          <div className="bg-background p-8 text-center">
            <h1 className="font-display text-5xl">Admin sign-in required.</h1>
            <Link
              to="/account"
              className="mt-6 inline-block bg-foreground px-5 py-3 text-xs uppercase tracking-[0.14em] text-background"
            >
              Open account
            </Link>
          </div>
        </main>
      </StoreShell>
    );
  if (!auth.isAdmin)
    return (
      <StoreShell>
        <main className="grid min-h-screen place-items-center bg-[#f5f2ec] px-5">
          <div className="bg-background p-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8" />
            <h1 className="mt-4 font-display text-5xl">Admin access required.</h1>
          </div>
        </main>
      </StoreShell>
    );

  const editProduct = (product: NonNullable<typeof products>[number]) =>
    setForm({
      id: product.id,
      name: product.name,
      slug: product.slug || "",
      description: product.description || product.short_description || "",
      price: String(product.price_inr),
      sale: product.sale_price_inr == null ? "" : String(product.sale_price_inr),
      stock: String(product.stock_quantity ?? 0),
      sku: product.sku || "",
      badge: product.badge || "",
      collection: product.category_id || "oud",
      active: product.is_active !== false,
      cover: product.cover_image_url || "",
      images: product.images || [],
    });

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || null,
        short_description: form.description.slice(0, 280),
        description: form.description,
        price_inr: Number(form.price),
        sale_price_inr: form.sale ? Number(form.sale) : null,
        sku: form.sku || null,
        stock_quantity: Number(form.stock),
        category: "attars",
        category_id: form.collection,
        tags: [form.collection, "Unisex"],
        cover_image_url: form.cover || null,
        images: form.images,
        size_options: ["6 ml roll-on"],
        option_types: [{ name: "Size", values: ["6 ml roll-on"] }],
        badge: form.badge || null,
        is_active: form.active,
        is_featured: true,
        show_in_category_section: true,
        is_on_sale: Boolean(form.sale),
      };
      if (form.id) await updateProduct({ id: form.id, patch: payload });
      else await createProduct(payload);
      clearProductListCache();
      setForm(emptyProduct);
      setMessage("Product saved. The live shop will refresh with the Convex update.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save product.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setMessage(null);
    try {
      const urls = (await Promise.all(files.map((file) => uploadProductImage(file)))).filter(
        Boolean,
      ) as string[];
      setForm((current) => ({
        ...current,
        cover: current.cover || urls[0] || "",
        images: Array.from(new Set([...current.images, ...urls])).slice(0, 8),
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function onPaste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData.files);
    if (files.length) {
      event.preventDefault();
      void uploadFiles(files);
    }
  }
  function onDrop(event: DragEvent) {
    event.preventDefault();
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <StoreShell>
      <main className="min-h-screen bg-[#eeeae2] pb-24 pt-28">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Store operations</p>
              <h1 className="mt-3 font-display text-5xl sm:text-7xl">BADR admin.</h1>
            </div>
            <Link
              to="/shop"
              className="border border-foreground bg-background px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              View shop
            </Link>
          </div>
          <nav className="no-scrollbar -mx-3 mt-7 flex gap-2 overflow-x-auto px-3 pb-2">
            {(
              [
                ["products", Package],
                ["orders", LayoutDashboard],
                ["reviews", Star],
                ["customers", Users],
                ["health", ShieldCheck],
              ] as const
            ).map(([value, Icon]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`flex shrink-0 items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] ${tab === value ? "bg-foreground text-background" : "bg-background"}`}
              >
                <Icon className="h-4 w-4" />
                {value}
              </button>
            ))}
          </nav>
          {message ? (
            <p className="mt-4 border border-foreground/20 bg-background p-4 text-sm">{message}</p>
          ) : null}
          {tab === "products" ? (
            <section className="mt-5 grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
              <form
                onSubmit={saveProduct}
                onPaste={onPaste}
                onDrop={onDrop}
                onDragOver={(event) => event.preventDefault()}
                className="bg-background p-4 sm:p-6 lg:sticky lg:top-24 lg:self-start"
              >
                <h2 className="font-display text-3xl">
                  {form.id ? "Edit product" : "New product"}
                </h2>
                <div className="mt-5 grid gap-3">
                  <AdminInput
                    label="Name"
                    value={form.name}
                    onChange={(name) => setForm((item) => ({ ...item, name }))}
                  />
                  <AdminInput
                    label="Slug (optional)"
                    required={false}
                    value={form.slug}
                    onChange={(slug) => setForm((item) => ({ ...item, slug }))}
                  />
                  <label className="grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                    Description
                    <textarea
                      required
                      value={form.description}
                      onChange={(event) =>
                        setForm((item) => ({ ...item, description: event.target.value }))
                      }
                      rows={5}
                      className="border border-foreground/20 p-3 text-sm font-normal normal-case tracking-normal outline-none"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <AdminInput
                      label="Regular price ₹"
                      type="number"
                      value={form.price}
                      onChange={(price) => setForm((item) => ({ ...item, price }))}
                    />
                    <AdminInput
                      label="Sale price ₹"
                      type="number"
                      required={false}
                      value={form.sale}
                      onChange={(sale) => setForm((item) => ({ ...item, sale }))}
                    />
                    <AdminInput
                      label="Stock"
                      type="number"
                      value={form.stock}
                      onChange={(stock) => setForm((item) => ({ ...item, stock }))}
                    />
                    <AdminInput
                      label="SKU"
                      required={false}
                      value={form.sku}
                      onChange={(sku) => setForm((item) => ({ ...item, sku }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <AdminInput
                      label="Badge"
                      required={false}
                      value={form.badge}
                      onChange={(badge) => setForm((item) => ({ ...item, badge }))}
                    />
                    <label className="grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                      Collection
                      <select
                        value={form.collection}
                        onChange={(event) =>
                          setForm((item) => ({ ...item, collection: event.target.value }))
                        }
                        className="h-11 border border-foreground/20 bg-transparent px-3 text-sm font-normal normal-case tracking-normal"
                      >
                        <option value="oud">Oud</option>
                        <option value="fresh">Fresh</option>
                        <option value="fruity">Fruity</option>
                        <option value="gourmand">Gourmand</option>
                      </select>
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) =>
                        setForm((item) => ({ ...item, active: event.target.checked }))
                      }
                    />{" "}
                    Active on storefront
                  </label>
                  <label className="grid cursor-pointer place-items-center border border-dashed border-foreground/35 p-6 text-center">
                    <ImagePlus className="h-6 w-6" />
                    <span className="mt-2 text-xs">Paste, drag/drop, or select product media</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/mp4,video/webm"
                      className="sr-only"
                      onChange={(event) => void uploadFiles(Array.from(event.target.files || []))}
                    />
                  </label>
                  {form.images.length ? (
                    <div className="grid grid-cols-4 gap-2">
                      {form.images.map((url) => (
                        <button
                          type="button"
                          key={url}
                          onClick={() => setForm((item) => ({ ...item, cover: url }))}
                          className={`aspect-square border p-1 ${form.cover === url ? "border-foreground border-2" : "border-foreground/15"}`}
                        >
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <button
                    disabled={busy}
                    className="flex items-center justify-center gap-2 bg-foreground py-4 text-xs font-semibold uppercase tracking-[0.16em] text-background disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}{" "}
                    Save product
                  </button>
                  {form.id ? (
                    <button
                      type="button"
                      onClick={() => setForm(emptyProduct)}
                      className="border border-foreground py-3 text-xs uppercase"
                    >
                      Cancel editing
                    </button>
                  ) : null}
                </div>
              </form>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(products || []).map((product) => (
                  <article key={product.id} className="flex flex-col bg-background p-4">
                    <img
                      src={product.cover_image_url || ""}
                      alt=""
                      className="aspect-square w-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                    <h3 className="mt-3 font-display text-2xl">{product.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Stock {product.stock_quantity ?? 0} ·{" "}
                      {product.is_active ? "Active" : "Hidden"}
                    </p>
                    <p className="mt-2 text-sm">
                      {inr(product.sale_price_inr ?? product.price_inr)}
                    </p>
                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                      <button
                        onClick={() => editProduct(product)}
                        className="border border-foreground py-2 text-xs uppercase"
                      >
                        Edit
                      </button>
                      <button
                        aria-label={`Delete ${product.name}`}
                        onClick={() => {
                          if (window.confirm(`Delete ${product.name}?`))
                            void deleteProduct({ id: product.id });
                        }}
                        className="border border-red-300 px-3 text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {tab === "orders" ? (
            <section className="mt-5 grid gap-4">
              {(orders || []).map((order) => (
                <OrderAdminCard
                  key={order.id}
                  order={order}
                  onStatus={(status) => updateStatus({ id: order.id, status })}
                  onClose={(outcome, restock, reason) =>
                    closeOrder({ id: order.id, outcome, restock, reason })
                  }
                  onRefund={(amountInr, reason) =>
                    refundOrder({ orderId: order.id, amountInr, reason }).then((result) => {
                      if (result.status === "failed") {
                        throw new Error("Razorpay reported that this refund failed.");
                      }
                      return result;
                    })
                  }
                  onTracking={async (carrier, trackingNumber, trackingUrl) => {
                    const reserved = window.open("about:blank", "_blank");
                    try {
                      const saved = await updateTracking({
                        id: order.id,
                        carrier,
                        trackingNumber,
                        trackingUrl,
                      });
                      const phone = String(
                        order.customer_phone || order.shipping_address?.phone || "",
                      ).replace(/\D/g, "");
                      const normalized = phone.length === 10 ? `91${phone}` : phone;
                      const text = `Assalamu alaikum. Your BADR order ${order.order_number} has shipped.\nCarrier: ${carrier || "Carrier"}\nTracking number: ${trackingNumber}${trackingUrl ? `\nTracking: ${trackingUrl}` : ""}`;
                      if (reserved && normalized) {
                        reserved.opener = null;
                        reserved.location.href = `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
                      } else {
                        reserved?.close();
                      }
                      return saved;
                    } catch (error) {
                      reserved?.close();
                      throw error;
                    }
                  }}
                />
              ))}
            </section>
          ) : null}
          {tab === "reviews" ? (
            <section className="mt-5 grid gap-3">
              {(reviews || []).map((review) => (
                <article key={review.id} className="bg-background p-5">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {review.customer_name || review.customer_email || "Customer"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {review.rating}/5 · {review.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          void updateReview({ id: review.id, status: "published", adminNote: null })
                        }
                        className="border border-emerald-400 px-3 py-2 text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          void updateReview({ id: review.id, status: "hidden", adminNote: null })
                        }
                        className="border border-foreground/30 px-3 py-2 text-xs"
                      >
                        Hide
                      </button>
                      <button
                        aria-label="Delete review"
                        onClick={() => {
                          if (window.confirm("Delete this review?"))
                            void removeReview({ id: review.id });
                        }}
                        className="border border-red-300 px-3 py-2 text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="mt-4 font-semibold">{review.title}</h3>
                  <p className="mt-2 text-sm leading-6">{review.body}</p>
                </article>
              ))}
            </section>
          ) : null}
          {tab === "customers" ? (
            <section className="mt-5 overflow-hidden bg-background">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-foreground text-background">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Orders</th>
                      <th className="p-3">Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(customers || []).map((customer) => (
                      <tr key={customer.id} className="border-t border-foreground/10">
                        <td className="p-3">
                          <strong>{customer.full_name || "Customer"}</strong>
                          <small className="block text-muted-foreground">{customer.email}</small>
                        </td>
                        <td className="p-3">{customer.phone || "—"}</td>
                        <td className="p-3">{customer.total_orders ?? 0}</td>
                        <td className="p-3">{inr(customer.total_spent ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {tab === "health" ? (
            <section className="mt-5 bg-background p-5 sm:p-8">
              <h2 className="font-display text-4xl">Launch health</h2>
              <pre className="mt-5 overflow-x-auto whitespace-pre-wrap text-xs leading-6">
                {JSON.stringify(readiness, null, 2)}
              </pre>
            </section>
          ) : null}
        </div>
      </main>
    </StoreShell>
  );
}

function AdminInput({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
      {label}
      <input
        required={required}
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 border border-foreground/20 bg-transparent px-3 text-sm font-normal normal-case tracking-normal outline-none"
      />
    </label>
  );
}

function OrderAdminCard({
  order,
  onStatus,
  onClose,
  onRefund,
  onTracking,
}: {
  order: any;
  onStatus: (status: string) => Promise<unknown>;
  onClose: (
    outcome: "cancelled" | "returned",
    restock: boolean,
    reason: string,
  ) => Promise<unknown>;
  onRefund: (amountInr: number, reason: string) => Promise<unknown>;
  onTracking: (carrier: string, number: string, url: string) => Promise<unknown>;
}) {
  const [carrier, setCarrier] = useState(order.tracking_carrier || "");
  const [number, setNumber] = useState(order.tracking_number || "");
  const [url, setUrl] = useState(order.tracking_url || "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const currentStatus = String(order.status || "processing");
  const remainingRefund = Math.max(
    0,
    Number(order.total_inr ?? order.total) - Number(order.refund_amount_inr ?? 0),
  );

  async function run(task: () => Promise<unknown>, success: string) {
    setBusy(true);
    setNotice(null);
    try {
      await task();
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }

  function requestClose(outcome: "cancelled" | "returned") {
    const reason = window.prompt(
      outcome === "cancelled"
        ? "Why is this order being cancelled?"
        : "Why was this order returned?",
    );
    if (!reason?.trim()) return;
    const restock = window.confirm("Return every item in this order to product stock?");
    if (
      !window.confirm(
        `${outcome === "cancelled" ? "Cancel" : "Return"} this order now? Payment is not automatically refunded.`,
      )
    )
      return;
    void run(
      () => onClose(outcome, restock, reason),
      restock ? "Order updated and inventory restocked." : "Order updated without restocking.",
    );
  }

  function requestRefund() {
    const rawAmount = window.prompt(
      `Refund amount in INR (maximum ₹${remainingRefund.toFixed(2)}):`,
      remainingRefund.toFixed(2),
    );
    if (rawAmount == null) return;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 1 || amount > remainingRefund) {
      setNotice(`Enter an amount between ₹1 and ₹${remainingRefund.toFixed(2)}.`);
      return;
    }
    const reason = window.prompt("Refund reason (saved to the audit trail):");
    if (!reason?.trim()) return;
    if (!window.confirm(`Refund ₹${amount.toFixed(2)} through Razorpay? This cannot be undone.`))
      return;
    void run(
      () => onRefund(amount, reason),
      "Refund submitted to Razorpay. Its webhook will confirm the final status.",
    );
  }
  return (
    <article className="bg-background p-4 sm:p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {order.order_number}
          </p>
          <h2 className="mt-1 font-display text-3xl capitalize">{order.status}</h2>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl">{inr(order.total_inr ?? order.total)}</p>
          <p className="text-xs text-muted-foreground">
            {order.payment_status}
            {order.refund_status ? ` · refund ${order.refund_status}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 border-t border-foreground/10 pt-4 md:grid-cols-2">
        <div className="text-sm leading-6">
          <strong>{order.customer_name}</strong>
          <br />
          {order.customer_email}
          <br />
          {order.customer_phone}
          <br />
          <br />
          {order.shipping_address?.address_line_1}
          <br />
          {order.shipping_address?.address_line_2}
          <br />
          {order.shipping_address?.city}, {order.shipping_address?.state}{" "}
          {order.shipping_address?.postal_code}
          <br />
          {order.shipping_address?.country}
        </div>
        <ul className="grid gap-2">
          {(order.items || []).map((item: any) => (
            <li key={item.id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] gap-3 text-sm">
              <img
                src={item.product_image_url || ""}
                alt=""
                className="h-12 w-12 object-contain"
                loading="lazy"
                decoding="async"
              />
              <span>
                {item.product_name}
                <small className="block text-muted-foreground">
                  Qty {item.quantity}
                  {item.selected_size ? ` · ${item.selected_size}` : ""}
                </small>
              </span>
              <span>{inr(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-4">
        <select
          value={currentStatus}
          disabled={busy || ["cancelled", "returned", "delivered"].includes(currentStatus)}
          onChange={(event) =>
            void run(() => onStatus(event.target.value), "Fulfillment status updated.")
          }
          className="h-11 border border-foreground/20 bg-transparent px-3 text-sm"
        >
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          {currentStatus === "cancelled" ? <option value="cancelled">Cancelled</option> : null}
          {currentStatus === "returned" ? <option value="returned">Returned</option> : null}
        </select>
        <input
          value={carrier}
          onChange={(event) => setCarrier(event.target.value)}
          placeholder="Carrier"
          className="h-11 border border-foreground/20 px-3 text-sm"
        />
        <input
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          placeholder="Tracking number"
          className="h-11 border border-foreground/20 px-3 text-sm"
        />
        <button
          disabled={!number || busy}
          onClick={() =>
            void run(
              () => onTracking(carrier, number, url),
              "Tracking saved. WhatsApp opened when a customer number was available.",
            )
          }
          className="flex items-center justify-center gap-2 bg-[#25D366] px-3 text-xs font-semibold disabled:opacity-40"
        >
          <MessageCircle className="h-4 w-4" /> Save + WhatsApp
        </button>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Tracking URL (optional)"
          className="h-11 border border-foreground/20 px-3 text-sm sm:col-span-4"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-foreground/10 pt-3">
        {currentStatus === "processing" ? (
          <button
            disabled={busy}
            onClick={() => requestClose("cancelled")}
            className="border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-40"
          >
            Cancel order
          </button>
        ) : null}
        {["shipped", "delivered", "returned"].includes(currentStatus) ? (
          <button
            disabled={busy}
            onClick={() => requestClose("returned")}
            className="border border-amber-400 px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            {currentStatus === "returned" && !order.inventory_restocked_at
              ? "Restock returned items"
              : "Mark returned"}
          </button>
        ) : null}
        {remainingRefund >= 1 && ["paid", "partially_refunded"].includes(order.payment_status) ? (
          <button
            disabled={busy || order.refund_status === "pending"}
            onClick={requestRefund}
            className="border border-foreground px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Refund via Razorpay
          </button>
        ) : null}
        {order.inventory_restocked_at ? (
          <span className="self-center text-xs text-emerald-700">Inventory restocked once</span>
        ) : null}
      </div>
      {order.refund_error ? (
        <p className="mt-3 border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          Refund attention: {order.refund_error}
        </p>
      ) : null}
      {notice ? <p className="mt-3 text-xs leading-5">{notice}</p> : null}
    </article>
  );
}
