const COUNTRY_TO_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  NL: "EUR",
  BE: "EUR",
  ES: "EUR",
  IT: "EUR",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  MY: "MYR",
  SG: "SGD",
  ZA: "ZAR",
};

const PRODUCT_MEDIA_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

const MAX_PRODUCT_MEDIA_BYTES = 25 * 1024 * 1024;

function json(body: unknown, status = 200, cacheControl = "no-store") {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": cacheControl,
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

function xml(value: string, cacheControl = "public, max-age=3600, stale-while-revalidate=86400") {
  return new Response(value, {
    headers: {
      "cache-control": cacheControl,
      "content-type": "application/xml; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

function xmlText(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

async function sitemapResponse(request: Request, env: Env) {
  const origin = (env.PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
  let products: Array<{
    slug: string;
    name?: string | null;
    updated_at?: string | null;
    cover_image_url?: string | null;
  }> = ["oud-zafar", "oud-gulaab", "fitoor", "dariya", "ulfat"].map((slug) => ({ slug }));
  try {
    const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
    const liveProducts = (await client.query(api.products.listActiveProducts, {})) as Array<{
      slug?: string | null;
      name?: string | null;
      updated_at?: string | null;
      cover_image_url?: string | null;
    }>;
    const seen = new Set<string>();
    const normalized = liveProducts.flatMap((product) => {
      const slug = product.slug?.trim();
      if (!slug || seen.has(slug)) return [];
      seen.add(slug);
      return [{ ...product, slug }];
    });
    if (normalized.length) products = normalized;
  } catch {
    // The core catalog remains discoverable if Convex is temporarily unavailable.
  }
  const urls = [
    { location: origin, priority: "1.0", frequency: "weekly", lastmod: null, image: null },
    {
      location: `${origin}/shop`,
      priority: "0.9",
      frequency: "daily",
      lastmod: null,
      image: null,
    },
    {
      location: `${origin}/about`,
      priority: "0.6",
      frequency: "monthly",
      lastmod: null,
      image: null,
    },
    ...products.map((product) => ({
      location: `${origin}/product/${encodeURIComponent(product.slug)}`,
      priority: "0.8",
      frequency: "weekly",
      lastmod: validLastModified(product.updated_at),
      image: product.cover_image_url
        ? {
            location: product.cover_image_url,
            title: `${product.name || product.slug} attar perfume`,
          }
        : null,
    })),
  ];
  return xml(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls
      .map(
        ({ location, priority, frequency, lastmod, image }) =>
          `  <url><loc>${xmlText(location)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>${frequency}</changefreq><priority>${priority}</priority>${image ? `<image:image><image:loc>${xmlText(image.location)}</image:loc><image:title>${xmlText(image.title)}</image:title></image:image>` : ""}</url>`,
      )
      .join("\n")}\n</urlset>`,
  );
}

function validLastModified(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function merchantFeedResponse(request: Request, env: Env) {
  const origin = (env.PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
  const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
  const products = (await client.query(api.products.listActiveProducts, {})) as Array<
    Record<string, unknown>
  >;
  const items = products.flatMap((product) => {
    const slug = String(product.slug || "").trim();
    const name = String(product.name || "").trim();
    const image = String(product.cover_image_url || "").trim();
    const price = Number(product.price_inr ?? product.price ?? 0);
    const salePrice = Number(product.sale_price_inr ?? product.sale_price ?? 0);
    if (!slug || !name || !image || !Number.isFinite(price) || price <= 0) return [];
    const sku = String(product.sku || "").trim();
    const notes = Array.isArray(product.key_notes)
      ? (product.key_notes as unknown[]).map(String).filter(Boolean).slice(0, 8)
      : [];
    const description = String(
      product.description ||
        product.short_description ||
        product.hook ||
        `${name} concentrated attar perfume oil${notes.length ? ` with ${notes.join(", ")}` : ""}.`,
    )
      .replace(/\s+/g, " ")
      .trim();
    const additionalImages = Array.isArray(product.images)
      ? (product.images as unknown[]).map(String).filter(Boolean).slice(0, 10)
      : [];
    const available = product.in_stock !== false && Number(product.stock_quantity ?? 0) > 0;
    const productUrl = `${origin}/product/${encodeURIComponent(slug)}`;
    const size = String(product.volume_label || "6 ml");
    return [
      `<item>
        <g:id>${xmlText(sku || slug)}</g:id>
        <title>${xmlText(`${name} ${size} Roll-On Attar Perfume Oil`)}</title>
        <description>${xmlText(description)}</description>
        <link>${xmlText(productUrl)}</link>
        <g:canonical_link>${xmlText(productUrl)}</g:canonical_link>
        <g:image_link>${xmlText(image)}</g:image_link>
        ${additionalImages.map((url) => `<g:additional_image_link>${xmlText(url)}</g:additional_image_link>`).join("\n        ")}
        <g:availability>${available ? "in_stock" : "out_of_stock"}</g:availability>
        <g:price>${price.toFixed(2)} INR</g:price>
        ${salePrice > 0 && salePrice < price ? `<g:sale_price>${salePrice.toFixed(2)} INR</g:sale_price>` : ""}
        <g:condition>new</g:condition>
        <g:brand>BADR</g:brand>
        ${sku ? `<g:mpn>${xmlText(sku)}</g:mpn>` : `<g:identifier_exists>false</g:identifier_exists>`}
        <g:product_type>Health &amp; Beauty &gt; Personal Care &gt; Fragrances &gt; Attar Perfume Oils</g:product_type>
        <g:google_product_category>Health &amp; Beauty &gt; Personal Care &gt; Cosmetics &gt; Perfume &amp; Cologne</g:google_product_category>
        <g:gender>unisex</g:gender>
        <g:age_group>adult</g:age_group>
        <g:size>${xmlText(size)}</g:size>
        <g:shipping><g:country>IN</g:country><g:service>Standard</g:service><g:price>0.00 INR</g:price></g:shipping>
      </item>`,
    ];
  });
  return xml(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>BADR Attar Perfume</title>
    <link>${xmlText(origin)}</link>
    <description>Concentrated BADR attar perfume oils made in India.</description>
    ${items.join("\n    ")}
  </channel>
</rss>`,
    "public, max-age=1800, stale-while-revalidate=86400",
  );
}

async function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual(a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView): boolean;
  };
  return subtle.timingSafeEqual(leftHash, rightHash);
}

function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "upload"
  );
}

async function ratesResponse(request: Request, env: Env) {
  const cache = await caches.open("badr-rates-v1");
  const cacheKey = new Request(new URL("/api/rates?base=INR", request.url), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const fetchedAt = new Date().toISOString();
  if (!env.EXCHANGE_RATE_API_KEY) {
    return json(
      {
        base: "INR",
        rates: { INR: 1 },
        source: "fallback",
        fetchedAt,
        error: "EXCHANGE_RATE_API_KEY is not configured; displaying INR base prices.",
      },
      200,
    );
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${encodeURIComponent(env.EXCHANGE_RATE_API_KEY)}/latest/INR`,
      { signal: AbortSignal.timeout(8_000) },
    );
    const payload = (await response.json().catch(() => null)) as {
      result?: string;
      conversion_rates?: Record<string, number>;
      "error-type"?: string;
    } | null;
    if (!response.ok || payload?.result !== "success" || !payload.conversion_rates) {
      return json(
        {
          base: "INR",
          rates: { INR: 1 },
          source: "fallback",
          fetchedAt,
          error: payload?.["error-type"] ?? `ExchangeRate-API returned ${response.status}.`,
        },
        200,
      );
    }

    const live = json(
      {
        base: "INR",
        rates: payload.conversion_rates,
        source: "exchangerate-api.com",
        fetchedAt,
        error: null,
      },
      200,
      "public, max-age=3600, stale-while-revalidate=86400",
    );
    await cache.put(cacheKey, live.clone());
    return live;
  } catch (error) {
    return json({
      base: "INR",
      rates: { INR: 1 },
      source: "fallback",
      fetchedAt,
      error: error instanceof Error ? error.message : "ExchangeRate-API request failed.",
    });
  }
}

async function uploadResponse(request: Request, env: Env) {
  if (!env.MEDIA_BUCKET || !env.R2_PUBLIC_BASE_URL || !env.ADMIN_UPLOAD_TOKEN) {
    return json({ error: "R2 media uploads are not configured." }, 501);
  }
  const providedToken = request.headers.get("x-admin-upload-token") ?? "";
  if (!(await constantTimeEqual(providedToken, env.ADMIN_UPLOAD_TOKEN))) {
    return json({ error: "Upload denied." }, 401);
  }
  const contentType = (request.headers.get("content-type") ?? "").split(";", 1)[0].toLowerCase();
  if (!PRODUCT_MEDIA_TYPES.has(contentType)) {
    return json({ error: "Only JPG, PNG, WebP, AVIF, GIF, MP4, and WebM files are allowed." }, 415);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return json({ error: "A valid Content-Length header is required." }, 411);
  }
  if (contentLength > MAX_PRODUCT_MEDIA_BYTES) {
    return json({ error: "Product media must be 25 MB or smaller." }, 413);
  }
  if (!request.body) return json({ error: "Upload body is required." }, 400);

  const originalName = request.headers.get("x-file-name") ?? "upload";
  const key = `media/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFileName(originalName)}`;
  await env.MEDIA_BUCKET.put(key, request.body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { originalName: safeFileName(originalName) },
  });
  const base = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return json({ url: `${base}/${key}` }, 201);
}

function storefrontConfigResponse(env: Env) {
  const whatsappOrderNumber = String(env.WHATSAPP_ORDER_NUMBER ?? "").replace(/\D/g, "");
  return json(
    {
      whatsappOrderNumber:
        whatsappOrderNumber.length >= 7 && whatsappOrderNumber.length <= 15
          ? whatsappOrderNumber
          : "",
    },
    200,
    "public, max-age=300, stale-while-revalidate=3600",
  );
}

async function catalogProductsResponse(request: Request, env: Env) {
  const cache = await caches.open("badr-catalog-v1");
  const cacheKey = new Request(new URL("/api/catalog/products", request.url), { method: "GET" });
  const refresh = new URL(request.url).searchParams.has("refresh");
  const cached = await cache.match(cacheKey);
  if (cached && !refresh) return cached;

  try {
    const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
    const products = await client.query(api.products.listActiveProducts, {});
    const response = json(products, 200, "public, max-age=300, stale-while-revalidate=3600");
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    if (cached) return cached;
    return json(
      {
        error:
          error instanceof Error ? error.message : "Product catalog is temporarily unavailable.",
      },
      503,
    );
  }
}

async function catalogProductResponse(request: Request, env: Env) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  if (!id && !slug) return json({ error: "Product id or slug is required." }, 400);

  const cache = await caches.open("badr-catalog-v1");
  const canonical = new URL("/api/catalog/product", request.url);
  if (id) canonical.searchParams.set("id", id);
  else canonical.searchParams.set("slug", slug);
  const cacheKey = new Request(canonical, { method: "GET" });
  const refresh = url.searchParams.has("refresh");
  const cached = await cache.match(cacheKey);
  if (cached && !refresh) return cached;

  try {
    const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
    const product = id
      ? await client.query(api.products.getProductById, { id })
      : await client.query(api.products.getProductBySlug, { slug });
    if (!product) return json({ error: "Product not found." }, 404);
    const response = json(product, 200, "public, max-age=300, stale-while-revalidate=3600");
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    if (cached) return cached;
    return json(
      { error: error instanceof Error ? error.message : "Product is temporarily unavailable." },
      503,
    );
  }
}

export async function handleWorkerApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/api/geo" && request.method === "GET") {
    const country = (request.headers.get("cf-ipcountry") || "IN").toUpperCase();
    return json(
      { country, currency: COUNTRY_TO_CURRENCY[country] ?? "USD" },
      200,
      "private, max-age=86400",
    );
  }
  if (url.pathname === "/api/rates" && request.method === "GET") {
    return await ratesResponse(request, env);
  }
  if (url.pathname === "/api/storefront-config" && request.method === "GET") {
    return storefrontConfigResponse(env);
  }
  if (url.pathname === "/api/catalog/products" && request.method === "GET") {
    return await catalogProductsResponse(request, env);
  }
  if (url.pathname === "/api/catalog/product" && request.method === "GET") {
    return await catalogProductResponse(request, env);
  }
  if (url.pathname === "/sitemap.xml" && request.method === "GET") {
    return await sitemapResponse(request, env);
  }
  if (url.pathname === "/merchant-feed.xml" && request.method === "GET") {
    return await merchantFeedResponse(request, env);
  }
  if (url.pathname === "/api/media/upload" && request.method === "POST") {
    return await uploadResponse(request, env);
  }
  return null;
}
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
