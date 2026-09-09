# BADR search and merchant launch checklist

The codebase supplies the technical foundation. Search engines do not sell guaranteed rankings, and no legitimate agency can guarantee first place. Complete the owner-controlled work below so the store can build authority and qualify for richer search and shopping results.

## Do before promoting the store

### 1. Google Search Console

**9 September 2026:** Existing domain ownership and successful sitemap verified; homepage, shop and all five product indexing requests accepted. Google live tests passed for homepage and Oud Zafar, with valid product rich-result markup. No manual actions/security issues. See `SEARCH-CONSOLE-AUDIT-2026-09-09.md` for evidence and remaining optional shipping/returns fields. Do not repeat setup or submit the same indexing requests again immediately.

1. Add a **Domain property** for `houseofbadr.com`.
2. Verify it with the DNS TXT record Google provides.
3. Submit `https://houseofbadr.com/sitemap.xml`.
4. Inspect the home page, shop page, journal page, and each live product URL, then request indexing.
5. Review **Pages**, **Shopping**, **Product snippets**, **Merchant listings**, and **Core Web Vitals** weekly for the first month.
6. If already DNS-verified, keep that TXT record; no HTML token or additional verification is necessary. `VITE_GOOGLE_SITE_VERIFICATION` is only for an optional HTML-tag verification method.

### 2. Bing Webmaster Tools

1. Import the verified site from Search Console or add `houseofbadr.com` directly.
2. Submit `https://houseofbadr.com/sitemap.xml`.
3. If verification is complete through import/DNS, nothing more is needed. `VITE_BING_SITE_VERIFICATION` is available only if choosing HTML-tag verification.

The site already submits changed products and homepage publishes through IndexNow. Its key file is at `https://houseofbadr.com/61fbb4ef675648bc9241202d677ee755.txt`.

### 3. Google Merchant Center

1. Create or claim the BADR Merchant Center account and verify `houseofbadr.com`.
2. Add the feed `https://houseofbadr.com/merchant-feed.xml` as a scheduled data source.
3. Set the real shipping service, delivery estimates, return policy, business address, customer-support details, and target country in Merchant Center.
4. Enable free listings.
5. Fix every product/account warning rather than suppressing it.
6. Add real GTINs only when the manufacturer has assigned them. Do not invent identifiers.

### 4. Analytics and speed evidence

1. Cloudflare Web Analytics was already showing visits in the owner's dashboard. Keep the working installation; do not add a second beacon. The optional `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is only needed for manual installation if automatic injection is not enabled.
2. Run PageSpeed Insights for `/`, `/shop`, and the most important product page on both mobile and desktop.
3. Save the baseline and repeat after major media/layout changes. Prioritize real Core Web Vitals field data once it becomes available.

## Information the owner must provide

Send these exact, approved details to the developer before calling the legal/merchant setup complete:

- Legal or trading business name.
- Full business/return address.
- GSTIN and legal entity details, if applicable.
- Grievance officer name, role, phone, email, and postal address required for the business.
- Exact cancellation window and exclusions.
- Exact return/exchange window, accepted condition, exclusions, and who pays return shipping.
- Refund method and realistic processing timeline.
- Dispatch and delivery estimates by region.
- Official support email and support hours.
- Official Instagram, Facebook, YouTube, Google Business Profile, and other owned profile URLs.
- Authentic product identifiers, manufacturer/packer/importer details, net quantity, country of origin, warnings, and shelf-life information wherever applicable.

After approval, update `/shipping`, `/returns`, `/privacy`, and `/terms`, then add the corresponding merchant shipping and return-policy structured data. Do not publish guessed terms.

## Authority and demand work

### Every week

- Publish or improve one genuinely useful attar guide based on real customer questions.
- Add internal links from relevant articles to the best matching products and from product pages back to useful guides.
- Answer customer questions accurately and add recurring questions to product FAQs.
- Check Search Console queries and improve pages that receive impressions but weak clicks.
- Check out-of-stock, price, feed, indexing, and structured-data errors.

### Every month

- Earn relevant coverage from fragrance reviewers, local publications, creators, suppliers, and community sites. Seek editorial links; do not buy spam link packages.
- Refresh product photography, note descriptions, and original demonstrations where they improve the buying decision.
- Review conversion rate by landing page and country without collecting unnecessary personal data.
- Compare branded and non-branded search demand and update the editorial plan from evidence.

## Content and reputation rules

- Use only original photographs, product facts, and first-hand claims that BADR can substantiate.
- Never publish fake reviews, fake awards, fabricated scarcity, copied articles, doorway pages, or mass AI filler.
- Never add medical, therapeutic, longevity, or performance claims without reliable substantiation.
- Ask real purchasers for honest reviews and clearly label verified-purchase reviews.
- Keep prices, availability, shipping, returns, and checkout information consistent across the website and Merchant Center.

## Useful production URLs

- Sitemap: `https://houseofbadr.com/sitemap.xml`
- Product feed: `https://houseofbadr.com/merchant-feed.xml`
- Journal feed: `https://houseofbadr.com/feed.xml`
- AI-readable guide: `https://houseofbadr.com/llms.txt`
- Robots: `https://houseofbadr.com/robots.txt`
- Contact: `https://houseofbadr.com/contact`
- Shipping: `https://houseofbadr.com/shipping`
- Returns: `https://houseofbadr.com/returns`
- Privacy: `https://houseofbadr.com/privacy`
- Terms: `https://houseofbadr.com/terms`
