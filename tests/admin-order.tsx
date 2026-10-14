// Presentation fixture only. No backend calls or real customer data.
import React from "react";
import { createRoot } from "react-dom/client";
import { AdminOrderCustomerDetails } from "../src/components/admin/AdminOrderCustomerDetails";
import "../src/styles.css";

createRoot(document.getElementById("root")!).render(
  <main className="vibe-admin admin-vibe min-h-screen bg-background p-4 text-foreground">
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">Order details — layout test</h1>
      <div className="rounded-lg border border-border p-4">
        <AdminOrderCustomerDetails
          order={{
            customer_name: "Fixture Buyer",
            customer_email: "fixture.customer.with.a.long.email.address@example.com",
            customer_phone: "+91 90000 00000",
            shipping_address: {
              name: "Fixture Recipient",
              address_line_1: "Apartment 123, Example Residence, 42 Example Road",
              address_line_2: "Second floor, opposite the library, entrance beside the garden",
              city: "New Delhi",
              state: "Delhi",
              postal_code: "110001",
              country: "India",
            },
          }}
        />
      </div>
      <AdminOrderCustomerDetails
        order={{ customer_name: null, customer_email: null, customer_phone: null }}
      />
    </div>
  </main>,
);
