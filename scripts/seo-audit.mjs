// Read-only, raw-HTML audit: verifies what crawlers receive without JavaScript.
const base = new URL(process.argv[2] || "https://houseofbadr.com");
const canonicalOrigin = "https://houseofbadr.com";
let failures = 0;
const seenTitles = new Set();
const seenDescriptions = new Set();
const productOffers = new Map();
const internalPaths = new Set();
const decode = (text) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
const attrs = (tag) =>
  Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]));
const fetchPage = (path, redirect = "follow") =>
  fetch(new URL(path, base), { redirect, signal: AbortSignal.timeout(25000) });
const check = (condition, message, issues) => {
  if (!condition) issues.push(message);
};
const sitemapResponse = await fetchPage("/sitemap.xml");
if (!sitemapResponse.ok) throw new Error(`Sitemap HTTP ${sitemapResponse.status}`);
const sitemap = await sitemapResponse.text();
const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (m) => new URL(decode(m[1])).pathname,
);
if (!paths.length) throw new Error("Empty sitemap");
for (const path of paths) {
  const response = await fetchPage(path);
  const html = await response.text();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
  const issues = [];
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]*)"/g)) {
    try {
      const link = new URL(decode(match[1]), new URL(path, canonicalOrigin));
      if (link.origin === canonicalOrigin && !link.pathname.startsWith("/api/"))
        internalPaths.add(link.pathname);
    } catch {
      issues.push("Invalid internal URL");
    }
  }
  const titles = [...head.matchAll(/<title>(.*?)<\/title>/g)];
  const metas = [...head.matchAll(/<meta\b[^>]*>/g)].map((m) => attrs(m[0]));
  const descriptions = metas.filter((m) => m.name === "description");
  const canonicals = [...head.matchAll(/<link\b[^>]*>/g)]
    .map((m) => attrs(m[0]))
    .filter((a) => a.rel === "canonical");
  check(response.status === 200, `HTTP ${response.status}`, issues);
  check(titles.length === 1 && titles[0][1].length > 5, "Missing/duplicate title", issues);
  check(
    descriptions.length === 1 && descriptions[0].content?.length > 40,
    "Missing/duplicate description",
    issues,
  );
  check(
    canonicals.length === 1 &&
      new URL(canonicals[0].href).href === new URL(path, canonicalOrigin).href,
    "Incorrect canonical",
    issues,
  );
  check(
    !metas.some((m) => m.name === "robots" && /noindex/.test(m.content)),
    "Public noindex",
    issues,
  );
  check(
    !/noindex/.test(response.headers.get("x-robots-tag") || ""),
    "Public X-Robots noindex",
    issues,
  );
  check((html.match(/<h1\b/g) || []).length === 1, "Expected one H1", issues);
  const title = titles[0]?.[1];
  const description = descriptions[0]?.content;
  check(!seenTitles.has(title), "Reused title", issues);
  check(!seenDescriptions.has(description), "Reused description", issues);
  seenTitles.add(title);
  seenDescriptions.add(description);
  const graphs = [];
  for (const match of html.matchAll(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    try {
      const data = JSON.parse(match[1]);
      graphs.push(...(data["@graph"] || [data]));
    } catch {
      issues.push("Invalid JSON-LD");
    }
  }
  check(graphs.length > 0, "Missing JSON-LD", issues);
  if (path.startsWith("/product/")) {
    const product = graphs.find((g) => g["@type"] === "Product");
    check(
      Boolean(product?.name && product.image?.length && product.offers),
      "Missing Product offer/image",
      issues,
    );
    check(
      product?.offers?.priceCurrency === "INR" && Number(product?.offers?.price) > 0,
      "Invalid product price",
      issues,
    );
    check(product?.offers?.url === canonicals[0]?.href, "Offer URL differs from canonical", issues);
    const visibleReviewCount = (html.match(/<blockquote\b/g) || []).length;
    const reviewSchema = product?.review || [];
    if (visibleReviewCount === 0) {
      check(
        !product?.aggregateRating && reviewSchema.length === 0,
        "Ratings/reviews exist without visible customer reviews",
        issues,
      );
    } else {
      check(
        Number(product?.aggregateRating?.reviewCount) >= visibleReviewCount &&
          reviewSchema.length === visibleReviewCount,
        "Review markup does not match visible reviews",
        issues,
      );
      check(
        Number(product?.aggregateRating?.ratingValue) >= 1 &&
          Number(product?.aggregateRating?.ratingValue) <= 5,
        "Invalid aggregate rating",
        issues,
      );
    }
    console.log(
      `CHECK reviews ${path}: ${visibleReviewCount} visible, ${reviewSchema.length} marked up`,
    );
    if (product?.offers) productOffers.set(path, product.offers);
  }
  failures += issues.length;
  console.log(`${issues.length ? "FAIL" : "PASS"} ${path} ${issues.join("; ")}`);
}
for (const path of internalPaths) {
  if (
    paths.includes(path) ||
    /^\/(admin|account|checkout|track-order|order-confirmation)(\/|$)/.test(path)
  )
    continue;
  const response = await fetchPage(path);
  if (response.status >= 400) {
    failures++;
    console.log(`FAIL linked page ${path} HTTP ${response.status}`);
  }
}
const feedResponse = await fetchPage("/merchant-feed.xml");
const feed = await feedResponse.text();
const feedItems = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)];
const feedIssues = [];
check(feedResponse.status === 200, "Feed unavailable", feedIssues);
check(feedItems.length === productOffers.size, "Feed/catalog product count differs", feedIssues);
for (const [, item] of feedItems) {
  const link = item.match(/<link>(.*?)<\/link>/)?.[1];
  const offer = link ? productOffers.get(new URL(decode(link)).pathname) : undefined;
  const price =
    item.match(/<g:sale_price>([\d.]+) INR<\/g:sale_price>/)?.[1] ||
    item.match(/<g:price>([\d.]+) INR<\/g:price>/)?.[1];
  check(
    Boolean(offer) && Number(offer?.price) === Number(price),
    "Feed price/URL differs from page",
    feedIssues,
  );
  const available = item.includes("<g:availability>in_stock</g:availability>");
  check(
    available === (offer?.availability === "https://schema.org/InStock"),
    "Feed stock differs from page",
    feedIssues,
  );
  check(!item.includes("<g:mpn>"), "Unverified manufacturer identifier", feedIssues);
}
failures += feedIssues.length;
console.log(
  `${feedIssues.length ? "FAIL" : "PASS"} merchant feed ${feedItems.length} products ${feedIssues.join("; ")}`,
);
for (const path of ["/admin", "/account", "/checkout", "/track-order", "/order-confirmation"]) {
  const response = await fetchPage(path);
  const good =
    /noindex/.test(response.headers.get("x-robots-tag") || "") &&
    /no-store/.test(response.headers.get("cache-control") || "");
  if (!good || response.status >= 500) failures++;
  console.log(
    `${good && response.status < 500 ? "PASS" : "FAIL"} private ${path} HTTP ${response.status}`,
  );
}
for (const path of [
  "/seo-audit-missing-page",
  "/product/seo-audit-missing-product",
  "/journal/seo-audit-missing-article",
]) {
  const response = await fetchPage(path);
  const good =
    response.status === 404 && /noindex/.test(response.headers.get("x-robots-tag") || "");
  if (!good) failures++;
  console.log(`${good ? "PASS" : "FAIL"} missing ${path} HTTP ${response.status}`);
}
console.log(
  `${paths.length} public pages; ${failures} issues. No purchases or admin changes made.`,
);
process.exitCode = failures ? 1 : 0;
