import { createFileRoute } from "@tanstack/react-router";
import { InformationPage } from "@/components/store/InformationPage";
import { ORGANIZATION_ID, SITE_ORIGIN, serializeJsonLd, socialMeta } from "@/lib/seo";

const URL = `${SITE_ORIGIN}/contact`;
const TITLE = "Contact BADR | Attar Order Support";
const DESCRIPTION =
  "Contact BADR for order, delivery, product and international attar enquiries by WhatsApp or email.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      ...socialMeta({ title: TITLE, description: DESCRIPTION, url: URL, imageAlt: "BADR attar" }),
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: URL,
    name: TITLE,
    description: DESCRIPTION,
    about: { "@id": ORGANIZATION_ID },
    inLanguage: "en-IN",
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <InformationPage
        eyebrow="Customer care"
        title="Talk to BADR."
        intro="For product questions, an existing order, delivery support or an international order, contact the BADR team directly."
        sections={[
          {
            title: "WhatsApp",
            paragraphs: [
              "WhatsApp is the fastest contact route for product and international-order questions. Include your order number when contacting us about an existing purchase.",
              { label: "+91 90732 15410", href: "https://wa.me/919073215410" },
            ],
          },
          {
            title: "Email",
            paragraphs: [
              "For non-urgent support, send the name and email used for the order together with the order number.",
              { label: "houseofbadr@gmail.com", href: "mailto:houseofbadr@gmail.com" },
            ],
          },
          {
            title: "Self-service",
            paragraphs: [
              "Paid India orders can be checked using the order number and customer email on the tracking page.",
              { label: "Track an order", href: "/track-order" },
            ],
          },
        ]}
      />
    </>
  );
}
