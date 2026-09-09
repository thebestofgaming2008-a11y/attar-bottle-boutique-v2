// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = query;
  },
}));
import {
  loadPublicCatalog,
  loadPublicProduct,
  loadPublishedHomepage,
} from "../src/services/publicPageService";
beforeEach(() => {
  query.mockReset();
});
it("keeps an intentionally empty catalog empty", async () => {
  query.mockResolvedValue([]);
  expect(await loadPublicCatalog()).toEqual([]);
});
it("does not disguise catalog downtime as no products", async () => {
  query.mockRejectedValue(new Error("Offline"));
  await expect(loadPublicCatalog()).rejects.toThrow("Offline");
});
it("does not revive a deleted original fragrance", async () => {
  query.mockResolvedValueOnce(null).mockResolvedValueOnce([]);
  expect(await loadPublicProduct("oud-zafar")).toBeNull();
});
it("supports optional slugs using a verified active catalog ID", async () => {
  const product = { id: "id-without-slug", name: "New attar", slug: null };
  query.mockResolvedValueOnce(null).mockResolvedValueOnce([product]).mockResolvedValueOnce(product);
  expect(await loadPublicProduct(product.id)).toEqual(product);
  expect(query).toHaveBeenLastCalledWith(expect.anything(), { id: product.id });
});
it("preserves the canonical slug when a product is requested by ID", async () => {
  const product = { id: "catalog-id", slug: "rose-attar" };
  query.mockResolvedValueOnce(null).mockResolvedValueOnce([product]).mockResolvedValueOnce(product);
  expect((await loadPublicProduct(product.id))?.slug).toBe("rose-attar");
});
it("returns the published homepage for server rendering", async () => {
  const layout = { sections: [{ type: "hero", headline: "Approved copy" }] };
  const film = { enabled: true };
  query.mockResolvedValueOnce(layout).mockResolvedValueOnce(film);
  expect(await loadPublishedHomepage()).toEqual({ layout, film });
});
