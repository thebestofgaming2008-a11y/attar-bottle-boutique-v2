import { createFileRoute } from "@tanstack/react-router";
import { InformationPage } from "@/components/store/InformationPage";
import { SITE_ORIGIN, serializeJsonLd, socialMeta } from "@/lib/seo";
import { DELIVERY_TEXT, DISPATCH_TEXT, MERCHANT_POLICY_UPDATED } from "@/lib/merchantPolicy";

const URL = `${SITE_ORIGIN}/shipping`;
const TITLE = "Shipping & Delivery | BADR Attar";
const DESCRIPTION =
  "BADR dispatches orders within 24–48 hours after payment confirmation. India delivery is included and takes 5 working days after dispatch.";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      ...socialMeta({
        title: TITLE,
        description: DESCRIPTION,
        url: URL,
        imageAlt: "BADR attar delivery",
      }),
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en-IN",
    dateModified: MERCHANT_POLICY_UPDATED,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <InformationPage
        eyebrow="Orders & delivery"
        title="Shipping, clearly."
        intro="India delivery is included in each displayed product price. International shipping and payment are confirmed personally before an order is agreed."
        updated="11 October 2026"
        sections={[
          {
            title: "India orders",
            paragraphs: [
              DISPATCH_TEXT,
              DELIVERY_TEXT,
              "The 5-working-day delivery period starts after dispatch, not when the order is placed. Dispatch time is additional to delivery time.",
              "India customers complete payment through Razorpay. The amount shown at checkout is validated against the live BADR catalog before payment, and India delivery is included in the displayed product price.",
              "An order is confirmed only after payment has been verified. Keep the order number and the email used during checkout for tracking and support.",
            ],
          },
          {
            title: "Tracking",
            paragraphs: [
              "When the order is fulfilled, BADR can add the carrier, tracking number and tracking link to the order. Customers can check the latest recorded status using the tracking page.",
              { label: "Track an order", href: "/track-order" },
            ],
          },
          {
            title: "International orders",
            paragraphs: [
              "International checkout does not take an automatic Razorpay payment. It prepares a WhatsApp request containing the selected products and delivery details so BADR can confirm availability, international shipping and payment directly.",
              { label: "Ask about international delivery", href: "https://wa.me/919073215410" },
            ],
          },
          {
            title: "Delivery support",
            paragraphs: [
              "If tracking has not updated or delivery appears delayed, contact BADR with the order number so we can check with the carrier.",
              { label: "Contact BADR", href: "/contact" },
            ],
          },
        ]}
      />
    </>
  );
}
