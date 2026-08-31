export const SITE_ORIGIN = import.meta.env.VITE_PUBLIC_SITE_URL || "https://houseofbadr.com";
export const SITE_NAME = "BADR";
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
export const DEFAULT_SOCIAL_IMAGE =
  "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev/products/scene-oud-zafar.webp";
export const INDEX_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
export const NOINDEX_ROBOTS = "noindex, nofollow, noarchive";

export function absoluteUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, SITE_ORIGIN).toString();
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function socialMeta({
  title,
  description,
  url,
  image = DEFAULT_SOCIAL_IMAGE,
  imageAlt,
  type = "website",
}: {
  title: string;
  description: string;
  url: string;
  image?: string;
  imageAlt: string;
  type?: "website" | "product";
}) {
  const resolvedImage = absoluteUrl(image);
  return [
    { name: "robots", content: INDEX_ROBOTS },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "en_IN" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: url },
    { property: "og:image", content: resolvedImage },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: resolvedImage },
    { name: "twitter:image:alt", content: imageAlt },
  ];
}
