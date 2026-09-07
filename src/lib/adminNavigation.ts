import {
  LayoutDashboard,
  Store,
  Megaphone,
  ShoppingBag,
  Package,
  Boxes,
  Gift,
  Tags,
  Layers3,
  PackageOpen,
  TicketPercent,
  Truck,
  MessageSquare,
  Users,
  Settings,
} from "lucide-react";

// Keep grouping with each destination so new tabs cannot be silently filtered out.
export const ADMIN_NAV = [
  { key: "dash", label: "Dashboard", Icon: LayoutDashboard, group: "Commerce" },
  { key: "orders", label: "Orders", Icon: ShoppingBag, group: "Commerce" },
  { key: "products", label: "Products", Icon: Package, group: "Commerce" },
  { key: "inventory", label: "Inventory", Icon: Boxes, group: "Commerce" },
  { key: "homepage", label: "Homepage", Icon: Store, group: "Storefront" },
  { key: "announcement", label: "Top announcement bar", Icon: Megaphone, group: "Storefront" },
  { key: "categories", label: "Categories", Icon: Tags, group: "Storefront" },
  { key: "offers", label: "Build your own combo", Icon: Layers3, group: "Offers" },
  { key: "combos", label: "Ready-made packs", Icon: PackageOpen, group: "Offers" },
  { key: "gifts", label: "Gifts", Icon: Gift, group: "Offers" },
  { key: "coupons", label: "Coupons", Icon: TicketPercent, group: "Offers" },
  { key: "customers", label: "Customers", Icon: Users, group: "Management" },
  { key: "reviews", label: "Reviews", Icon: MessageSquare, group: "Management" },
  { key: "shipping", label: "Shipping", Icon: Truck, group: "Management" },
  { key: "settings", label: "Settings", Icon: Settings, group: "Management" },
] as const;

export type AdminTabKey = (typeof ADMIN_NAV)[number]["key"];

export const ADMIN_NAV_GROUPS = [...new Set(ADMIN_NAV.map((item) => item.group))].map((label) => ({
  label,
  items: ADMIN_NAV.filter((item) => item.group === label),
}));

export function isComboProduct(product: { bundle_kind?: string | null }) {
  return product.bundle_kind === "combo" || product.bundle_kind === "pack";
}
