import { createFileRoute } from "@tanstack/react-router";
import { InformationPage } from "@/components/store/InformationPage";
import { SITE_ORIGIN, serializeJsonLd, socialMeta } from "@/lib/seo";

const URL = `${SITE_ORIGIN}/returns`;
const TITLE = "Returns, Refunds & Order Issues | BADR";
const DESCRIPTION =
  "How to report damaged, leaking or incorrect BADR orders and how approved refunds are handled.";

export const Route = createFileRoute("/returns")({
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
  component: ReturnsPage,
});

function ReturnsPage() {
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
        eyebrow="Order support"
        title="Returns & refunds."
        intro="If an order arrives damaged, leaking or different from the confirmed order, contact BADR before sending anything back."
        updated="31 August 2026"
        sections={[
          {
            title: "Report the issue",
            paragraphs: [
              "Contact BADR as soon as you reasonably can after delivery. Include the order number, the email or telephone number used at checkout, a clear description of the issue and photographs where they help show damage, leakage or an incorrect item.",
              { label: "Report an order issue", href: "https://wa.me/919073215410" },
            ],
          },
          {
            title: "Before returning",
            paragraphs: [
              "Do not send a product back without written confirmation from BADR. Support will review the order record and explain whether a return, replacement, refund or another remedy applies to the circumstances.",
              "Eligibility can depend on the reason for the request, the product condition, the evidence available and rights that apply under consumer law.",
            ],
          },
          {
            title: "Approved refunds",
            paragraphs: [
              "When a refund is approved for an India Razorpay order, BADR records the refund against the original order and payment. The time for funds to appear can depend on Razorpay, the payment method and the customer's bank or provider.",
              "A refund request or status message is not the same as completed settlement. Contact support if an approved refund does not appear after the payment provider's stated processing period.",
            ],
          },
          {
            title: "Consumer rights",
            paragraphs: [
              "Nothing on this page removes a remedy or right that cannot legally be excluded. BADR may request reasonable order information needed to investigate and prevent fraudulent claims.",
              { label: "Contact BADR", href: "/contact" },
            ],
          },
        ]}
      />
    </>
  );
}
