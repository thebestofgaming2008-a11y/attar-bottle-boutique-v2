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

function constantTimeEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
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
  if (!constantTimeEqual(providedToken, env.ADMIN_UPLOAD_TOKEN)) {
    return json({ error: "Upload denied." }, 401);
  }
  const contentType = (request.headers.get("content-type") ?? "").split(";", 1)[0].toLowerCase();
  if (!PRODUCT_MEDIA_TYPES.has(contentType)) {
    return json({ error: "Only JPG, PNG, WebP, AVIF, GIF, MP4, and WebM files are allowed." }, 415);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_PRODUCT_MEDIA_BYTES) {
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
  if (url.pathname === "/api/media/upload" && request.method === "POST") {
    return await uploadResponse(request, env);
  }
  return null;
}
