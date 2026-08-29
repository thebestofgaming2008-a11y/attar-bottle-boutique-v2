import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  LayoutDashboard,
  BookOpen,
  BookText,
  Baby,
  Heart,
  Shirt,
  Sparkles,
  Package,
  PackageOpen,
  Tag,
  ShoppingBag,
  Users,
  Settings,
  IndianRupee,
  Plus,
  Trash2,
  Edit3,
  X,
  Image as ImageIcon,
  Upload,
  MessageCircle,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  AlertTriangle,
  Boxes,
  ClipboardList,
  ShieldCheck,
  BadgeCheck,
  ArrowUpRight,
  LogOut,
  Store,
  Star,
  MessageSquare,
  TrendingUp,
  RotateCcw,
  Menu,
  Home,
  CircleAlert,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  listAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  refreshPublicCatalog,
  uploadProductImage,
  listAllOrders,
  listAllCustomers,
  listAllReviews,
  listCategories,
  listShippingRates,
  updateOrderStatus,
  updateOrderTracking,
  updateShippingRate,
  updateReviewStatus,
  upsertCategory,
  seedDefaultCategories,
  type ProductInput,
  type AdminOrder,
  type AdminCustomer,
  type AdminReview,
  type AdminCategory,
  type ShippingRate,
} from "@/services/adminService";
import type { Product } from "@/services/productService";
import { PRODUCTS as storefrontCatalog } from "@/lib/products";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  {
    key: "oud",
    label: "Oud",
    blurb: "Deep, resinous and commanding attars.",
    parent: "attars",
    Icon: Sparkles,
  },
  {
    key: "floral",
    label: "Floral",
    blurb: "Rose-led and softly resinous compositions.",
    parent: "attars",
    Icon: Heart,
  },
  {
    key: "fruity",
    label: "Fruity",
    blurb: "Juicy, woody scents for everyday wear.",
    parent: "attars",
    Icon: Package,
  },
  {
    key: "fresh",
    label: "Fresh",
    blurb: "Clean citrus and open-water profiles.",
    parent: "attars",
    Icon: Shirt,
  },
  {
    key: "gourmand",
    label: "Gourmand",
    blurb: "Warm vanilla, amber and close-wearing scents.",
    parent: "attars",
    Icon: PackageCheck,
  },
];

