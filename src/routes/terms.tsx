import { createFileRoute } from "@tanstack/react-router";
import { InformationPage } from "@/components/store/InformationPage";
import { SITE_ORIGIN, serializeJsonLd, socialMeta } from "@/lib/seo";

const URL = `${SITE_ORIGIN}/terms`;
const TITLE = "Website & Purchase Terms | BADR";
const DESCRIPTION =
  "Terms governing use of the BADR website, India checkout, international enquiries, products and customer accounts.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      ...socialMeta({
        title: TITLE,
        description: DESCRIPTION,
        url: URL,
        imageAlt: "BADR wordmark",
      }),
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en-IN",
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <InformationPage
        eyebrow="Store terms"
        title="Clear purchase terms."
        intro="These terms apply when you use houseofbadr.com, create an account, submit an India checkout or contact BADR about an international order."
        updated="31 August 2026"
        sections={[
          {
            title: "The storefront",
            paragraphs: [
              "BADR aims to keep product descriptions, scent notes, images, prices and availability accurate. Screen settings, lighting and individual fragrance perception can affect how a product appears or is experienced.",
              "You must provide accurate checkout, contact and delivery information and keep account access secure.",
            ],
          },
          {
            title: "India checkout",
            paragraphs: [
              "India prices are displayed in INR and include India delivery unless the checkout clearly states otherwise. Currency conversions shown elsewhere are estimates based on live exchange-rate information.",
              "Submitting payment does not override catalog validation. An order is accepted after the payment is verified and the order is created. Duplicate, failed, unsigned or unverified payment callbacks are not treated as paid orders.",
            ],
          },
          {
            title: "International requests",
            paragraphs: [
              "International checkout creates a WhatsApp enquiry rather than an automatic paid order. Availability, shipping, payment and any destination-specific terms must be confirmed directly before an international order exists.",
            ],
          },
          {
            title: "Acceptable use",
            paragraphs: [
              "Do not misuse the site, attempt unauthorized access, interfere with checkout or security systems, submit fraudulent information, reproduce BADR branding without permission, or use automated activity that harms the service or other customers.",
            ],
          },
          {
            title: "Problems with an order",
            paragraphs: [
              "Contact BADR promptly with the order number if an item arrives damaged, leaking or different from the confirmed order. Do not send a product back without contacting BADR first so the issue and appropriate next step can be recorded.",
              "Nothing in these terms removes rights that cannot legally be excluded under applicable consumer law.",
              { label: "Read the returns and refunds process", href: "/returns" },
              { label: "Contact customer care", href: "/contact" },
            ],
          },
          {
            title: "Changes",
            paragraphs: [
              "BADR may update these terms when the storefront, operations or legal requirements change. The version displayed when an order is placed applies to that order, subject to applicable law.",
            ],
          },
        ]}
      />
    </>
  );
}
