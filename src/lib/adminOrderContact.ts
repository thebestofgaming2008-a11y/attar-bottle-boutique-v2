import type { AdminOrder } from "@/services/adminService";

export type OrderContactSource = Pick<
  AdminOrder,
  "customer_name" | "customer_email" | "customer_phone" | "shipping_address"
>;

// Use the order's saved checkout snapshot, never the customer's current profile.
export function getOrderContact(order: OrderContactSource) {
  const address = order.shipping_address;
  return {
    name: order.customer_name?.trim() || address?.name?.trim() || "",
    email: order.customer_email?.trim() || address?.email?.trim() || "",
    phone: order.customer_phone?.trim() || address?.phone?.trim() || "",
  };
}
