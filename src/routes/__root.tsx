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

const SITE_ORIGIN = import.meta.env.VITE_PUBLIC_SITE_URL || "https://houseofbadr.com";
const SOCIAL_IMAGE =
  "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev/products/scene-oud-zafar.webp";
const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "BADR",
  url: SITE_ORIGIN,
  description: "Rare air. Crafted for the relentless. Unisex attars made in India.",
  publisher: {
    "@type": "Organization",
    name: "BADR",
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/icon-512.png`,
  },
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
      { title: "BADR Attar — Rare Air" },
      {
        name: "description",
        content: "Rare air, crafted for the relentless. Shop BADR's unisex 6 ml attars.",
      },
      { name: "author", content: "BADR" },
      {
        name: "keywords",
        content:
          "BADR attar, attar perfume India, unisex perfume oil, oud attar, 6 ml roll-on attar",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "theme-color", content: "#111111" },
      { property: "og:site_name", content: "BADR" },
      { property: "og:title", content: "BADR Attar — Rare Air" },
      {
        property: "og:description",
        content: "Rare air, crafted for the relentless. Five unisex attars made in India.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_ORIGIN },
      { property: "og:image", content: SOCIAL_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BADR Attar — Rare Air" },
      {
        name: "twitter:description",
        content: "Rare air. Crafted for the relentless. Five unisex attars made in India.",
      },
      { name: "twitter:image", content: SOCIAL_IMAGE },
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
    <html lang="en">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }}
        />
      </head>
      <body>
        {children}
        <Scripts />
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
