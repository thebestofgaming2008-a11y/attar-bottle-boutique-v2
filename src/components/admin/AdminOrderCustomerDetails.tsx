import { getOrderContact, type OrderContactSource } from "@/lib/adminOrderContact";

export function AdminOrderCustomerDetails({ order }: { order: OrderContactSource }) {
  const contact = getOrderContact(order);
  const address = order.shipping_address;
  const recipient = address?.name?.trim() || contact.name;
  const deliveryPhone = address?.phone?.trim();
  const addressLines = [
    address?.address_line_1?.trim(),
    address?.address_line_2?.trim(),
    [address?.city?.trim(), address?.state?.trim()].filter(Boolean).join(", "),
    address?.postal_code?.trim(),
    address?.country?.trim(),
  ].filter((line): line is string => Boolean(line));
  const phoneHref = contact.phone.replace(/[^+\d]/g, "");

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2" data-testid="admin-order-customer-details">
      <section
        aria-label="Customer contact"
        className="min-w-0 space-y-3 rounded-md border border-border bg-background p-4"
      >
        <h3 className="text-sm font-semibold">Customer contact</h3>
        <p className="select-text break-words text-sm">{contact.name || "Name not saved"}</p>
        <dl className="space-y-3 text-sm">
          <div className="min-w-0">
            <dt className="text-xs text-foreground/60">Phone</dt>
            <dd className="mt-1 select-text [overflow-wrap:anywhere]">
              {phoneHref ? (
                <a
                  href={`tel:${phoneHref}`}
                  className="inline-block py-1 font-medium underline underline-offset-4"
                >
                  {contact.phone}
                </a>
              ) : (
                "Phone number not saved"
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-foreground/60">Email</dt>
            <dd className="mt-1 select-text [overflow-wrap:anywhere]">
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-block py-1 underline underline-offset-4"
                >
                  {contact.email}
                </a>
              ) : (
                "Email not saved"
              )}
            </dd>
          </div>
        </dl>
      </section>
      <section
        aria-label="Delivery address"
        className="min-w-0 space-y-3 rounded-md border border-border bg-background p-4"
      >
        <h3 className="text-sm font-semibold">Delivery address</h3>
        {addressLines.length > 0 ? (
          <address className="select-text text-sm not-italic leading-relaxed [overflow-wrap:anywhere]">
            {recipient && <p className="mb-1 font-medium">{recipient}</p>}
            {addressLines.map((line, index) => (
              <p key={index} className="whitespace-pre-line">
                {line}
              </p>
            ))}
            {deliveryPhone && deliveryPhone !== contact.phone && (
              <p className="mt-2">Delivery phone: {deliveryPhone}</p>
            )}
          </address>
        ) : (
          <p className="text-sm text-foreground/65">Delivery address not saved on this order.</p>
        )}
        {addressLines.length > 0 && !address?.address_line_1?.trim() && (
          <p className="text-xs text-amber-800">
            Street address is missing. Confirm it with the customer before shipping.
          </p>
        )}
      </section>
    </div>
  );
}
