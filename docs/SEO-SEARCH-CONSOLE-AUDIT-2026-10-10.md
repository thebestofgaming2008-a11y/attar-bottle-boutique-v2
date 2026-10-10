# BADR search visibility audit 10 October 2026

The live store passes the 21-page technical crawl audit. Performance and accessibility fixes are deployed, Google has reread the sitemap successfully, and requests for unindexed pages are being processed. This is not a claim that every page is indexed or that the store will outrank every competitor. Ranking, useful content, customer trust and independent coverage require ongoing work.

## Deployed improvements

- Self-hosted the existing licensed fonts and preloaded the two critical Latin fonts, removing the external Google Fonts stylesheet dependency.
- Created responsive WebP sizes from 12 existing catalog photographs, without changing their subject or generating new imagery. Original files remain intact. New admin uploads safely use their original URL until variants are regenerated.
- Optimized the existing wordmark and its loading priority.
- Fixed hidden purchase controls remaining keyboard-focusable, review-star semantics and the cart dialog element.
- Made the existing AI-readable guide's links usable Markdown. This is navigation hygiene, not a ranking shortcut.
- Required HTML revalidation and added retention of the current and two prior browser-asset generations. This reduces missing JavaScript chunks during deployments.

Cloudflare production version: `0459ded7-4e08-4a2d-9bee-6f182dd15563`, on `houseofbadr.com` and `www.houseofbadr.com`.

### Deployment failure observed

A shipping-page Google live test initially returned a soft 404. Its rendered screenshot showed the error screen, and the console reported failure to fetch an older hashed JavaScript module while a deployment was changing the available assets. A fresh test after deployment returned **URL is available to Google**, and the subsequent indexing request was accepted. This is direct evidence for that shipping test, not proof of what caused Dariya's older soft 404.

The retention cache lives on D drive in the ignored `.release-assets` directory. Future CI or fresh checkouts must restore that directory between builds to retain prior generations. Run `npm run build`, not bare `vite build`, so the postbuild retention step runs. Retention cannot recover modules already removed before this change, and covers two prior generations rather than unlimited history.

## Mobile performance evidence

Dariya was tested in PageSpeed Insights using simulated Moto G Power and Slow 4G. These are individual laboratory runs, not real-user Core Web Vitals results.

| Metric                   | Before           | After           |
| ------------------------ | ---------------- | --------------- |
| Performance              | 68               | 89              |
| Accessibility            | 93               | 100             |
| Best practices           | 96               | 96              |
| Basic SEO                | 100              | 100             |
| Agentic browsing checks  | 1 of 3           | 3 of 3          |
| First contentful paint   | 4.2 seconds      | 2.1 seconds     |
| Largest contentful paint | 5.4 seconds      | 3.5 seconds     |
| Total blocking time      | 150 milliseconds | 60 milliseconds |
| Cumulative layout shift  | 0                | 0               |

