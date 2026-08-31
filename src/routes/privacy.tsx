import { createFileRoute } from "@tanstack/react-router";
import { InformationPage } from "@/components/store/InformationPage";
import { SITE_ORIGIN, serializeJsonLd, socialMeta } from "@/lib/seo";

const URL = `${SITE_ORIGIN}/privacy`;
const TITLE = "Privacy Notice | BADR";
const DESCRIPTION =
  "How BADR handles customer, account, checkout, order, support and website information.";

export const Route = createFileRoute("/privacy")({
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
  component: PrivacyPage,
});

function PrivacyPage() {
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
        eyebrow="Your information"
        title="Privacy notice."
        intro="This notice explains the information used to operate the BADR website, accounts, checkout, payments, orders, support and verified reviews."
        updated="31 August 2026"
        sections={[
          {
            title: "Information collected",
            paragraphs: [
              "Depending on how you use the site, BADR may receive your name, email address, telephone number, shipping address, saved addresses, account details, cart, selected product options, order history, support messages, review content, approximate country and technical security information.",
              "Payment providers send BADR payment references and status. BADR does not receive or store your complete card, bank or UPI credentials.",
            ],
          },
          {
            title: "Why it is used",
            paragraphs: [
              "Information is used to provide accounts, validate checkout, process and fulfil orders, communicate tracking, respond to support, prevent abuse, maintain security, display approved verified-purchase reviews and meet applicable legal or accounting duties.",
            ],
          },
          {
            title: "Service providers",
            paragraphs: [
              "BADR uses service providers to run the store, including Cloudflare for website delivery and media, Convex for application data and authentication, Razorpay for India payments, email infrastructure for account and order messages, and carriers or fulfilment providers when an order is shipped.",
              "Those providers may process limited information needed to perform their service under their own security and privacy terms.",
            ],
          },
          {
            title: "Storage on your device",
            paragraphs: [
              "The site uses browser storage for functions such as the shopping bag, selected currency and account session. Security services may also process technical information to protect forms and checkout from abuse. BADR does not currently place third-party advertising trackers on the storefront.",
            ],
          },
          {
            title: "Retention & choices",
            paragraphs: [
              "Information is retained only for as long as reasonably needed for the purpose it was collected, store operations, dispute handling, fraud prevention and applicable legal or accounting requirements.",
              "To ask about your information, correct account details or request deletion where applicable, contact BADR. Some order and transaction records may need to be retained where the law requires it.",
              {
                label: "Contact BADR about privacy",
                href: "mailto:houseofbadr@gmail.com?subject=BADR%20privacy%20request",
              },
            ],
          },
        ]}
      />
    </>
  );
}
