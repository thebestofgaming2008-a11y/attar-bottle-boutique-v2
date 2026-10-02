export const MEDIA_ORIGIN = "https://media.houseofbadr.com";
const LEGACY_MEDIA_ORIGIN = "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev";

/** Resolve existing public media without rewriting stored records or cropping images. */
export function publicMediaUrl(value: string): string {
  return value.startsWith(`${LEGACY_MEDIA_ORIGIN}/`)
    ? `${MEDIA_ORIGIN}${value.slice(LEGACY_MEDIA_ORIGIN.length)}`
    : value;
}

/** Only for JSON-shaped public catalog/homepage data, never credentials or order records. */
export function publicMediaData<T>(value: T): T {
  if (typeof value === "string") return publicMediaUrl(value) as T;
  if (Array.isArray(value)) return value.map(publicMediaData) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, publicMediaData(child)]),
    ) as T;
  }
  return value;
}
