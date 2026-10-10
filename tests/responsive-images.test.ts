import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../src/lib/responsive-images.generated.json";
import { responsiveImage } from "../src/lib/responsiveImage";

describe("Responsive catalog images", () => {
  it("retains new admin uploads and unrelated images instead of substituting stale photos", () => {
    for (const source of ["https://media.houseofbadr.com/new-upload.webp", "/images/local.webp"]) {
      expect(responsiveImage(source, "50vw")).toEqual({ src: source });
    }
  });

  it("ships every referenced variant with truthful, non-upscaled widths", () => {
    for (const [source, image] of Object.entries(manifest)) {
      const result = responsiveImage(source, "64px", 160);
      expect(result.src).toBe(image.variants[0].src);
      expect(result.sizes).toBe("64px");
      expect(result.width).toBe(image.width);
      for (const variant of image.variants) {
        expect(existsSync(`public${variant.src}`)).toBe(true);
        expect(variant.width).toBeLessThanOrEqual(image.width);
        expect(result.srcSet).toContain(`${variant.src} ${variant.width}w`);
      }
    }
  });
});
