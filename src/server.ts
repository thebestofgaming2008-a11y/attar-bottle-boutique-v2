import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleWorkerApi } from "./lib/worker-api";

type ServerEntry = {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
const CANONICAL_ORIGIN = "https://houseofbadr.com";
const CANONICAL_HOST = "houseofbadr.com";
const WWW_HOST = "www.houseofbadr.com";
const LEGACY_WORKER_HOST = "badr-boutique-studio-v2.thebestofgaming2008.workers.dev";
const PRIVATE_INDEX_PATHS = [
  "/admin",
  "/account",
  "/checkout",
  "/order-confirmation",
  "/track-order",
];

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function withSecurityHeaders(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  const pathname = new URL(request.url).pathname;
  if (PRIVATE_INDEX_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    headers.set("cache-control", "private, no-store, max-age=0");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function canonicalRedirect(request: Request) {
  const url = new URL(request.url);
  const isStoreHost = url.hostname === CANONICAL_HOST || url.hostname === WWW_HOST;
  const shouldRedirect =
    url.hostname === WWW_HOST ||
    url.hostname === LEGACY_WORKER_HOST ||
    (isStoreHost && url.protocol !== "https:");
  if (!shouldRedirect) return null;

  const destination = new URL(`${url.pathname}${url.search}`, CANONICAL_ORIGIN);
  return new Response(null, {
    status: 308,
    headers: {
      location: destination.toString(),
      "cache-control": "public, max-age=3600",
    },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, bindings: Env, ctx: ExecutionContext) {
    try {
      const redirect = canonicalRedirect(request);
      if (redirect) return withSecurityHeaders(redirect, request);

      // Nitro invokes the SSR service with only the Request after exposing the
      // Cloudflare bindings on its request-scoped runtime global.
      const workerEnv = bindings ?? (globalThis as typeof globalThis & { __env__?: Env }).__env__;
      const apiResponse = workerEnv ? await handleWorkerApi(request, workerEnv) : null;
      if (apiResponse) return withSecurityHeaders(apiResponse, request);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, bindings, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response), request);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request,
      );
    }
  },
};