[Before report](https://pagespeed.web.dev/analysis/https-houseofbadr-com-product-dariya/ibtctei5kh?form_factor=mobile) and [after report](https://pagespeed.web.dev/analysis/https-houseofbadr-com-product-dariya/u9ck6b7tef?form_factor=mobile).

The after run still has performance headroom. Best practices reports a Convex WebSocket DNS error in the test environment; production gallery, reviews and cart rendered in the browser. This does not prove all backend paths are faultless. No backend mutation or purchase was performed. Google reports insufficient field data for Core Web Vitals, so a field-data pass cannot yet be claimed.

## Google sitemap and indexing responses

The domain was already verified. No new verification record was needed.

- Sitemap: `https://houseofbadr.com/sitemap.xml`.
- Resubmitted and reread: **10 October 2026**.
- Google response: **Success**, **21 discovered pages**, zero discovered videos.
- Earlier sitemap snapshot: 18 discovered pages, last read 4 October.
- Dariya soft-404 validation: **Started 10 October**, not yet passed.

### Individual requests made today

| URL path                     | Inspection finding before request                                                | Final response today         |
| ---------------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| `/product/dariya`            | Older soft 404; live test now passes                                             | Indexing requested, accepted |
| `/collections/oud-attar`     | Discovered, not indexed                                                          | Indexing requested, accepted |
| `/collections/fresh-attar`   | Unknown to Google                                                                | Indexing requested, accepted |
| `/collections/vanilla-attar` | Unknown to Google                                                                | Indexing requested, accepted |
| `/journal`                   | Unknown in individual inspection                                                 | Indexing requested, accepted |
| `/contact`                   | Unknown in individual inspection                                                 | Indexing requested, accepted |
| `/shipping`                  | Unknown; initial live request rejected during deployment; fresh live test passes | Indexing requested, accepted |
| `/returns`                   | Discovered, not indexed                                                          | Indexing requested, accepted |
| `/privacy`                   | Unknown in individual inspection                                                 | Indexing requested, accepted |
| `/terms`                     | Discovered, not indexed                                                          | Indexing requested, accepted |

All 10 requests were accepted. An accepted request means Google added the URL to its crawl queue. It does not mean the URL is indexed. Repeating a request does not improve its queue priority. [Google URL Inspection guidance](https://support.google.com/webmasters/answer/9012289).

### Latest aggregate indexing report

The available report is dated **4 October 2026**, so it predates today's changes and requests. It lists 11 indexed URLs and 10 excluded URLs. The three new collections are not yet reflected in that older aggregate count.

Indexed paths: `/`, `/shop`, `/about`, `/product/oud-zafar`, `/product/oud-gulaab`, `/product/fitoor`, `/product/ulfat`, `/journal/how-to-apply-attar`, `/journal/choose-attar-by-scent`, `/journal/attar-vs-spray-perfume`, `/journal/oud-attar-guide`.

| Exclusion               | Count | Meaning                                                                                   |
| ----------------------- | ----- | ----------------------------------------------------------------------------------------- |
| Redirect                | 2     | HTTP homepage and trailing-slash Oud Zafar URL redirect to their canonical URLs; expected |
| Not found               | 1     | Media subdomain root has no page; product media assets themselves load                    |
| Soft 404                | 1     | Dariya; live test passes and validation has started                                       |
| Discovered, not indexed | 6     | Contact, journal, shipping, returns, privacy and terms; requests submitted today          |

Individual URL inspections and aggregate reports have different update timing. Their differing labels are preserved above, rather than presenting them as simultaneous measurements.

## Other Google statuses

| Report                      | Available date     | Status                                                                   |
| --------------------------- | ------------------ | ------------------------------------------------------------------------ |
| Product snippets            | 9 October          | 4 valid, zero invalid; optional review/rating warnings                   |
| Merchant listings           | 9 October          | 4 valid, zero invalid; optional delivery-time and return-policy warnings |
| Breadcrumbs                 | 9 October          | 10 valid, zero invalid                                                   |
| HTTPS                       | 4 October          | 11 HTTPS, zero non-HTTPS, no issues                                      |
| Core Web Vitals             | 9 October          | Not enough usage data on mobile or desktop                               |
| Security and manual actions | Checked 10 October | No issues reported                                                       |
| Robots files                | Checked 10 October | Valid                                                                    |
| Crawl stats                 | 6 October          | 546 requests, average 116 milliseconds, both hosts report no problems    |
| Video indexing              | 8 October          | Homepage film not indexed because the page is not a video watch page     |

Dariya's fresh live test detects valid product, merchant, breadcrumb and review enhancements. This does not update the older four-product aggregate report immediately. A decorative homepage film need not become a dedicated video page merely to remove a video-indexing exclusion.

## Actual search and AI visibility

Search performance for the displayed 30 August through 6 October interval shows **16 clicks, 112 impressions, 14.3 percent CTR and average position 9.5**. Those totals combine queries and pages; they do not establish position for every BADR phrase.

The AI performance beta report shows **16 impressions** over the same displayed period, not 16 clicks or conversions. The site's generative-AI inclusion setting is **Include**. Search Console's links report currently shows **zero reported external links** and 42 internal links; this is not proof that no external link exists anywhere.

Google's AI features still rely on indexing eligibility and established SEO practices. Special AI text files do not replace useful, accessible content or guarantee citations. [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features).

Public fetch checks using Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User and PerplexityBot user-agent strings returned HTTP 200 and full HTML. This tests user-agent handling, not traffic from every provider's actual IP addresses. Google live tests independently confirm its current fetch access. [OpenAI publisher guidance](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) explains that search-crawler access is eligibility, not a guarantee of inclusion.

## Remaining work requiring real business information

The merchant warnings cannot responsibly be completed with guessed terms. Supply approved dispatch times, India delivery estimates, the return/exchange window and conditions, and who pays return postage. Keep the visible policies, structured data and Merchant Center settings consistent. Merchant Center and Bing account status were not verified in this Google Search Console session.

Beyond technical eligibility, build relevant independent coverage, genuine purchaser reviews and original product demonstrations. Prioritize pages receiving relevant impressions, and measure branded and non-branded queries separately. No comparison with a paid agency or SEMrush establishes better rankings without shared goals, competitors and measured outcomes.

## Verification and maintenance

- Live audit: 21 public pages, zero detected issues; five-product merchant feed matches price and stock.
- Private account, admin, checkout and order routes retain noindex and no-store behavior; missing routes return real 404 responses.
- Production shipping HTML returns `Cache-Control: no-cache`.
- Three targeted test files pass all 15 tests; the release-asset retention regression test also passes.
- Changed files pass ESLint; production build and Cloudflare deployment succeed.
- Existing product gallery and cart drawer were exercised without changing quantities or placing an order.
- Regenerate photograph variants with `npm run assets:storefront` after catalog-image changes. If the font source updates, check that root font preload filenames still match the generated CSS.

Local screenshots are stored in `D:/Codex/badr-seo-audit-2026-10-10/`. No new AI-generated photographs, fake reviews, invented policies, purchased links or ranking guarantees were added.