function formatPrice(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function notify({
  title,
  description,
  variant,
}: {
  title: string;
  description?: string;
  variant?: "destructive";
}) {
  if (variant === "destructive") {
    toast.error(title, { description });
    return;
  }
  toast.success(title, { description });
}

const NAV = [
  { key: "dash", label: "Dashboard", Icon: LayoutDashboard },
  { key: "homepage", label: "Homepage", Icon: Store },
  { key: "orders", label: "Orders", Icon: ShoppingBag },
  { key: "products", label: "Products", Icon: Package },
  { key: "inventory", label: "Inventory", Icon: Boxes },
  { key: "categories", label: "Categories", Icon: Tag },
  { key: "shipping", label: "Shipping", Icon: Truck },
  { key: "reviews", label: "Reviews", Icon: MessageSquare },
  { key: "customers", label: "Customers", Icon: Users },
  { key: "settings", label: "Settings", Icon: Settings },
] as const;

type TabKey = (typeof NAV)[number]["key"];

const STATUS_OPTIONS = ["processing", "shipped", "delivered", "cancelled", "returned"] as const;

const ORDER_FILTERS = [
  { key: "all", label: "All orders" },
  { key: "processing", label: "Processing" },
  { key: "shipped_no_tracking", label: "Shipped missing tracking" },
  { key: "shipped_tracked", label: "Shipped tracked" },
  { key: "delivered", label: "Delivered" },
  { key: "returns", label: "Returns / cancellations" },
] as const;

function normalizeOrderStatus(status: string | null | undefined) {
  if (
    status === "shipped" ||
    status === "delivered" ||
    status === "cancelled" ||
    status === "returned"
  )
    return status;
  return "processing";
}

function normalizeWhatsAppPhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

function deltaText(current: number, previous: number) {
  const diff = current - previous;
  if (diff === 0) return "No change";
  return `${diff > 0 ? "+" : ""}${diff}`;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDashboardAnalytics(orders: AdminOrder[], customers: AdminCustomer[], daysCount = 7) {
  const paidOrders = orders.filter(
    (o) => o.payment_status === "paid" || o.payment_status === "MOCKED_PAID",
  );
  const days = Array.from({ length: daysCount }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (daysCount - 1 - index));
    return d;
  });
  const revenueTrend = days.map((day) => {
    const key = dateKey(day);
    const dayOrders = paidOrders.filter((o) => (o.created_at ?? "").slice(0, 10) === key);
    return {
      label:
        daysCount <= 7
          ? day.toLocaleDateString("en-IN", { weekday: "short" })
          : day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      value: dayOrders.reduce((sum, order) => sum + (order.total_inr ?? order.total ?? 0), 0),
    };
  });
  const orderTrend = days.map((day) => {
    const key = dateKey(day);
    return {
      label:
        daysCount <= 7
          ? day.toLocaleDateString("en-IN", { weekday: "short" })
          : day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      value: orders.filter((order) => (order.created_at ?? "").slice(0, 10) === key).length,
    };
  });
  const customerTrend = days.map((day) => {
    const key = dateKey(day);
    return {
      label:
        daysCount <= 7
          ? day.toLocaleDateString("en-IN", { weekday: "short" })
          : day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      value: customers.filter((customer) => (customer.created_at ?? "").slice(0, 10) === key)
        .length,
    };
  });
  const bestSellerMap = new Map<string, { name: string; units: number; revenue: number }>();
  for (const order of paidOrders) {
    for (const item of order.items ?? []) {
      const key = item.product_id ?? item.product_name ?? "unknown";
      const current = bestSellerMap.get(key) ?? {
        name: item.product_name ?? "Unknown product",
        units: 0,
        revenue: 0,
      };
      current.units += item.quantity;
      current.revenue += item.subtotal;
      bestSellerMap.set(key, current);
    }
  }
  const bestSellers = [...bestSellerMap.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  return { revenueTrend, orderTrend, customerTrend, bestSellers };
}

const Admin = () => {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const [tab, setTab] = useState<TabKey>("dash");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dashboardRange, setDashboardRange] = useState<"7d" | "30d" | "90d">("7d");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [productQuery, setProductQuery] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [authSaving, setAuthSaving] = useState(false);
  const [adminLoadError, setAdminLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      setAdminLoadError(null);
      return;
    }
    setLoading(true);
    setAdminLoadError(null);
    Promise.all([
      listAllProducts(),
      listAllOrders(200),
      listAllCustomers(200),
      listAllReviews(200),
      listCategories(),
      listShippingRates(),
    ])
      .then(([p, o, c, r, cats, rates]) => {
        if (cancelled) return;
        setProducts(p);
        setOrders(o);
        setCustomers(c);
        setReviews(r);
        setCategories(cats);
        setShippingRates(rates);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Could not load the admin workspace. Check the admin account and Convex environment.";
        setAdminLoadError(message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const refreshProducts = async () => setProducts(await listAllProducts());
  const refreshOrders = async () => setOrders(await listAllOrders(200));
  const refreshReviews = async () => setReviews(await listAllReviews(200));
  const refreshCategories = async () => setCategories(await listCategories());
  const refreshShippingRates = async () => setShippingRates(await listShippingRates());

  const handleSaveTracking = async (
    order: AdminOrder,
    payload: { carrier: string; trackingNumber: string; trackingUrl: string },
  ) => {
    if (!payload.trackingNumber.trim()) {
      notify({ title: "Tracking number required", variant: "destructive" });
      return false;
    }
    const saved = await updateOrderTracking(order.id, {
      carrier: payload.carrier.trim() || null,
      trackingNumber: payload.trackingNumber.trim(),
      trackingUrl: payload.trackingUrl.trim() || null,
    });
    if (!saved) {
      notify({ title: "Could not save tracking", variant: "destructive" });
      return false;
    }
    notify({ title: "Tracking saved", description: payload.trackingNumber });
    await refreshOrders();
    return true;
  };

  const handleSendWhatsApp = async (
    order: AdminOrder,
    payload: { carrier: string; trackingNumber: string; trackingUrl: string },
  ) => {
    const rawPhone = order.customer_phone || order.shipping_address?.phone || "";
    const phoneDigits = normalizeWhatsAppPhone(rawPhone);
    if (!phoneDigits) {
      notify({
        title: "Customer phone missing",
        description: "Cannot send WhatsApp because this order has no phone number.",
        variant: "destructive",
      });
      return;
    }
    if (!payload.trackingNumber.trim()) {
      notify({ title: "Add a tracking number first", variant: "destructive" });
      return;
    }
    const reservedWindow =
      typeof window !== "undefined"
        ? window.open("about:blank", "_blank", "noopener,noreferrer")
        : null;
    if (reservedWindow) reservedWindow.opener = null;
    const saved = await handleSaveTracking(order, payload);
    if (!saved) {
      reservedWindow?.close();
      return;
    }

    const orderNumber = order.order_number ?? order.id.slice(0, 8);
    const lines = [
      `Assalamu alaikum ${order.customer_name ?? ""},`.trim(),
      "",
      `Your order ${orderNumber} has shipped.`,
      payload.carrier.trim() ? `Carrier: ${payload.carrier.trim()}` : "",
      `Tracking number: ${payload.trackingNumber.trim()}`,
      payload.trackingUrl.trim() ? `Track here: ${payload.trackingUrl.trim()}` : "",
      "",
      "- BADR",
    ].filter(Boolean);
    const message = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/${phoneDigits}?text=${message}`;
    if (reservedWindow) reservedWindow.location.href = url;
    else window.location.href = url;
    notify({
      title: "Tracking saved and WhatsApp opened",
      description: `Press Send in WhatsApp to message ${rawPhone}.`,
    });
  };

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders.filter((o) => {
      const status = normalizeOrderStatus(o.status);
      const hasTracking = Boolean(o.tracking_number);
      if (orderFilter === "processing" && status !== "processing") return false;
      if (orderFilter === "shipped_no_tracking" && !(status === "shipped" && !hasTracking))
        return false;
      if (orderFilter === "shipped_tracked" && !(status === "shipped" && hasTracking)) return false;
      if (orderFilter === "delivered" && status !== "delivered") return false;
      if (orderFilter === "returns" && !["cancelled", "returned"].includes(status)) return false;
      if (!q) return true;
      return (
        (o.order_number ?? "").toLowerCase().includes(q) ||
        (o.customer_name ?? "").toLowerCase().includes(q) ||
        (o.customer_email ?? "").toLowerCase().includes(q) ||
        (o.tracking_number ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, orderQuery, orderFilter]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter((p) => {
      const stock = p.stock_quantity ?? 0;
      const status =
        p.is_active === false ? "archived" : stock <= 0 ? "out" : stock <= 5 ? "low" : "active";
      if (productFilter !== "all" && productFilter !== status) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.scent_profile ?? "").toLowerCase().includes(q) ||
        (p.product_type ?? "").toLowerCase().includes(q) ||
        (p.mood ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, productQuery, productFilter]);

  const inventoryRows = useMemo(() => {
    return [...products].sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0));
  }, [products]);

  const processingOrders = useMemo(
    () => orders.filter((o) => normalizeOrderStatus(o.status) === "processing"),
    [orders],
  );
  const shippedMissingTracking = useMemo(
    () => orders.filter((o) => normalizeOrderStatus(o.status) === "shipped" && !o.tracking_number),
    [orders],
  );

  const stats = useMemo(() => {
    const paid = orders.filter(
      (o) => o.payment_status === "paid" || o.payment_status === "MOCKED_PAID",
    );
    const revenue = paid.reduce((s, o) => s + (o.total_inr ?? o.total ?? 0), 0);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isSameDay = (value: string | null, date: Date) => {
      if (!value) return false;
      const d = new Date(value);
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      );
    };
    const todayOrders = orders.filter((o) => isSameDay(o.created_at, today));
    const yesterdayOrders = orders.filter((o) => isSameDay(o.created_at, yesterday));
    const todayCustomers = customers.filter((c) => isSameDay(c.created_at, today)).length;
    const yesterdayCustomers = customers.filter((c) => isSameDay(c.created_at, yesterday)).length;
    const aov = paid.length ? revenue / paid.length : 0;
    return [
      {
        label: "Revenue",
        value: formatPrice(revenue),
        detail: `${paid.length} paid orders`,
        Icon: IndianRupee,
      },
      {
        label: "Orders today",
        value: todayOrders.length.toString(),
        detail: `${deltaText(todayOrders.length, yesterdayOrders.length)} vs yesterday`,
        Icon: ShoppingBag,
      },
      {
        label: "Average order",
        value: formatPrice(aov),
        detail: "AOV from paid orders",
        Icon: TrendingUp,
      },
      {
        label: "New customers",
        value: todayCustomers.toString(),
        detail: `${deltaText(todayCustomers, yesterdayCustomers)} vs yesterday`,
        Icon: Users,
      },
    ];
  }, [orders, customers]);

  const dashboardDays = dashboardRange === "7d" ? 7 : dashboardRange === "30d" ? 30 : 90;
  const dashboard = useMemo(
    () => buildDashboardAnalytics(orders, customers, dashboardDays),
    [orders, customers, dashboardDays],
  );

  const opsStats = useMemo(() => {
    const lowStock = products.filter(
      (p) => p.is_active !== false && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5,
    ).length;
    const outOfStock = products.filter(
      (p) => p.is_active !== false && (p.stock_quantity ?? 0) <= 0,
    ).length;
    const activeProducts = products.filter((p) => p.is_active !== false).length;
    const shipped = orders.filter((o) => normalizeOrderStatus(o.status) === "shipped").length;
    return { lowStock, outOfStock, activeProducts, shipped };
  }, [products, orders]);

  const pendingReviews = reviews.filter((r) => r.status === "pending").length;
  const returnsOrCancellations = orders.filter((o) =>
    ["cancelled", "returned"].includes(normalizeOrderStatus(o.status)),
  ).length;
  const shippedTracked = orders.filter(
    (o) => normalizeOrderStatus(o.status) === "shipped" && Boolean(o.tracking_number),
  ).length;
  const deliveredOrders = orders.filter(
    (o) => normalizeOrderStatus(o.status) === "delivered",
  ).length;
  const paidOrders = orders.filter(
    (o) => o.payment_status === "paid" || o.payment_status === "MOCKED_PAID",
  );
  const revenueTotal = paidOrders.reduce(
    (sum, order) => sum + (order.total_inr ?? order.total ?? 0),
    0,
  );
  const inTransitOrders = orders.filter(
    (o) => normalizeOrderStatus(o.status) === "shipped" && Boolean(o.tracking_number),
  ).length;
  const toActionOrders = processingOrders.length + shippedMissingTracking.length;
  const initials =
    (adminEmail || "BA")
      .split("@")[0]
      .split(/[._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "BA";
  const activeNav = NAV.find((item) => item.key === tab) ?? NAV[0];
  const navGroups: { label: string; items: (typeof NAV)[number][] }[] = [
    { label: "Overview", items: NAV.filter((item) => ["dash", "homepage"].includes(item.key)) },
    {
      label: "Commerce",
      items: NAV.filter((item) =>
        ["orders", "products", "inventory", "categories", "shipping"].includes(item.key),
      ),
    },
    { label: "People", items: NAV.filter((item) => ["customers", "reviews"].includes(item.key)) },
    { label: "System", items: NAV.filter((item) => item.key === "settings") },
  ];
  const navBadges: Partial<Record<TabKey, number>> = {
    orders: processingOrders.length + shippedMissingTracking.length,
    inventory: opsStats.lowStock + opsStats.outOfStock,
    reviews: pendingReviews,
  };
  const ActiveIcon = activeNav.Icon;

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminEmail.includes("@")) {
      notify({ title: "Enter a valid admin email", variant: "destructive" });
      return;
    }
    if (
      adminPassword.length < 10 ||
      !/[a-z]/.test(adminPassword) ||
      !/[A-Z]/.test(adminPassword) ||
      !/[0-9]/.test(adminPassword)
    ) {
      notify({
        title: "Use at least 10 characters with uppercase, lowercase and a number",
        variant: "destructive",
      });
      return;
    }
    setAuthSaving(true);
    try {
      await signIn("password", {
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        flow: authMode,
      });
      notify({ title: authMode === "signIn" ? "Signed in" : "Admin account created" });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : "Could not sign in",
        variant: "destructive",
      });
    } finally {
      setAuthSaving(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <AdminLogin
        authLoading={authLoading}
        authMode={authMode}
        authSaving={authSaving}
        email={adminEmail}
        password={adminPassword}
        onEmailChange={setAdminEmail}
        onPasswordChange={setAdminPassword}
        onModeChange={() => setAuthMode((mode) => (mode === "signIn" ? "signUp" : "signIn"))}
        onSubmit={submitAuth}
      />
    );
  }

  return (
    <div className="vibe-admin admin-vibe flex min-h-screen bg-[rgb(var(--vibe-page))] text-[rgb(var(--vibe-foreground))]">
      <aside
        className="hidden h-screen w-64 shrink-0 flex-col border-r border-[rgb(var(--vibe-border))] bg-white md:sticky md:top-0 md:flex"
        data-testid="admin-sidebar-navigation"
      >
        <div className="flex h-16 items-center gap-3 border-b border-[rgb(var(--vibe-border))] px-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[rgb(var(--vibe-foreground))] text-white">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">BADR</p>
            <p className="text-xs leading-tight text-[rgb(var(--vibe-muted))]">Admin workspace</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[rgb(var(--vibe-muted))]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ key, label, Icon }) => {
                  const count = navBadges[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      data-testid={`admin-nav-${key}-button`}
                      className={cn(
                        "group flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-medium transition-colors",
                        tab === key
                          ? "bg-[rgb(var(--vibe-foreground))] text-white"
                          : "text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-soft))] hover:text-[rgb(var(--vibe-foreground))]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {Boolean(count) && (
                        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[rgb(var(--vibe-muted))] ring-1 ring-[rgb(var(--vibe-border))]">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[rgb(var(--vibe-border))] p-3">
          <div className="flex items-center gap-2 rounded-lg border border-[rgb(var(--vibe-border))] bg-white p-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgb(var(--vibe-foreground))] text-[11px] font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{adminEmail || "Admin"}</p>
              <p className="text-[11px] text-[rgb(var(--vibe-muted))]">Store owner</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-background))]/95 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open admin menu"
              onClick={() => setMobileNavOpen(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[rgb(var(--vibe-muted))] transition-colors hover:bg-white hover:text-[rgb(var(--vibe-foreground))] md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="truncate text-xl font-semibold leading-tight sm:text-2xl">
              {activeNav.label}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              data-testid="admin-view-storefront-link"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[rgb(var(--vibe-border))] bg-white px-3 text-sm font-medium text-[rgb(var(--vibe-muted))] transition-colors hover:bg-[rgb(var(--vibe-soft))] hover:text-[rgb(var(--vibe-foreground))]"
              title="View storefront"
            >
              <Home className="h-4 w-4" />
              <span>Store</span>
            </Link>
            <button
              type="button"
              aria-label="Sign out"
              data-testid="admin-sign-out-button"
              onClick={() => void signOut()}
              className="hidden h-10 w-10 place-items-center rounded-lg border border-[rgb(var(--vibe-border))] bg-white text-[rgb(var(--vibe-muted))] transition-colors hover:bg-[rgb(var(--vibe-soft))] hover:text-[rgb(var(--vibe-foreground))] sm:grid"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close admin menu"
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative flex h-full w-[82vw] max-w-80 flex-col border-r border-[rgb(var(--vibe-border))] bg-white p-4 shadow-xl">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">BADR</p>
                  <p className="text-xs text-[rgb(var(--vibe-muted))]">Admin workspace</p>
                </div>
                <button
                  type="button"
                  aria-label="Close admin menu"
                  onClick={() => setMobileNavOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[rgb(var(--vibe-border))]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="space-y-5">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[rgb(var(--vibe-muted))]">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setTab(key);
                            setMobileNavOpen(false);
                          }}
                          className={cn(
                            "flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium",
                            tab === key
                              ? "bg-[rgb(var(--vibe-foreground))] text-white"
                              : "text-[rgb(var(--vibe-muted))]",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1400px] space-y-6">
            {loading && (
              <div className="rounded-xl border border-border bg-background p-8 text-center text-foreground/55 text-sm">
                Loading…
              </div>
            )}

            {!loading && adminLoadError && (
              <Section
                title="Admin access needs attention"
                subtitle="The dashboard signed in, but protected admin data could not load."
              >
                <div className="space-y-4 text-sm text-[#374151]">
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                    {adminLoadError}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="rounded-md bg-[#111827] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F2937]"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="rounded-md border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB]"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </Section>
            )}

            {!loading && !adminLoadError && tab === "dash" && (
              <>
                <section data-testid="admin-needs-attention">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[12px] font-medium uppercase tracking-widest text-[rgb(var(--vibe-muted))]">
                      Needs your attention
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab("orders")}
                      className="inline-flex items-center gap-1 text-[11px] text-[rgb(var(--vibe-muted))] transition-colors hover:text-[rgb(var(--vibe-foreground))]"
                    >
                      Go to orders <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <AttentionCard
                      title="Awaiting shipment"
                      count={processingOrders.length}
                      description="Orders not yet sent"
                      Icon={PackageOpen}
                      accent="warning"
                    />
                    <AttentionCard
                      title="Missing tracking"
                      count={shippedMissingTracking.length}
                      description="Shipped without tracker"
                      Icon={CircleAlert}
                      accent="info"
                    />
                    <AttentionCard
                      title="In transit"
                      count={inTransitOrders}
                      description="On the way"
                      Icon={Truck}
                    />
                    <AttentionCard
                      title="To action"
                      count={toActionOrders}
                      description="Unshipped + missing tracking"
                      Icon={Clock}
                    />
                  </div>
                </section>

                <QuickAdminNav
                  items={[
                    {
                      label: "Orders",
                      value: orders.length,
                      detail: `${toActionOrders} to action`,
                      Icon: ShoppingBag,
                      onClick: () => setTab("orders"),
                    },
                    {
                      label: "Products",
                      value: products.length,
                      detail: `${opsStats.activeProducts} active`,
                      Icon: Package,
                      onClick: () => setTab("products"),
                    },
                    {
                      label: "Inventory",
                      value: opsStats.lowStock + opsStats.outOfStock,
                      detail: "need attention",
                      Icon: Boxes,
                      onClick: () => setTab("inventory"),
                    },
                    {
                      label: "Reviews",
                      value: pendingReviews,
                      detail: "pending",
                      Icon: MessageSquare,
                      onClick: () => setTab("reviews"),
                    },
                  ]}
                />

                <div className="vibe-card p-5 sm:p-6" data-testid="admin-revenue-card">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[13px] font-medium">Revenue</h3>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-[22px] font-semibold tracking-tight tabular-nums">
                          {formatPrice(revenueTotal)}
                        </span>
                        <TrendBadge value={0} />
                      </div>
                    </div>
                    <RangeSwitcher value={dashboardRange} onChange={setDashboardRange} />
                  </div>
                  <RevenueTrendChart data={dashboard.revenueTrend} />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  <div className="min-w-0 lg:col-span-3">
                    <Section title="Recent orders" subtitle="Latest order activity">
                      <OrdersTable
                        rows={orders.slice(0, 8)}
                        onSendWhatsApp={handleSendWhatsApp}
                        onStatusChange={async (id, s) => {
                          if (await updateOrderStatus(id, s)) {
                            notify({ title: "Order status updated" });
                            await refreshOrders();
                          }
                        }}
                      />
                    </Section>
                  </div>
                  <div className="min-w-0 lg:col-span-2">
                    <Section title="Best sellers" subtitle="Top products by units sold">
                      <BestSellersList rows={dashboard.bestSellers} />
                    </Section>
                  </div>
                </div>
              </>
            )}

            {!loading && !adminLoadError && tab === "homepage" && (
              <HomepageAdminPanel
                products={products}
                onEdit={setEditing}
                onPatch={async (product, patch) => {
                  const saved = await updateProduct(product.id, patch);
                  if (saved) {
                    await refreshPublicCatalog(saved);
                    notify({ title: "Homepage placement updated" });
                    await refreshProducts();
                  }
                }}
              />
            )}

            {!loading && !adminLoadError && tab === "orders" && (
              <Section
                title="Orders"
                subtitle={`${filteredOrders.length} of ${orders.length}`}
                action={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:flex-wrap">
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                      <input
                        type="search"
                        value={orderQuery}
                        onChange={(e) => setOrderQuery(e.target.value)}
                        placeholder="Search order, customer…"
                        data-testid="admin-orders-search-input"
                        className="h-10 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm outline-none transition-colors focus:border-foreground sm:h-9 sm:w-[240px]"
                      />
                    </div>
                    <select
                      value={orderFilter}
                      onChange={(e) => setOrderFilter(e.target.value)}
                      data-testid="admin-orders-filter-select"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm capitalize outline-none transition-colors focus:border-foreground sm:h-9 sm:w-auto"
                    >
                      <option value="all">All statuses</option>
                      {ORDER_FILTERS.map((filter) => (
                        <option key={filter.key} value={filter.key}>
                          {filter.label}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              >
                {shippedMissingTracking.length > 0 && (
                  <div
                    className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                    data-testid="admin-shipped-missing-tracking-warning"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="font-semibold">Shipped orders missing tracking</p>
                          <p className="text-amber-800/80">
                            {shippedMissingTracking.length} shipped order
                            {shippedMissingTracking.length === 1 ? "" : "s"} need a tracking number
                            before customers can be updated.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOrderFilter("shipped_no_tracking")}
                        className="h-8 rounded-md border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        Review now
                      </button>
                    </div>
                  </div>
                )}
                <OrdersTable
                  rows={filteredOrders}
                  onSendWhatsApp={handleSendWhatsApp}
                  onStatusChange={async (id, s) => {
                    if (await updateOrderStatus(id, s)) {
                      notify({ title: "Order status updated" });
                      await refreshOrders();
                    }
                  }}
                />
              </Section>
            )}

            {!loading && !adminLoadError && tab === "products" && (
              <Section
                title="Products"
                subtitle={`${filteredProducts.length} of ${products.length} total`}
                action={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:flex-wrap">
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
                      <input
                        type="search"
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                        placeholder="Search product, SKU…"
                        data-testid="admin-products-search-input"
                        className="h-10 w-full rounded-md border border-[#D1D5DB] bg-white pl-8 pr-3 text-sm outline-none transition-colors focus:border-[#111827] sm:h-9 sm:w-[240px]"
                      />
                    </div>
                    <select
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      data-testid="admin-products-filter-select"
                      className="h-10 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-sm outline-none transition-colors focus:border-[#111827] sm:h-9 sm:w-auto"
                    >
                      <option value="all">All products</option>
                      <option value="active">Active</option>
                      <option value="low">Low stock</option>
                      <option value="out">Out of stock</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button
                      onClick={() => setCreating(true)}
                      data-testid="admin-add-product-button"
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1F2937] sm:h-9 sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Add product
                    </button>
                  </div>
                }
              >
                <ProductsTable
                  products={filteredProducts}
                  onEdit={setEditing}
                  onDelete={async (p) => {
                    if (!confirm(`Archive "${p.name}"? It will be hidden from the storefront.`))
                      return;
                    if (await deleteProduct(p.id)) {
                      await refreshPublicCatalog(p);
                      notify({ title: "Product archived" });
                      await refreshProducts();
                    } else {
                      notify({ title: "Could not archive", variant: "destructive" });
                    }
                  }}
                />
              </Section>
            )}

            {!loading && !adminLoadError && tab === "inventory" && (
              <Section
                title="Inventory"
                subtitle={`${opsStats.lowStock + opsStats.outOfStock} products need attention`}
                action={
                  <button
                    type="button"
                    onClick={() => setTab("products")}
                    data-testid="admin-inventory-manage-products-button"
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-[#D1D5DB] bg-white px-3.5 text-sm font-medium transition-colors hover:bg-[#F9FAFB] sm:h-9 sm:w-auto"
                  >
                    Manage products <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                }
              >
                <InventoryTable products={inventoryRows} onEdit={setEditing} />
              </Section>
            )}

            {!loading && !adminLoadError && tab === "categories" && (
              <CategoriesAdminPanel
                categories={categories}
                products={products}
                onSeed={async () => {
                  await seedDefaultCategories();
                  notify({ title: "Default categories seeded" });
                  await refreshCategories();
                }}
                onSave={async (input) => {
                  await upsertCategory(input);
                  notify({ title: "Category saved" });
                  await refreshCategories();
                }}
              />
            )}

            {!loading && !adminLoadError && tab === "shipping" && (
              <ShippingAdminPanel
                rates={shippingRates}
                onSave={async (rate, patch) => {
                  await updateShippingRate(rate.id, patch);
                  notify({ title: "Shipping rate updated" });
                  await refreshShippingRates();
                }}
              />
            )}

            {!loading && !adminLoadError && tab === "customers" && (
              <Section title="Customers" subtitle={`${customers.length} total customer profiles`}>
                <CustomersTable rows={customers} />
              </Section>
            )}

            {!loading && !adminLoadError && tab === "reviews" && (
              <Section
                title="Reviews"
                subtitle={`${reviews.filter((r) => r.status === "pending").length} waiting for approval`}
              >
                <ReviewsTable
                  rows={reviews}
                  products={products}
                  onStatusChange={async (id, status) => {
                    if (await updateReviewStatus(id, status)) {
                      notify({
                        title: status === "published" ? "Review published" : "Review updated",
                      });
                      await refreshReviews();
                      await refreshProducts();
                    }
                  }}
                />
              </Section>
            )}

            {!loading && !adminLoadError && tab === "settings" && (
              <Section
                title="Settings & security"
                subtitle="Operational guardrails and integrations"
              >
                <div className="grid lg:grid-cols-2 gap-4 text-sm leading-relaxed">
                  <SettingsCard
                    title="Security hardening"
                    Icon={ShieldCheck}
                    lines={[
                      "Admin data is protected by Convex identity + ADMIN_EMAIL checks.",
                      "Checkout totals are now computed server-side from live product prices.",
                      "Order status, tracking URLs and product inputs are validated before writes.",
                    ]}
                  />
                  <SettingsCard
                    title="Fulfillment messaging"
                    Icon={MessageCircle}
                    lines={[
                      "Tracking is WhatsApp click-to-send via wa.me links.",
                      "Admin still presses Send inside WhatsApp, so no hidden automation risk.",
                      "Orders without phone numbers are clearly blocked from WhatsApp sending.",
                    ]}
                  />
                  <SettingsCard
                    title="Currency"
                    Icon={IndianRupee}
                    lines={[
                      "Customer display uses live ExchangeRate-API rates.",
                      "Converted prices are approximate; checkout and admin totals stay in INR.",
                      "Frontend caches rates locally to reduce API usage.",
                    ]}
                  />
                  <SettingsCard
                    title="Payments"
                    Icon={BadgeCheck}
                    lines={[
                      "Razorpay orders are created from trusted server-side totals.",
                      "Payments are verified by signature and reconciled by webhook.",
                      "Refunds and failed payments remain auditable from the order record.",
                    ]}
                  />
                </div>
              </Section>
            )}
          </div>
        </main>
      </div>

      {(creating || editing) && (
        <ProductDrawer
          product={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await refreshProducts();
          }}
        />
      )}
    </div>
  );
};

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "BADR admin" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

function AdminLogin({
  authLoading,
  authMode,
  authSaving,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onModeChange,
  onSubmit,
}: {
  authLoading: boolean;
  authMode: "signIn" | "signUp";
  authSaving: boolean;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onModeChange: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const navGroups: { label: string; items: (typeof NAV)[number][] }[] = [
    { label: "Overview", items: NAV.filter((item) => ["dash", "homepage"].includes(item.key)) },
    {
      label: "Commerce",
      items: NAV.filter((item) =>
        ["orders", "products", "inventory", "categories", "shipping"].includes(item.key),
      ),
    },
    { label: "People", items: NAV.filter((item) => ["customers", "reviews"].includes(item.key)) },
    { label: "System", items: NAV.filter((item) => item.key === "settings") },
  ];

  return (
    <div className="vibe-admin admin-vibe flex min-h-screen bg-[rgb(var(--vibe-page))] text-[rgb(var(--vibe-foreground))]">
      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-[#e5e5e5] bg-[#fafafa] md:sticky md:top-0 md:flex">
        <div className="flex h-14 items-center gap-3 border-b border-[#e5e5e5] px-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[#171717] text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">BADR</p>
            <p className="text-xs leading-tight text-[#737373]">Admin workspace</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[rgb(var(--vibe-muted))]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    disabled
                    className={cn(
                      "group flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-medium transition-colors",
                      key === "dash" ? "bg-[#ededed] text-[#171717]" : "text-[#525252]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-[rgb(var(--vibe-border))] p-3">
          <div className="flex items-center gap-2 rounded-lg border border-[rgb(var(--vibe-border))] bg-white p-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgb(var(--vibe-foreground))] text-[11px] font-semibold text-white">
              BA
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">Admin</p>
              <p className="text-[11px] text-[rgb(var(--vibe-muted))]">Store owner</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[#e5e5e5] bg-[#fafafa]/95 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#e5e5e5] bg-white md:hidden">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Overview</p>
              <p className="hidden text-xs leading-tight text-[#737373] sm:block">
                BADR store operations
              </p>
            </div>
          </div>
          <Link
            to="/"
            aria-label="View storefront"
            className="grid h-9 w-9 place-items-center rounded-md border border-[#e5e5e5] bg-white text-[#525252] transition-colors hover:bg-[#f4f4f5] hover:text-[#171717]"
            title="View storefront"
          >
            <Store className="h-4 w-4" />
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1400px] space-y-6">
            <Section
              title={authMode === "signIn" ? "Admin sign in" : "Create admin account"}
              subtitle="Use the store owner email configured in Convex."
            >
              <form onSubmit={onSubmit} className="max-w-md space-y-3">
                <Field label="Email" value={email} onChange={onEmailChange} type="email" required />
                <Field
                  label="Password"
                  value={password}
                  onChange={onPasswordChange}
                  type="password"
                  autoComplete={authMode === "signIn" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="submit"
                  disabled={authLoading || authSaving}
                  className="rounded-md bg-[#111827] text-white text-sm font-semibold px-4 h-9 hover:bg-[#1F2937] transition-colors disabled:opacity-60"
                >
                  {authLoading || authSaving
                    ? "Please wait..."
                    : authMode === "signIn"
                      ? "Sign in"
                      : "Create account"}
                </button>
                <button
                  type="button"
                  onClick={onModeChange}
                  className="ml-3 text-xs font-medium text-[#525252] underline-offset-4 hover:text-[#111827] hover:underline"
                >
                  {authMode === "signIn"
                    ? "First setup? Create admin account"
                    : "Already created? Sign in"}
                </button>
              </form>
            </Section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden shadow-sm"
      data-testid={`admin-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
    >
      <div className="flex flex-col gap-3 border-b border-[#E5E7EB] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div>
          <h2 className="font-semibold text-[#111827] text-[15px] md:text-base leading-tight">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="w-full sm:w-auto">{action}</div>}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function AttentionCard({
  title,
  count,
  description,
  Icon,
  accent = "neutral",
}: {
  title: string;
  count: number;
  description: string;
  Icon: LucideIcon;
  accent?: "neutral" | "warning" | "info";
}) {
  const iconColor =
    accent === "warning"
      ? "text-amber-500"
      : accent === "info"
        ? "text-blue-500"
        : "text-[rgb(var(--vibe-muted))]";

  return (
    <div className="vibe-card p-4 transition-colors hover:border-zinc-400 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[12px] text-[rgb(var(--vibe-muted))] sm:text-[13px]">
          {title}
        </span>
        <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
      </div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold tracking-tight tabular-nums sm:text-[24px]">
          {count}
        </span>
        <span className="text-[11px] text-[rgb(var(--vibe-muted))]">orders</span>
      </div>
      <p className="line-clamp-2 text-[11px] text-[rgb(var(--vibe-muted))]">{description}</p>
    </div>
  );
}

function QuickAdminNav({
  items,
}: {
  items: Array<{
    label: string;
    value: number;
    detail: string;
    Icon: LucideIcon;
    onClick: () => void;
  }>;
}) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="admin-quick-nav">
      {items.map(({ label, value, detail, Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="vibe-card flex items-center gap-3 p-3 text-left transition-colors hover:border-zinc-400 hover:bg-white sm:p-4"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[rgb(var(--vibe-soft))] text-[rgb(var(--vibe-foreground))]">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{label}</span>
            <span className="mt-0.5 block text-xs text-[rgb(var(--vibe-muted))]">
              <span className="font-semibold tabular-nums text-[rgb(var(--vibe-foreground))]">
                {value}
              </span>{" "}
              {detail}
            </span>
          </span>
        </button>
      ))}
    </section>
  );
}

function RangeSwitcher({
  value,
  onChange,
}: {
  value: "7d" | "30d" | "90d";
  onChange: (value: "7d" | "30d" | "90d") => void;
}) {
  const ranges = ["7d", "30d", "90d"] as const;
  return (
    <div className="inline-flex items-center rounded-md border border-[rgb(var(--vibe-border))] bg-white p-0.5">
      {ranges.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={cn(
            "h-7 rounded px-3 text-[11px] font-medium transition-colors",
            value === range
              ? "bg-[rgb(var(--vibe-foreground))] text-white"
              : "text-[rgb(var(--vibe-muted))] hover:text-[rgb(var(--vibe-foreground))]",
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );
}

function TrendBadge({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium tabular-nums",
        value >= 0 ? "text-emerald-600" : "text-red-600",
      )}
    >
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function RevenueTrendChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-48 w-full sm:h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(var(--vibe-foreground))" stopOpacity={0.16} />
              <stop offset="95%" stopColor="rgb(var(--vibe-foreground))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--vibe-border))" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgb(var(--vibe-muted))", fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgb(var(--vibe-muted))", fontSize: 11 }}
            tickFormatter={(value) => {
              const n = Number(value);
              if (n >= 100000) return `${Math.round(n / 100000)}L`;
              if (n >= 1000) return `${Math.round(n / 1000)}k`;
              return String(n);
            }}
            domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax * 1.25))]}
            width={38}
          />
          <Tooltip
            cursor={{ stroke: "rgb(var(--vibe-border))" }}
            formatter={(value) => [formatPrice(Number(value)), "Revenue"]}
            contentStyle={{
              border: "1px solid rgb(var(--vibe-border))",
              borderRadius: 10,
              boxShadow: "0 10px 30px rgb(0 0 0 / 0.08)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="rgb(var(--vibe-foreground))"
            strokeWidth={2}
            fill="url(#adminRevenueFill)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimpleBarChart({
  data,
  formatValue = (value) => String(value),
  compact = false,
}: {
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
  compact?: boolean;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div
      className={cn("flex items-end gap-2", compact ? "h-36" : "h-52")}
      data-testid="admin-simple-bar-chart"
    >
      {data.map((item) => {
        const height = Math.max(6, (item.value / max) * 100);
        return (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end rounded-md bg-[#F3F4F6]">
              <div
                className="w-full rounded-md bg-[#111827] transition-all"
                style={{ height: `${height}%` }}
                title={`${item.label}: ${formatValue(item.value)}`}
              />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-medium text-[#6B7280]">{item.label}</p>
              {!compact && <p className="text-[11px] text-[#111827]">{formatValue(item.value)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BestSellersList({ rows }: { rows: { name: string; units: number; revenue: number }[] }) {
  if (!rows.length)
    return (
      <p className="text-sm text-[#6B7280]">Best sellers appear after paid orders have items.</p>
    );
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={row.name}
          className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3 last:border-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#111827]">
              {index + 1}. {row.name}
            </p>
            <p className="text-xs text-[#6B7280]">{row.units} units sold</p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-[#111827]">
            {formatPrice(row.revenue)}
          </p>
        </div>
      ))}
    </div>
  );
}

function OpsCard({
  title,
  Icon,
  rows,
  action,
  actionLabel,
}: {
  title: string;
  Icon: LucideIcon;
  rows: [string, string][];
  action: () => void;
  actionLabel: string;
}) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#111827] inline-flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#6B7280]" /> {title}
        </h3>
        <button
          type="button"
          onClick={action}
          data-testid={`admin-ops-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-button`}
          className="text-xs font-medium text-[#111827] hover:underline inline-flex items-center gap-1"
        >
          {actionLabel} <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-4 divide-y divide-[#E5E7EB]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-[#6B7280]">{label}</span>
            <span className="font-semibold text-[#111827] tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QueueCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "warning" | "info" | "success";
}) {
  const toneClass = {
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[tone];
  return (
    <div
      className={cn("rounded-lg border p-4", toneClass)}
      data-testid={`admin-queue-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SettingsCard({
  title,
  Icon,
  lines,
}: {
  title: string;
  Icon: LucideIcon;
  lines: string[];
}) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <h3 className="text-sm font-semibold text-[#111827] inline-flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-[#4B5563]" /> {title}
      </h3>
      <ul className="space-y-2">
        {lines.map((line) => (
          <li key={line} className="flex gap-2 text-[#4B5563]">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; text: string; border: string; Icon: typeof Clock }
> = {
  processing: {
    label: "Processing",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    Icon: Package,
  },
  shipped: {
    label: "Shipped",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    Icon: Truck,
  },
  delivered: {
    label: "Delivered",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    Icon: PackageCheck,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    Icon: XCircle,
  },
  returned: {
    label: "Returned",
    bg: "bg-violet-50",
    text: "text-violet-800",
    border: "border-violet-200",
    Icon: RotateCcw,
  },
};

function statusLabel(status: string) {
  if (status === "processing") return "Processing / In fulfillment";
  return STATUS_BADGE[status]?.label ?? status;
}

function StatusBadge({ status, testId }: { status: string | null | undefined; testId: string }) {
  const s = STATUS_BADGE[normalizeOrderStatus(status)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border",
        s.bg,
        s.text,
        s.border,
      )}
      data-testid={testId}
    >
      <s.Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

function PaymentBadge({ status, testId }: { status: string | null | undefined; testId: string }) {
  const isPaid = status === "paid" || status === "MOCKED_PAID";
  const isMock = status === "MOCKED_PAID";
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border",
        isPaid
          ? "bg-white text-[#374151] border-[#D1D5DB]"
          : "bg-white text-[#6B7280] border-[#D1D5DB]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", isPaid ? "bg-[#111827]" : "bg-[#9CA3AF]")} />
      {isMock ? "Mock paid" : (status ?? "—")}
    </span>
  );
}

function OrdersTable({
  rows,
  onStatusChange,
  onSendWhatsApp,
}: {
  rows: AdminOrder[];
  onStatusChange: (id: string, s: string) => Promise<void>;
  onSendWhatsApp: (
    o: AdminOrder,
    p: { carrier: string; trackingNumber: string; trackingUrl: string },
  ) => Promise<void>;
}) {
  if (rows.length === 0)
    return (
      <div className="text-center py-10">
        <ShoppingBag className="h-8 w-8 text-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-foreground/55">No orders to show.</p>
      </div>
    );
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <OrderRow
          key={r.id}
          order={r}
          onStatusChange={onStatusChange}
          onSendWhatsApp={onSendWhatsApp}
        />
      ))}
    </div>
  );
}

function OrderRow({
  order,
  onStatusChange,
  onSendWhatsApp,
}: {
  order: AdminOrder;
  onStatusChange: (id: string, s: string) => Promise<void>;
  onSendWhatsApp: (
    o: AdminOrder,
    p: { carrier: string; trackingNumber: string; trackingUrl: string },
  ) => Promise<void>;
}) {
  const [carrier, setCarrier] = useState(order.tracking_carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [expanded, setExpanded] = useState(false);
  const orderNumber = order.order_number ?? order.id.slice(0, 8);
  const date = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    : "—";

  const payload = { carrier, trackingNumber, trackingUrl };
  const hasPhone = Boolean(order.customer_phone);

  return (
    <div className="rounded-lg border border-border bg-background hover:border-foreground/20 transition-colors">
      <div className="hidden items-center gap-3 px-4 py-3 md:grid md:grid-cols-[140px_1fr_auto_auto_auto]">
        <div className="min-w-0">
          <p
            className="font-mono text-[12px] text-foreground/80 leading-tight"
            data-testid={`admin-order-number-${order.id}`}
          >
            {orderNumber}
          </p>
          <p className="text-[11px] text-foreground/45 mt-0.5">{date}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {order.customer_name ?? "—"}
          </p>
          <p className="text-[12px] text-foreground/55 truncate">{order.customer_email ?? "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatPrice(order.total_inr ?? order.total)}
          </p>
          <PaymentBadge
            status={order.payment_status}
            testId={`admin-order-payment-badge-${order.id}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} testId={`admin-order-status-badge-${order.id}`} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <select
            value={normalizeOrderStatus(order.status)}
            onChange={(e) => onStatusChange(order.id, e.target.value)}
            data-testid={`admin-order-status-select-${order.id}`}
            className="text-xs h-8 rounded-md border border-border bg-background px-2 capitalize cursor-pointer hover:border-foreground/40 focus:outline-none focus:border-foreground transition-colors"
            aria-label="Change order status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            data-testid={`admin-order-expand-button-${order.id}`}
            className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-foreground/[0.04] transition-colors inline-flex items-center gap-1"
          >
            <Truck className="h-3.5 w-3.5" />
            {expanded ? "Hide" : "Send tracker"}
          </button>
        </div>
      </div>

      {/* Mobile-only customer/total row */}
      <div className="space-y-3 p-4 md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="font-mono text-[12px] leading-tight text-foreground/80"
              data-testid={`admin-mobile-order-number-${order.id}`}
            >
              {orderNumber}
            </p>
            <p className="mt-1 text-[12px] text-foreground/50">{date}</p>
          </div>
          <p className="shrink-0 text-base font-semibold tabular-nums">
            {formatPrice(order.total_inr ?? order.total)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-foreground">
            {order.customer_name ?? order.customer_email ?? "Customer"}
          </p>
          {order.customer_email && (
            <p className="truncate text-xs text-foreground/55">{order.customer_email}</p>
          )}
        </div>
      </div>

      <div className="hidden">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">
            {order.customer_name ?? order.customer_email ?? "—"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold tabular-nums">
            {formatPrice(order.total_inr ?? order.total)}
          </p>
        </div>
      </div>
      <div className="md:hidden px-4 pb-3 flex items-center gap-2 flex-wrap">
        <StatusBadge status={order.status} testId={`admin-order-mobile-status-badge-${order.id}`} />
        <PaymentBadge
          status={order.payment_status}
          testId={`admin-order-mobile-payment-badge-${order.id}`}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 px-4 pb-4 md:hidden">
        <select
          value={normalizeOrderStatus(order.status)}
          onChange={(e) => onStatusChange(order.id, e.target.value)}
          data-testid={`admin-mobile-order-status-select-${order.id}`}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm capitalize outline-none transition-colors focus:border-foreground"
          aria-label="Change order status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          data-testid={`admin-mobile-order-expand-button-${order.id}`}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border text-sm font-medium transition-colors hover:bg-foreground/[0.04]"
        >
          <Truck className="h-4 w-4" />
          {expanded ? "Hide tracking" : "Add or send tracking"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-foreground/[0.015] px-4 py-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr] gap-2.5">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold">
                Carrier
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="India Post, Delhivery…"
                data-testid={`admin-tracking-carrier-input-${order.id}`}
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-foreground transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold">
                Tracking number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Paste tracking #"
                data-testid={`admin-tracking-number-input-${order.id}`}
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold">
                Tracking URL (optional)
              </label>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://…"
                data-testid={`admin-tracking-url-input-${order.id}`}
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-foreground transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSendWhatsApp(order, payload)}
              disabled={!hasPhone}
              data-testid={`admin-send-whatsapp-button-${order.id}`}
              className={cn(
                "h-9 px-3.5 rounded-md text-sm font-semibold inline-flex items-center gap-1.5 transition-colors",
                hasPhone
                  ? "bg-[#111827] text-white hover:bg-[#1F2937]"
                  : "bg-foreground/10 text-foreground/40 cursor-not-allowed",
              )}
              title={
                hasPhone
                  ? `Send to ${order.customer_phone}`
                  : "Customer phone is missing on this order"
              }
            >
              <MessageCircle className="h-4 w-4" />
              Save and send WhatsApp
            </button>
            {!hasPhone && (
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                No phone on order
              </span>
            )}
            {order.tracking_number && (
              <span className="text-[11px] text-foreground/55 ml-auto">
                Saved: <span className="font-mono text-foreground/75">{order.tracking_number}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsTable({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  if (products.length === 0)
    return (
      <div className="text-center py-10">
        <Package className="h-8 w-8 text-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-foreground/55">No products yet — add your first one.</p>
      </div>
    );
  return (
    <>
      <div className="space-y-3 md:hidden">
        {products.map((p) => (
          <article key={p.id} className="rounded-lg border border-border bg-white p-3">
            <div className="flex items-start gap-3">
              <ProductThumb product={p} />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#111827]">
                  {p.name}
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  {categoryLabel(p.category_id ?? p.category)} · {p.sku || "No SKU"}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Price</p>
                    <p className="font-semibold tabular-nums">{formatPrice(p.price_inr)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Stock</p>
                    <p className="font-semibold tabular-nums">{p.stock_quantity ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Status</p>
                    <p
                      className={cn(
                        "font-semibold",
                        p.is_active === false ? "text-[#6B7280]" : "text-emerald-700",
                      )}
                    >
                      {p.is_active === false ? "Hidden" : "Active"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onEdit(p)}
                data-testid={`admin-mobile-edit-product-button-${p.id}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#111827] text-sm font-semibold text-white"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(p)}
                data-testid={`admin-mobile-delete-product-button-${p.id}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#D1D5DB] text-sm font-medium text-[#4B5563]"
              >
                <Trash2 className="h-4 w-4" />
                Archive
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto -mx-2 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-foreground/50 border-b border-border">
              <th className="font-semibold py-2.5 px-2">Product</th>
              <th className="font-semibold py-2.5 px-2">Category</th>
              <th className="font-semibold py-2.5 px-2">Price</th>
              <th className="font-semibold py-2.5 px-2">Stock</th>
              <th className="font-semibold py-2.5 px-2">Status</th>
              <th className="font-semibold py-2.5 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                className="border-b border-border last:border-0 hover:bg-foreground/[0.02] transition-colors"
              >
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductThumb product={p} />
                    <span className="font-medium line-clamp-1">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 px-2 capitalize text-foreground/70">{p.category ?? "—"}</td>
                <td className="py-3 px-2 tabular-nums">{formatPrice(p.price_inr)}</td>
                <td className="py-3 px-2 text-foreground/70 tabular-nums">
                  {p.stock_quantity ?? "—"}
                </td>
                <td className="py-3 px-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
                      p.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-foreground/[0.04] text-foreground/55 border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        p.is_active ? "bg-emerald-500" : "bg-foreground/30",
                      )}
                    />
                    {p.is_active ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => onEdit(p)}
                      aria-label="Edit"
                      data-testid={`admin-edit-product-button-${p.id}`}
                      className="h-8 w-8 grid place-items-center rounded-md hover:bg-foreground/5"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(p)}
                      aria-label="Delete"
                      data-testid={`admin-delete-product-button-${p.id}`}
                      className="h-8 w-8 grid place-items-center rounded-md hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InventoryTable({
  products,
  onEdit,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
}) {
  if (products.length === 0) {
    return <p className="text-sm text-[#6B7280]">No products available.</p>;
  }
  return (
    <>
      <div className="space-y-3 md:hidden" data-testid="admin-inventory-mobile-list">
        {products.map((p) => {
          const stock = p.stock_quantity ?? 0;
          const health =
            p.is_active === false
              ? "Archived"
              : stock <= 0
                ? "Out"
                : stock <= 5
                  ? "Low"
                  : "Healthy";
          return (
            <article key={p.id} className="rounded-lg border border-[#E5E7EB] bg-white p-3">
              <div className="flex items-center gap-3">
                <ProductThumb product={p} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#111827]">{p.name}</p>
                  <p className="truncate text-xs text-[#6B7280]">
                    {p.sku || p.category || "No SKU"}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-semibold tabular-nums text-[#111827]">
                  {stock}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <InventoryBadge health={health} testId={`admin-mobile-inventory-health-${p.id}`} />
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  data-testid={`admin-mobile-inventory-edit-button-${p.id}`}
                  className="h-9 rounded-md border border-[#D1D5DB] px-3 text-xs font-medium transition-colors hover:bg-[#F3F4F6]"
                >
                  Edit stock
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto -mx-2 md:block" data-testid="admin-inventory-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#6B7280] border-b border-[#E5E7EB]">
              <th className="font-semibold py-2.5 px-2">Product</th>
              <th className="font-semibold py-2.5 px-2">Stock</th>
              <th className="font-semibold py-2.5 px-2">Health</th>
              <th className="font-semibold py-2.5 px-2">Visibility</th>
              <th className="font-semibold py-2.5 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.stock_quantity ?? 0;
              const health =
                p.is_active === false
                  ? "Archived"
                  : stock <= 0
                    ? "Out"
                    : stock <= 5
                      ? "Low"
                      : "Healthy";
              return (
                <tr
                  key={p.id}
                  className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <ProductThumb product={p} />
                      <div className="min-w-0">
                        <p className="font-medium text-[#111827] truncate">{p.name}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">
                          {p.sku || p.category || "No SKU"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 tabular-nums font-semibold text-[#111827]">{stock}</td>
                  <td className="py-3 px-2">
                    <InventoryBadge health={health} testId={`admin-inventory-health-${p.id}`} />
                  </td>
                  <td className="py-3 px-2 text-[#6B7280]">
                    {p.is_active === false ? "Hidden" : "Storefront"}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      data-testid={`admin-inventory-edit-button-${p.id}`}
                      className="h-8 px-3 rounded-md border border-[#D1D5DB] hover:bg-[#F3F4F6] transition-colors text-xs font-medium"
                    >
                      Edit stock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InventoryBadge({ health, testId }: { health: string; testId: string }) {
  const map: Record<string, string> = {
    Healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Low: "bg-amber-50 text-amber-700 border-amber-200",
    Out: "bg-rose-50 text-rose-700 border-rose-200",
    Archived: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
        map[health],
      )}
      data-testid={testId}
    >
      {health === "Low" || health === "Out" ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {health}
    </span>
  );
}

function CustomersTable({ rows }: { rows: AdminCustomer[] }) {
  if (rows.length === 0) return <p className="text-sm text-foreground/60">No customers yet.</p>;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-foreground/55 border-b border-border">
            <th className="font-medium py-2 px-2">Name</th>
            <th className="font-medium py-2 px-2">Email</th>
            <th className="font-medium py-2 px-2">Phone</th>
            <th className="font-medium py-2 px-2">Orders</th>
            <th className="font-medium py-2 px-2">Spent</th>
            <th className="font-medium py-2 px-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="py-3 px-2 font-medium">{r.full_name ?? "—"}</td>
              <td className="py-3 px-2 text-foreground/70">{r.email ?? "—"}</td>
              <td className="py-3 px-2 text-foreground/70">{r.phone ?? "—"}</td>
              <td className="py-3 px-2">{r.total_orders ?? 0}</td>
              <td className="py-3 px-2">{formatPrice(r.total_spent ?? 0)}</td>
              <td className="py-3 px-2 text-foreground/70">
                {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewsTable({
  rows,
  products,
  onStatusChange,
}: {
  rows: AdminReview[];
  products: Product[];
  onStatusChange: (id: string, status: "pending" | "published" | "hidden") => Promise<void>;
}) {
  const productName = (id: string) =>
    products.find((product) => product.id === id)?.name ?? "Product";
  if (rows.length === 0) {
    return <p className="text-sm text-[#6B7280]">No reviews yet.</p>;
  }
  return (
    <div className="space-y-3" data-testid="admin-reviews-list">
      {rows.map((review) => (
        <article key={review.id} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111827]">
                {productName(review.product_id)}
              </p>
              <p className="text-xs text-[#6B7280]">
                {review.customer_email ?? "Customer"} ·{" "}
                {review.created_at ? new Date(review.created_at).toLocaleDateString() : "No date"}
              </p>
            </div>
            <div
              className="flex items-center gap-1 text-[#111827]"
              aria-label={`${review.rating} stars`}
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={cn("h-3.5 w-3.5", index < review.rating && "fill-current")}
                />
              ))}
            </div>
          </div>
          {review.title && (
            <h3 className="mt-3 text-sm font-medium text-[#111827]">{review.title}</h3>
          )}
          {review.body && (
            <p className="mt-1 text-sm leading-relaxed text-[#4B5563]">{review.body}</p>
          )}
          {Boolean(review.media_urls?.length) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.media_urls?.slice(0, 4).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[#E5E7EB] px-2 py-1 text-xs text-[#4B5563] hover:bg-[#F9FAFB]"
                >
                  Media
                </a>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#D1D5DB] px-2 py-1 text-xs font-medium text-[#4B5563] capitalize">
              {review.status}
            </span>
            <button
              type="button"
              onClick={() => onStatusChange(review.id, "published")}
              className="h-8 rounded-md bg-[#111827] px-3 text-xs font-semibold text-white hover:bg-[#1F2937]"
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => onStatusChange(review.id, "hidden")}
              className="h-8 rounded-md border border-[#D1D5DB] px-3 text-xs font-medium text-[#4B5563] hover:bg-[#F9FAFB]"
            >
              Hide
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function HomepageAdminPanel({
  products,
  onEdit,
  onPatch,
}: {
  products: Product[];
  onEdit: (product: Product) => void;
  onPatch: (product: Product, patch: Partial<ProductInput>) => Promise<void>;
}) {
  const featured = products.filter((product) => product.is_featured);
  const newArrivals = products.filter((product) => product.is_new_arrival);
  const bestsellers = products.filter((product) => product.is_bestseller);
  const rows = products.filter((product) => product.is_active !== false);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <AttentionCard
          title="Featured"
          count={featured.length}
          description="Products shown in homepage rails"
          Icon={Store}
        />
        <AttentionCard
          title="New arrivals"
          count={newArrivals.length}
          description="Fresh products promoted on the storefront"
          Icon={Sparkles}
          accent="info"
        />
        <AttentionCard
          title="Bestsellers"
          count={bestsellers.length}
          description="Products marked as strongest sellers"
          Icon={TrendingUp}
        />
      </div>

      <Section
        title="Homepage placement"
        subtitle="Choose what appears in the storefront sections."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" data-testid="admin-homepage-placement-table">
            <thead>
              <tr className="border-b border-[rgb(var(--vibe-border))] text-left text-[11px] uppercase tracking-[0.16em] text-[rgb(var(--vibe-muted))]">
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 px-3">Collection</th>
                <th className="py-2 px-3">Featured</th>
                <th className="py-2 px-3">New</th>
                <th className="py-2 px-3">Bestseller</th>
                <th className="py-2 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[rgb(var(--vibe-border))] last:border-0"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb product={product} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="text-xs text-[rgb(var(--vibe-muted))]">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {categoryLabel(product.category_id ?? product.category)}
                  </td>
                  <td className="px-3 py-3">
                    <ToggleButton
                      active={Boolean(product.is_featured)}
                      onClick={() => onPatch(product, { is_featured: !product.is_featured })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <ToggleButton
                      active={Boolean(product.is_new_arrival)}
                      onClick={() => onPatch(product, { is_new_arrival: !product.is_new_arrival })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <ToggleButton
                      active={Boolean(product.is_bestseller)}
                      onClick={() => onPatch(product, { is_bestseller: !product.is_bestseller })}
                    />
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      className="h-8 rounded-md border border-[rgb(var(--vibe-border))] px-3 text-xs hover:bg-[rgb(var(--vibe-accent))]"
                      onClick={() => onEdit(product)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function CategoriesAdminPanel({
  categories,
  products,
  onSeed,
  onSave,
}: {
  categories: AdminCategory[];
  products: Product[];
  onSeed: () => Promise<void>;
  onSave: (input: {
    slug?: string | null;
    name: string;
    type?: string;
    parent_slug?: string | null;
    sort_order?: number | null;
    is_active?: boolean;
  }) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    name: "",
    slug: "",
    type: "collection",
    parent_slug: "",
    sort_order: "",
  });
  const productCount = (slug: string) =>
    products.filter((product) => product.category_id === slug || product.category === slug).length;

  const save = async () => {
    if (!draft.name.trim()) {
      notify({ title: "Category name required", variant: "destructive" });
      return;
    }
    await onSave({
      name: draft.name.trim(),
      slug: draft.slug.trim() || null,
      type: draft.type,
      parent_slug: draft.parent_slug.trim() || null,
      sort_order: draft.sort_order.trim() ? Number(draft.sort_order) : null,
      is_active: true,
    });
    setDraft({ name: "", slug: "", type: "collection", parent_slug: "", sort_order: "" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Section
        title="Add category or filter"
        subtitle="Create storefront filters without touching code."
      >
        <div className="space-y-3">
          <AdminField label="Name">
            <input
              className="admin-input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </AdminField>
          <AdminField label="Slug">
            <input
              className="admin-input"
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              placeholder="auto from name"
            />
          </AdminField>
          <AdminField label="Type">
            <select
              className="admin-input"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            >
              <option value="collection">Collection</option>
              <option value="filter">Filter</option>
              <option value="audience">Audience</option>
            </select>
          </AdminField>
          <AdminField label="Parent">
            <select
              className="admin-input"
              value={draft.parent_slug}
              onChange={(e) => setDraft({ ...draft, parent_slug: e.target.value })}
            >
              <option value="">No parent</option>
              <option value="attars">Attars</option>
            </select>
          </AdminField>
          <AdminField label="Sort order">
            <input
              className="admin-input"
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
              inputMode="numeric"
            />
          </AdminField>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-button" onClick={save}>
              Save category
            </button>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={() => void onSeed()}
            >
              Seed defaults
            </button>
          </div>
        </div>
      </Section>

      <Section title="Categories" subtitle={`${categories.length} configured`}>
        <div className="grid gap-3 md:grid-cols-2">
          {[...CATEGORIES.map((item) => ({ ...item, type: "built-in" })), ...categories].map(
            (category) => {
              const key = "key" in category ? category.key : category.slug;
              const label = "label" in category ? category.label : category.name;
              const parent = "parent" in category ? category.parent : category.parent_slug;
              return (
                <article
                  key={`${key}-${label}`}
                  className="rounded-lg border border-[rgb(var(--vibe-border))] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="mt-1 text-xs text-[rgb(var(--vibe-muted))]">
                        {key}
                        {parent ? ` / ${parent}` : ""}
                      </p>
                    </div>
                    <span className="rounded bg-[rgb(var(--vibe-surface))] px-2 py-1 text-[11px] text-[rgb(var(--vibe-muted))]">
                      {productCount(key)} products
                    </span>
                  </div>
                  {"blurb" in category && (
                    <p className="mt-3 text-sm text-[rgb(var(--vibe-muted))]">{category.blurb}</p>
                  )}
                </article>
              );
            },
          )}
        </div>
      </Section>
    </div>
  );
}

function ShippingAdminPanel({
  rates,
  onSave,
}: {
  rates: ShippingRate[];
  onSave: (rate: ShippingRate, patch: Partial<ShippingRate>) => Promise<void>;
}) {
  return (
    <Section title="Shipping" subtitle="Manage carrier rates and fulfillment references.">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" data-testid="admin-shipping-table">
          <thead>
            <tr className="border-b border-[rgb(var(--vibe-border))] text-left text-[11px] uppercase tracking-[0.16em] text-[rgb(var(--vibe-muted))]">
              <th className="py-2 pr-3">Carrier</th>
              <th className="py-2 px-3">Zone</th>
              <th className="py-2 px-3">Method</th>
              <th className="py-2 px-3">Base</th>
              <th className="py-2 px-3">Per item</th>
              <th className="py-2 px-3">Per weight</th>
              <th className="py-2 pl-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <ShippingRateAdminRow key={rate.id} rate={rate} onSave={onSave} />
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function ShippingRateAdminRow({
  rate,
  onSave,
}: {
  rate: ShippingRate;
  onSave: (rate: ShippingRate, patch: Partial<ShippingRate>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    base_fee: String(rate.base_fee),
    per_item_fee: String(rate.per_item_fee),
    per_weight_fee: String(rate.per_weight_fee),
  });

  return (
    <tr className="border-b border-[rgb(var(--vibe-border))] last:border-0">
      <td className="py-3 pr-3 font-medium">{rate.carrier}</td>
      <td className="px-3 py-3">{rate.zone}</td>
      <td className="px-3 py-3">{rate.method}</td>
      <td className="px-3 py-3">
        <RateInput
          value={draft.base_fee}
          onChange={(value) => setDraft({ ...draft, base_fee: value })}
          onSave={() => onSave(rate, { base_fee: Number(draft.base_fee) || 0 })}
        />
      </td>
      <td className="px-3 py-3">
        <RateInput
          value={draft.per_item_fee}
          onChange={(value) => setDraft({ ...draft, per_item_fee: value })}
          onSave={() => onSave(rate, { per_item_fee: Number(draft.per_item_fee) || 0 })}
        />
      </td>
      <td className="px-3 py-3">
        <RateInput
          value={draft.per_weight_fee}
          onChange={(value) => setDraft({ ...draft, per_weight_fee: value })}
          onSave={() => onSave(rate, { per_weight_fee: Number(draft.per_weight_fee) || 0 })}
        />
      </td>
      <td className="py-3 pl-3">
        <button
          type="button"
          onClick={() => onSave(rate, { is_active: !rate.is_active })}
          className={cn(
            "h-8 rounded-md border px-3 text-xs font-medium",
            rate.is_active
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-[rgb(var(--vibe-border))] text-[rgb(var(--vibe-muted))]",
          )}
        >
          {rate.is_active ? "Active" : "Off"}
        </button>
      </td>
    </tr>
  );
}

function RateInput({
  value,
  onChange,
  onSave,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onSave}
      inputMode="numeric"
      className="h-8 w-20 rounded-md border border-[rgb(var(--vibe-border))] px-2 text-right font-mono text-xs outline-none focus:ring-1 focus:ring-zinc-500"
    />
  );
}

function ToggleButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-md border px-3 text-xs font-medium",
        active
          ? "border-zinc-300 bg-zinc-900 text-white"
          : "border-[rgb(var(--vibe-border))] text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-accent))]",
      )}
    >
      {active ? "On" : "Off"}
    </button>
  );
}

function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-[rgb(var(--vibe-muted))]">
        {label}
      </span>
      {children}
    </label>
  );
}

function categoryLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  return CATEGORIES.find((category) => category.key === normalized)?.label ?? value ?? "Unsorted";
}

function cleanImageUrl(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return raw.split("#")[0] || null;
}

function fallbackImagesForProduct(product: Partial<Pick<Product, "slug" | "name">>) {
  const slug = String(product.slug ?? "").toLowerCase();
  const name = String(product.name ?? "").toLowerCase();
  const fallback = storefrontCatalog.find((item) => {
    if (slug && item.id.toLowerCase() === slug) return true;
    return Boolean(name && item.name.toLowerCase() === name);
  });
  return fallback ? [fallback.image, ...(fallback.gallery ?? [])] : [];
}

function productImageUrls(
  product: Partial<Pick<Product, "cover_image_url" | "images" | "slug" | "name">>,
) {
  return Array.from(
    new Set(
      [
        product.cover_image_url,
        ...(Array.isArray(product.images) ? product.images : []),
        ...fallbackImagesForProduct(product),
      ]
        .map(cleanImageUrl)
        .filter(Boolean) as string[],
    ),
  );
}

function ProductThumb({ product }: { product: Product }) {
  const [src, setSrc] = useState<string | null>(productImageUrls(product)[0] ?? null);

  useEffect(() => {
    setSrc(productImageUrls(product)[0] ?? null);
  }, [product]);

  return (
    <div className="grid h-14 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-[rgb(var(--vibe-border))] bg-[rgb(var(--vibe-surface))]">
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setSrc(null)}
        />
      ) : (
        <Package className="h-4 w-4 text-[rgb(var(--vibe-muted))]" />
      )}
    </div>
  );
}

function ProductDrawer({
  product,
  onClose,
  onSaved,
}: {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? "",
    slug: product?.slug ?? null,
    product_type: product?.product_type ?? "Unisex Attar",
    mood: product?.mood ?? "",
    scent_profile: product?.scent_profile ?? "",
    hook: product?.hook ?? product?.short_description ?? "",
    story: product?.story ?? product?.description ?? "",
    meaning: product?.meaning ?? "",
    key_notes: product?.key_notes ?? [],
    occasion: product?.occasion ?? "",
    intensity: product?.intensity ?? "",
    longevity: product?.longevity ?? "",
    volume_label: product?.volume_label ?? "6 ml",
    format_label: product?.format_label ?? "Roll-on attar",
    country_of_origin: product?.country_of_origin ?? "India",
    faqs: product?.faqs ?? [],
    seo_title: product?.seo_title ?? "",
    seo_description: product?.seo_description ?? "",
    seo_keywords: product?.seo_keywords ?? [],
    og_image_url: product?.og_image_url ?? "",
    sort_order: product?.sort_order ?? null,
    short_description: product?.short_description ?? product?.hook ?? "",
    description: product?.description ?? product?.story ?? "",
    price_inr: product?.price_inr ?? 0,
    sale_price_inr: product?.sale_price_inr ?? null,
    category: product?.category ?? CATEGORIES[0].label,
    category_id: product?.category_id ?? CATEGORIES[0].key,
    cover_image_url: product?.cover_image_url ?? null,
    images: product?.images ?? [],
    linked_product_ids: product?.linked_product_ids ?? [],
    variant_label: product?.variant_label ?? "",
    color_options: product?.color_options ?? [],
    size_options: product?.size_options ?? ["6 ml roll-on"],
    badge: product?.badge ?? null,
    stock_quantity: product?.stock_quantity ?? 0,
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    show_in_category_section: product?.show_in_category_section ?? true,
    is_bestseller: product?.is_bestseller ?? false,
    is_new_arrival: product?.is_new_arrival ?? false,
    is_on_sale: product?.is_on_sale ?? false,
    tags: product?.tags ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkedIds, setLinkedIds] = useState((product?.linked_product_ids ?? []).join(", "));
  const drawerImages = useMemo(
    () =>
      Array.from(
        new Set(
          [
            form.cover_image_url,
            ...(Array.isArray(form.images) ? form.images : []),
            ...fallbackImagesForProduct(product ?? { name: form.name, slug: form.slug }),
          ]
            .map(cleanImageUrl)
            .filter(Boolean) as string[],
        ),
      ),
    [form.cover_image_url, form.images, form.name, form.slug, product],
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(
    product ? (productImageUrls(product)[0] ?? null) : null,
  );
  const activeImage = selectedImage ?? drawerImages[0] ?? null;
  const coverImage = cleanImageUrl(form.cover_image_url) ?? null;

  useEffect(() => {
    if (!selectedImage && drawerImages[0]) setSelectedImage(drawerImages[0]);
    if (selectedImage && drawerImages.length && !drawerImages.includes(selectedImage)) {
      setSelectedImage(drawerImages[0] ?? null);
    }
  }, [drawerImages, selectedImage]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      if (url) {
        const cleanUrl = cleanImageUrl(url) ?? url;
        setForm((f) => ({
          ...f,
          cover_image_url: cleanUrl,
          images: Array.from(new Set([cleanUrl, ...(f.images ?? [])])),
        }));
        setSelectedImage(cleanUrl);
        notify({ title: "Image uploaded" });
      } else {
        notify({
          title: "Upload failed",
          description: "Check the storage bucket exists and has admin write access.",
          variant: "destructive",
        });
      }
    } catch (error) {
      notify({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload this file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const savedImages = Array.from(
        new Set(
          [
            activeImage,
            form.cover_image_url,
            ...(Array.isArray(form.images) ? form.images : []),
            ...fallbackImagesForProduct(product ?? form),
          ]
            .map(cleanImageUrl)
            .filter(Boolean) as string[],
        ),
      );
      const payload = {
        ...form,
        price: form.price_inr,
        short_description: form.hook || form.short_description || null,
        description: form.story || form.description || null,
        cover_image_url: coverImage ?? cleanImageUrl(activeImage) ?? savedImages[0] ?? null,
        images: savedImages,
        category:
          CATEGORIES.find((category) => category.key === form.category_id)?.label ??
          form.category ??
          CATEGORIES[0].label,
        linked_product_ids: linkedIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
        faqs: (form.faqs ?? []).filter(
          (faq) => faq.question.trim().length > 0 && faq.answer.trim().length > 0,
        ),
      };
      const result = product
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);
      if (result) {
        await refreshPublicCatalog(result);
        notify({ title: product ? "Product updated" : "Product created" });
        await onSaved();
      } else {
        notify({ title: "Could not save product", variant: "destructive" });
      }
    } catch (error) {
      notify({
        title: "Could not save product",
        description:
          error instanceof Error ? error.message : "Please check the product fields and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="admin-drawer-backdrop fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="admin-drawer-panel absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto bg-background p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {product ? "Edit product" : "New product"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            data-testid="admin-product-drawer-close-button"
            className="h-9 w-9 grid place-items-center rounded-md hover:bg-foreground/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <span className="block text-xs font-medium text-foreground/70 mb-1.5">Cover image</span>
            <div className="grid gap-3 sm:grid-cols-[132px_1fr]">
              <div className="min-w-0">
                <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-placeholder">
                  {activeImage ? (
                    <img
                      src={activeImage}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => setSelectedImage(null)}
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-foreground/30">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-foreground/55">
                  {coverImage ? "Cover image selected" : "No cover selected"}
                </p>
                {drawerImages.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {drawerImages.slice(0, 8).map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => {
                          setSelectedImage(url);
                        }}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-md border bg-white",
                          activeImage === url
                            ? "border-[#111827] ring-2 ring-[#111827]/10"
                            : "border-border",
                        )}
                        aria-label={
                          coverImage === url ? "Current cover image" : "Preview this product image"
                        }
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        {coverImage === url && (
                          <span className="absolute left-1 top-1 rounded bg-[#111827] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                            Cover
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="inline-flex items-center gap-2 text-sm rounded-md border border-border px-3 py-2 cursor-pointer hover:border-brand transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    data-testid="admin-product-image-file-input"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                  />
                </label>
                <input
                  type="url"
                  value={cleanImageUrl(form.cover_image_url) ?? ""}
                  data-testid="admin-product-image-url-input"
                  onChange={(e) => {
                    const url = cleanImageUrl(e.target.value);
                    setForm({
                      ...form,
                      cover_image_url: url,
                      images: url
                        ? Array.from(new Set([url, ...(form.images ?? [])]))
                        : form.images,
                    });
                    setSelectedImage(url);
                  }}
                  placeholder="…or paste image URL"
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <button
                  type="button"
                  disabled={!activeImage || coverImage === activeImage}
                  onClick={() => {
                    if (!activeImage) return;
                    setForm((f) => ({
                      ...f,
                      cover_image_url: activeImage,
                      images: Array.from(new Set([activeImage, ...(f.images ?? [])])),
                    }));
                  }}
                  className="mt-2 inline-flex h-9 items-center justify-center rounded-md bg-[#111827] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                >
                  {activeImage && coverImage === activeImage
                    ? "Selected as cover"
                    : "Set selected as cover"}
                </button>
                {activeImage && (
                  <a
                    href={activeImage}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-medium text-foreground/60 underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Open image
                  </a>
                )}
              </div>
            </div>
          </div>

          <Field
            label="Name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Slug"
              value={form.slug ?? ""}
              onChange={(v) => setForm({ ...form, slug: v || null })}
              placeholder="auto"
            />
            <SelectField
              label="Category"
              value={form.category_id ?? CATEGORIES[0].key}
              onChange={(v) =>
                setForm({
                  ...form,
                  category_id: v,
                  category: CATEGORIES.find((category) => category.key === v)?.label ?? v,
                })
              }
              options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Product type"
              value={form.product_type ?? ""}
              onChange={(v) => setForm({ ...form, product_type: v || null })}
              placeholder="Unisex Attar"
            />
            <Field
              label="Scent profile"
              value={form.scent_profile ?? ""}
              onChange={(v) => setForm({ ...form, scent_profile: v || null })}
              placeholder="Deep · Warm · Commanding"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Mood"
              value={form.mood ?? ""}
              onChange={(v) => setForm({ ...form, mood: v || null })}
              placeholder="Evenings · Late nights"
            />
            <Field
              label="Key notes"
              value={(form.key_notes ?? []).join(", ")}
              onChange={(v) =>
                setForm({
                  ...form,
                  key_notes: v
                    .split(",")
                    .map((note) => note.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Oud, saffron, rose"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label="Price (INR)"
              value={form.price_inr}
              onChange={(v) => setForm({ ...form, price_inr: v })}
              required
            />
            <NumberField
              label="Sale price (INR)"
              value={form.sale_price_inr ?? 0}
              onChange={(v) =>
                setForm({
                  ...form,
                  sale_price_inr: v > 0 ? v : null,
                  is_on_sale: v > 0,
                })
              }
            />
            <NumberField
              label="Stock"
              value={form.stock_quantity ?? 0}
              onChange={(v) => setForm({ ...form, stock_quantity: v })}
            />
            <Field
              label="Badge"
              value={form.badge ?? ""}
              onChange={(v) => setForm({ ...form, badge: v || null })}
              placeholder="e.g. Bestseller"
            />
            <NumberField
              label="Sort order"
              value={form.sort_order ?? 0}
              onChange={(v) => setForm({ ...form, sort_order: v })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-foreground/[0.015] p-3">
            <Field
              label="Variant label"
              value={form.variant_label ?? ""}
              onChange={(v) => setForm({ ...form, variant_label: v || null })}
              placeholder="Concentration or bottle version"
            />
            <Field
              label="Linked product IDs"
              value={linkedIds}
              onChange={setLinkedIds}
              placeholder="Paste product IDs separated by commas"
            />
            <p className="text-xs text-foreground/55">
              Connect separate products that belong to the same fragrance family or bottle version.
            </p>
          </div>

          <TextAreaField
            label="Product hook"
            value={form.hook ?? ""}
            onChange={(v) => setForm({ ...form, hook: v || null })}
            rows={2}
          />
          <TextAreaField
            label="Product story"
            value={form.story ?? ""}
            onChange={(v) => setForm({ ...form, story: v || null })}
            rows={5}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Meaning"
              value={form.meaning ?? ""}
              onChange={(v) => setForm({ ...form, meaning: v || null })}
            />
            <Field
              label="Occasion"
              value={form.occasion ?? ""}
              onChange={(v) => setForm({ ...form, occasion: v || null })}
              placeholder="Evening"
            />
            <Field
              label="Intensity"
              value={form.intensity ?? ""}
              onChange={(v) => setForm({ ...form, intensity: v || null })}
              placeholder="Bold"
            />
            <Field
              label="Longevity"
              value={form.longevity ?? ""}
              onChange={(v) => setForm({ ...form, longevity: v || null })}
              placeholder="8+ hours"
            />
            <Field
              label="Volume"
              value={form.volume_label ?? ""}
              onChange={(v) => setForm({ ...form, volume_label: v || null })}
              placeholder="6 ml"
            />
            <Field
              label="Format"
              value={form.format_label ?? ""}
              onChange={(v) => setForm({ ...form, format_label: v || null })}
              placeholder="Roll-on attar"
            />
            <Field
              label="Country of origin"
              value={form.country_of_origin ?? ""}
              onChange={(v) => setForm({ ...form, country_of_origin: v || null })}
              placeholder="India"
            />
            <Field
              label="Size options"
              value={(form.size_options ?? []).join(", ")}
              onChange={(v) =>
                setForm({
                  ...form,
                  size_options: v
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
              placeholder="6 ml roll-on"
            />
            <Field
              label="Variant options"
              value={(form.color_options ?? []).join(", ")}
              onChange={(v) =>
                setForm({
                  ...form,
                  color_options: v
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Standard, gift box"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-foreground/[0.015] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/60">
              Product FAQs
            </p>
            {[0, 1, 2].map((index) => {
              const faq = form.faqs?.[index] ?? { question: "", answer: "" };
              return (
                <div
                  key={index}
                  className="grid gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <Field
                    label={`FAQ ${index + 1} question`}
                    value={faq.question}
                    onChange={(value) => {
                      const faqs = [...(form.faqs ?? [])];
                      faqs[index] = { ...faq, question: value };
                      setForm({ ...form, faqs });
                    }}
                  />
                  <TextAreaField
                    label={`FAQ ${index + 1} answer`}
                    value={faq.answer}
                    onChange={(value) => {
                      const faqs = [...(form.faqs ?? [])];
                      faqs[index] = { ...faq, answer: value };
                      setForm({ ...form, faqs });
                    }}
                    rows={2}
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-foreground/[0.015] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/60">
              Search and sharing
            </p>
            <Field
              label="SEO title"
              value={form.seo_title ?? ""}
              onChange={(v) => setForm({ ...form, seo_title: v || null })}
            />
            <TextAreaField
              label="SEO description"
              value={form.seo_description ?? ""}
              onChange={(v) => setForm({ ...form, seo_description: v || null })}
              rows={3}
            />
            <Field
              label="SEO keywords"
              value={(form.seo_keywords ?? []).join(", ")}
              onChange={(v) =>
                setForm({
                  ...form,
                  seo_keywords: v
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
            <Field
              label="Social image URL"
              type="url"
              value={form.og_image_url ?? ""}
              onChange={(v) => setForm({ ...form, og_image_url: v || null })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-border">
            <Toggle
              label="Active (visible)"
              value={form.is_active ?? true}
              onChange={(v) => setForm({ ...form, is_active: v })}
            />
            <Toggle
              label="Featured"
              value={form.is_featured ?? false}
              onChange={(v) => setForm({ ...form, is_featured: v })}
            />
            <Toggle
              label="Show in collection"
              value={form.show_in_category_section ?? true}
              onChange={(v) => setForm({ ...form, show_in_category_section: v })}
            />
            <Toggle
              label="Bestseller"
              value={form.is_bestseller ?? false}
              onChange={(v) => setForm({ ...form, is_bestseller: v })}
            />
            <Toggle
              label="New arrival"
              value={form.is_new_arrival ?? false}
              onChange={(v) => setForm({ ...form, is_new_arrival: v })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-background pb-1 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              data-testid="admin-product-drawer-cancel-button"
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-foreground/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="admin-product-save-button"
              className="rounded-md bg-brand text-brand-foreground text-sm font-semibold px-5 py-2 hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save product"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5 text-xs font-medium">{label}</span>
      <input
        {...props}
        value={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-input`}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand transition-colors"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5 text-xs font-medium">{label}</span>
      <input
        type="number"
        min={0}
        step="any"
        required={required}
        value={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-number-input`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand transition-colors"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5 text-xs font-medium">{label}</span>
      <textarea
        rows={rows}
        value={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-textarea`}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand transition-colors resize-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm">
      <span className="block text-foreground/70 mb-1.5 text-xs font-medium">{label}</span>
      <select
        value={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-select`}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-brand"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={value}
        data-testid={`admin-product-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-toggle`}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-brand h-4 w-4"
      />
      <span className="text-foreground/75">{label}</span>
    </label>
  );
}
