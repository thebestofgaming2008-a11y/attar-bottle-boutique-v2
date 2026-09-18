// @vitest-environment node
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JOURNAL_ARTICLES } from "../src/lib/journal";

const state = vi.hoisted(() => ({ articleIndex: 0 }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
    useLoaderData: () => ({ article: JOURNAL_ARTICLES[state.articleIndex] }),
  }),
  notFound: () => new Error("Not found"),
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
  }) =>
    createElement(
      "a",
      {
        ...props,
        href: Object.entries(params ?? {}).reduce(
          (url, [key, value]) => url.replace(`$${key}`, value),
          to,
        ),
      },
      children,
    ),
}));

vi.mock("../src/components/store/StoreShell", () => ({
  StoreShell: ({ children }: { children: ReactNode }) => children,
  SiteFooter: () => null,
}));

import { InformationPage } from "../src/components/store/InformationPage";
import { Route as ArticleRoute } from "../src/routes/journal_.$slug";
import { Route as JournalRoute } from "../src/routes/journal";
import { Route as AboutRoute } from "../src/routes/about";

describe("mobile editorial page rendering", () => {
  it.each(JOURNAL_ARTICLES.map((article, index) => [article.slug, index] as const))(
    "preserves content and structured data for %s",
    (_slug, index) => {
      state.articleIndex = index;
      const article = JOURNAL_ARTICLES[index];
      const html = renderToStaticMarkup(
        createElement(ArticleRoute.options.component as ComponentType),
      );
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toContain("text-[clamp(2rem,8.5vw,2.5rem)]");
      expect(html).toContain("[overflow-wrap:anywhere]");
      expect(html).toContain("text-base leading-7");
      expect(html).toContain('aria-label="Breadcrumb"');
      expect(html).toContain(`dateTime="${article.updated}"`);
      for (const section of article.sections) {
        expect(html).toContain(section.heading.replaceAll("&", "&amp;"));
      }
      const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
      const schema = JSON.parse(json!);
      expect(schema["@graph"][0].headline).toBe(article.title);
      expect(schema["@graph"][0]["@type"]).toBe("Article");
      expect(schema["@graph"][2]["@type"]).toBe("BreadcrumbList");
      expect(html).not.toContain("text-[10px]");
    },
  );

  it("keeps all guides discoverable from the journal", () => {
    const html = renderToStaticMarkup(
      createElement(JournalRoute.options.component as ComponentType),
    );
    for (const article of JOURNAL_ARTICLES) {
      expect(html).toContain(`href="/journal/${article.slug}"`);
    }
    expect(html).toContain("bg-white py-8 sm:min-h-72 sm:p-10");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it("keeps long contact links, lists and policy headings inside flexible columns", () => {
    const html = renderToStaticMarkup(
      createElement(InformationPage, {
        eyebrow: "Customer care",
        title: "Shipping and delivery",
        intro: "Delivery information.",
        sections: [
          {
            title: "International enquiries",
            paragraphs: [
              "Talk to us before placing an order.",
              {
                label: "averylongemailaddress@example.com",
                href: "mailto:averylongemailaddress@example.com",
              },
            ],
            bullets: ["Availability is confirmed before payment."],
          },
        ],
      }),
    );
    expect(html).toContain("[overflow-wrap:anywhere]");
    expect(html).toContain("minmax(0,0.7fr)_minmax(0,1.3fr)");
    expect(html).toContain('href="mailto:averylongemailaddress@example.com"');
    expect(html).toContain("<li>Availability is confirmed before payment.</li>");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it("retains About page shopping links and its dark signature section", () => {
    const html = renderToStaticMarkup(createElement(AboutRoute.options.component as ComponentType));
    expect(html).toContain('href="/shop"');
    expect(html).toContain('href="https://wa.me/919073215410"');
    expect(html).toContain("bg-black px-5 py-10 text-white");
    expect(html).toContain("text-base leading-7");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });
});
