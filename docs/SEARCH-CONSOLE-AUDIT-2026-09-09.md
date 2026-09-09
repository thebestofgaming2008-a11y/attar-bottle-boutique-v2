# Google Search Console audit — 9 September 2026

Property: `sc-domain:houseofbadr.com`. Accessed the existing verified owner's session. No new account, verification record, paid service, property removal or support ticket created.

## Actions completed

Google displayed **Indexing requested** and confirmed placement in its priority crawl queue for each of these canonical HTTPS URLs, once per URL:

- https://houseofbadr.com/
- https://houseofbadr.com/shop
- https://houseofbadr.com/product/oud-zafar
- https://houseofbadr.com/product/oud-gulaab
- https://houseofbadr.com/product/fitoor
- https://houseofbadr.com/product/dariya
- https://houseofbadr.com/product/ulfat

Separate Google live URL tests passed for the homepage and Oud Zafar: **URL is available to Google / Page can be indexed**. The other URLs were submitted using Request indexing and accepted by Google. An accepted request does not mean the URL is already indexed or ranked.

## Google reports inspected

| Report | Observed result |
| --- | --- |
| Ownership | Verified owner; property added 31 August 2026 |
| Sitemaps | Existing `https://houseofbadr.com/sitemap.xml` successful; last read 8 September; 18 discovered pages. No redundant resubmission necessary. |
| Page indexing | Report last updated 4 September: 18 discovered/currently not indexed, one indexed page |
| Indexed example | Old `http://houseofbadr.com/`, last crawled 31 August. Current HTTP redirects 301 to canonical HTTPS; www redirects 308 to canonical HTTPS; canonical returns 200. Do not remove the old URL through Search Console's Removals tool. |
| Homepage individual inspection | Not indexed, URL unknown in that individual report before request; live test passed. Aggregate and inspection reports can differ in freshness. |
| Product individual inspections | Five products discovered/currently not indexed before requests; sitemap recognized |
| Manual actions | No issues detected |
| Security issues | No issues detected |
| robots.txt | Search Console says all files valid; live file allows search crawling and references the correct sitemap |
| Crawl stats | Updated 7 September: 85 requests, 1.8m downloaded bytes, 151 ms average response; host had no problems in last 90 days |
| Crawl responses | 76% HTTP 200, 19% HTTP 404, 5% HTTP 301; no 5xx category shown |
| 404 examples | All nine examples shown were `/ads.txt`; these are not missing catalog pages. Do not invent publisher/advertising records to suppress them. |
| Search generative AI | Existing **Include my site's links and content** setting selected; left enabled |
| Core Web Vitals | Not enough usage data for either mobile or desktop; not a passed/failed score |
| Links | Processing data; no reliable link conclusions yet |
| Performance | Three-month view, data displayed 30 August–6 September: 0 clicks, 5 impressions, 0% CTR, average position 8.8. Visible query `badr perfume`: 4 impressions. Far too little data for broad ranking claims or aggressive keyword changes. |

## Google's product live-test evidence

Oud Zafar: one valid Product snippet, one valid Merchant listing, one valid Breadcrumb item. Google read price INR 599, in-stock offer, brand BADR, images, SKU and scent attributes.

Optional/non-critical warnings:

- `aggregateRating` and `review`: intentionally absent because there are no real published reviews. Never fabricate reviews or ratings to make a report green.
- `hasMerchantReturnPolicy`: requires owner-approved returns/refund terms.
- `deliveryTime`: requires owner-approved dispatch and India delivery estimates.

These warnings do not invalidate the detected product item. Requested the missing shipping/returns information from the owner; no guessed business policies were published.

## Independent live recheck

`node scripts/seo-audit.mjs`: all 18 public pages passed with zero detected issues; feed contains five products; private account/admin/checkout/tracking pages noindexed; nonexistent routes return real 404. No storefront/backend changes or deployment were necessary in this Search Console pass.

## Follow-up

Google still decides when to crawl/index and which results to rank. Do not repeatedly submit the same URLs; Google's confirmation explicitly says repeat requests do not change priority. Recheck Pages and Performance after Google has processed the requests. No scheduled monitoring was created in this task.

Complete approved shipping/returns metadata when the owner supplies actual policy details. Continue genuine product content, customer reviews and relevant earned links as described in `SEO-OWNER-CHECKLIST.md`. Merchant Center setup is separate and was not performed in this Search Console task.

References:

- https://support.google.com/webmasters/answer/9012289
- https://support.google.com/webmasters/answer/7440203
- https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
