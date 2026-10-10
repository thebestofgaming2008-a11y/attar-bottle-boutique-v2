import manifest from "./responsive-images.generated.json";
import { publicMediaUrl } from "./publicMedia";

type PreparedImage = {
  width: number;
  height: number;
  variants: { width: number; src: string }[];
};
const images: Record<string, PreparedImage> = manifest;

/** Exact source matching ensures a new admin photo never gets an older photo's variants. */
export function responsiveImage(source: string, sizes: string, preferredWidth = 640) {
  const normalized = publicMediaUrl(source);
  const image = images[normalized];
  if (!image) return { src: normalized };
  const fallback =
    image.variants.find((variant) => variant.width >= preferredWidth) ||
    image.variants[image.variants.length - 1];
  return {
    src: fallback.src,
    srcSet: image.variants.map((variant) => `${variant.src} ${variant.width}w`).join(", "),
    sizes,
    width: image.width,
    height: image.height,
  };
}
