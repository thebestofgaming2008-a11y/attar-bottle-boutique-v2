import { api } from "../../convex/_generated/api";
import { convex } from "@/integrations/convex/client";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  marketing_consent: boolean | null;
  preferred_currency: string | null;
  total_orders: number | null;
  total_spent: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Address {
  id: string;
  user_id: string;
  type: string | null;
  is_default: boolean | null;
  full_name: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string | null;
  product_image_url: string | null;
  selected_color?: string | null;
  selected_size?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string | null;
  user_id: string | null;
  status: string | null;
  payment_status: string | null;
  subtotal: number;
  tax: number | null;
  shipping_cost: number | null;
  discount: number | null;
  total: number;
  total_inr: number | null;
  currency: string | null;
  created_at: string | null;
  items?: OrderItem[];
}

export async function getProfile(userId: string): Promise<Profile | null> {
  void userId;
  return (await convex.query(api.users.currentProfile, {})) as Profile | null;
}

export async function upsertProfile(
  userId: string,
  email: string | null,
  patch: Partial<Profile>,
): Promise<Profile | null> {
  void userId;
  void email;
  return (await convex.mutation(api.users.updateProfile, patch)) as Profile | null;
}

export async function listAddresses(userId: string): Promise<Address[]> {
  void userId;
  return (await convex.query(api.addresses.listMine, {})) as Address[];
}

export async function createAddress(
  userId: string,
  payload: Partial<Address>,
): Promise<Address | null> {
  void userId;
  return (await convex.mutation(api.addresses.create, { payload })) as Address | null;
}

export async function updateAddress(id: string, patch: Partial<Address>): Promise<Address | null> {
  return (await convex.mutation(api.addresses.update, { id, patch })) as Address | null;
}

export async function deleteAddress(id: string): Promise<boolean> {
  return await convex.mutation(api.addresses.remove, { id });
}

export async function setDefaultAddress(userId: string, id: string): Promise<boolean> {
  void userId;
  return await convex.mutation(api.addresses.setDefault, { id });
}

export async function listUserOrders(userId: string): Promise<Order[]> {
  void userId;
  return (await convex.query(api.orders.listMine, {})) as Order[];
}
