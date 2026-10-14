import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AdminOrderCustomerDetails } from "../src/components/admin/AdminOrderCustomerDetails";
import { getOrderContact, type OrderContactSource } from "../src/lib/adminOrderContact";

const order: OrderContactSource = {
  customer_name: "Fixture Buyer",
  customer_email: "buyer@example.com",
  customer_phone: "+91 90000 00000",
  shipping_address: {
    name: "Fixture Recipient",
    phone: "+91 90000 00001",
    address_line_1: "42 Fixture Road",
    address_line_2: "Apartment 8, near the library",
    city: "New Delhi",
    state: "Delhi",
    postal_code: "110001",
    country: "India",
  },
};
const render = (value: OrderContactSource) =>
  renderToStaticMarkup(createElement(AdminOrderCustomerDetails, { order: value }));

test("admin order details show full saved delivery address and actionable contact details", () => {
  const html = render(order);
  for (const value of [
    "Customer contact",
    "Delivery address",
    order.customer_name!,
    order.customer_email!,
    order.customer_phone!,
    ...Object.values(order.shipping_address!),
  ]) {
    expect(html).toContain(value);
  }
  expect(html).toContain('href="tel:+919000000000"');
  expect(html).toContain('href="mailto:buyer@example.com"');
  expect(html).toContain("Delivery phone:");
  expect(html).not.toContain("truncate");
  expect(html).toContain("[overflow-wrap:anywhere]");
});

test("older orders and blank top-level fields fall back to the checkout snapshot", () => {
  const legacy = {
    customer_name: " ",
    customer_email: null,
    customer_phone: "\n",
    shipping_address: { ...order.shipping_address, email: "legacy@example.com" },
  };
  expect(getOrderContact(legacy)).toEqual({
    name: "Fixture Recipient",
    email: "legacy@example.com",
    phone: "+91 90000 00001",
  });
  const html = render(legacy);
  expect(html).toContain('href="tel:+919000000001"');
  expect(html).not.toContain("Delivery phone:");
});

test("missing data is explicit, without invented addresses or empty contact links", () => {
  const html = render({ customer_name: null, customer_phone: null, customer_email: null });
  expect(html).toContain("Phone number not saved");
  expect(html).toContain("Delivery address not saved on this order.");
  expect(html).not.toContain('href="tel:');
  expect(html).not.toContain('href="mailto:');
  expect(render({ ...order, shipping_address: { city: "Delhi" } })).toContain(
    "Street address is missing",
  );
});

test("customer content stays escaped and the saved order is never mutated", () => {
  const original = JSON.stringify(order);
  render(order);
  expect(JSON.stringify(order)).toBe(original);
  const html = render({
    ...order,
    shipping_address: { address_line_1: '<script>alert("x")</script>' },
  });
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});
