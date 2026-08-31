import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

import appCss from "../styles.css?url";
import { CartProvider } from "../components/store/CartContext";
import { AuthProvider } from "../contexts/AuthContext";
import { CurrencyProvider } from "../contexts/CurrencyContext";
import { convex } from "../integrations/convex/client";
import {
  DEFAULT_SOCIAL_IMAGE,
  INDEX_ROBOTS,
  ORGANIZATION_ID,
  SITE_ORIGIN,
  WEBSITE_ID,
  serializeJsonLd,
} from "../lib/seo";

const GOOGLE_SITE_VERIFICATION = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION;
const BING_SITE_VERIFICATION = import.meta.env.VITE_BING_SITE_VERIFICATION;
const CLOUDFLARE_WEB_ANALYTICS_TOKEN = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
const ROOT_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "OnlineStore",
      "@id": ORGANIZATION_ID,
      name: "BADR",
      alternateName: "House of BADR",
      url: SITE_ORIGIN,
      description:
        "Independent Indian fragrance house creating concentrated, alcohol-free 6 ml roll-on attars for all genders.",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/icon-512.png`,
        width: 512,
        height: 512,
      },
      image: DEFAULT_SOCIAL_IMAGE,
      email: "mailto:houseofbadr@gmail.com",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: "+91-90732-15410",
        availableLanguage: ["English"],
        areaServed: "IN",
      },
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: "BADR",
      alternateName: "House of BADR",
      url: SITE_ORIGIN,
      inLanguage: "en-IN",
      description:
        "Shop BADR concentrated attar perfume oils, including oud, rose, fruity, fresh aquatic and vanilla fragrances.",
      publisher: { "@id": ORGANIZATION_ID },
    },
  ],
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BADR Attar Perfume | Unisex Perfume Oils Made in India" },
      {
        name: "description",
        content:
          "Shop BADR concentrated 6 ml roll-on attar perfumes made in India. Explore oud, rose, fruity, aquatic and vanilla perfume oils for all genders.",
      },
      { name: "author", content: "BADR" },
      { name: "creator", content: "BADR" },
      { name: "publisher", content: "BADR" },
      { name: "application-name", content: "BADR Attar" },
      { name: "robots", content: INDEX_ROBOTS },
      { name: "theme-color", content: "#111111" },
      { name: "color-scheme", content: "light" },
      { property: "og:site_name", content: "BADR" },
      { property: "og:locale", content: "en_IN" },
      { property: "og:title", content: "BADR Attar Perfume — Rare Air" },
      {
        property: "og:description",
        content: "Five concentrated unisex attar perfume oils made in India. From ₹499.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_ORIGIN },
      { property: "og:image", content: DEFAULT_SOCIAL_IMAGE },
      { property: "og:image:alt", content: "BADR Oud Zafar attar perfume bottle" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BADR Attar Perfume — Rare Air" },
      {
        name: "twitter:description",
        content: "Five concentrated unisex attar perfume oils made in India. From ₹499.",
      },
      { name: "twitter:image", content: DEFAULT_SOCIAL_IMAGE },
      { name: "twitter:image:alt", content: "BADR Oud Zafar attar perfume bottle" },
      ...(GOOGLE_SITE_VERIFICATION
        ? [{ name: "google-site-verification", content: GOOGLE_SITE_VERIFICATION }]
        : []),
      ...(BING_SITE_VERIFICATION
        ? [{ name: "msvalidate.01", content: BING_SITE_VERIFICATION }]
        : []),
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wdth,wght@112..125,600..800&family=Inter+Tight:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev" },
      {
        rel: "alternate",
        type: "application/atom+xml",
        title: "BADR Attar Journal",
        href: `${SITE_ORIGIN}/feed.xml`,
      },
      {
        rel: "icon",
        href: "/favicon-badr-32.png",
        type: "image/png",
        sizes: "32x32",
      },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(ROOT_SCHEMA) }}
        />
      </head>
      <body>
        {children}
        <Scripts />
        {CLOUDFLARE_WEB_ANALYTICS_TOKEN ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: CLOUDFLARE_WEB_ANALYTICS_TOKEN })}
          />
        ) : null}
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexAuthProvider client={convex}>
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ConvexAuthProvider>
    </QueryClientProvider>
  );
}
