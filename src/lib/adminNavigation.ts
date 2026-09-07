import {
  LayoutDashboard,
  Store,
  Megaphone,
  ShoppingBag,
  Package,
  Boxes,
  Gift,
  Tag,
  Truck,
  MessageSquare,
  Users,
  Settings,
} from "lucide-react";

// Keep grouping with each destination so new tabs cannot be silently filtered out.
export const ADMIN_NAV = [
  { key: "dash", label: "Dashboard", Icon: LayoutDashboard, group: "Overview" },
  { key: "homepage", label: "Homepage", Icon: Store, group: "Storefront" },
  { key: "announcement", label: "Top announcement bar", Icon: Megaphone, group: "Storefront" },
  { key: "orders", label: "Orders", Icon: ShoppingBag, group: "Commerce" },
  { key: "products", label: "Products", Icon: Package, group: "Commerce" },
  { key: "combos", label: "Combos & packs", Icon: Boxes, group: "Commerce" },
  { key: "inventory", label: "Inventory", Icon: Boxes, group: "Commerce" },
  { key: "categories", label: "Categories", Icon: Tag, group: "Commerce" },
  { key: "shipping", label: "Shipping", Icon: Truck, group: "Commerce" },
  { key: "gifts", label: "Gifts", Icon: Gift, group: "Offers" },
  { key: "offers", label: "Bundle discounts", Icon: Boxes, group: "Offers" },
  { key: "coupons", label: "Coupons", Icon: Tag, group: "Offers" },
  { key: "customers", label: "Customers", Icon: Users, group: "People" },
  { key: "reviews", label: "Reviews", Icon: MessageSquare, group: "People" },
  { key: "settings", label: "Settings", Icon: Settings, group: "System" },
] as const;

export type AdminTabKey = (typeof ADMIN_NAV)[number]["key"];

export const ADMIN_NAV_GROUPS = [...new Set(ADMIN_NAV.map((item) => item.group))].map((label) => ({
  label,
  items: ADMIN_NAV.filter((item) => item.group === label),
}));

export function isComboProduct(product: { bundle_kind?: string | null }) {
  return product.bundle_kind === "combo" || product.bundle_kind === "pack";
}
