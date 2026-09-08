import type { Product } from "./products";

/** Shared by the document head and JSON-LD; admin copy always takes priority. */
export function productSeo(product: Product) {
  const isPack = Boolean(product.bundleContents?.length);
  const title =
    product.seoTitle?.trim() ||
    `${product.name} ${isPack ? "Attar Set" : "Attar Perfume Oil"} | BADR India`;
  const description =
    product.seoDescription?.trim() ||
    [
      `${product.name} by BADR.`,
      product.hook,
      !isPack ? `${product.volume || "6 ml"} ${product.format || "roll-on perfume oil"}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  return { title, description, image: product.socialImage || product.image };
}
