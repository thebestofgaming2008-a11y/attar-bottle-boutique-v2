// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = query;
  },
}));
import { handleWorkerApi } from "../src/lib/worker-api";
const env = {
  PUBLIC_SITE_URL: "https://houseofbadr.com",
  VITE_CONVEX_URL: "https://example.convex.cloud",
} as Env;
const request = (path: string) =>
  handleWorkerApi(new Request(`https://houseofbadr.com${path}`), env);
beforeEach(() => {
  query.mockReset();
});
describe("Search feeds reflect the published catalog", () => {
  it("does not resurrect products when the catalog is empty", async () => {
    query.mockResolvedValue([]);
    const response = await request("/sitemap.xml");
    expect(response?.status).toBe(200);
    expect(await response?.text()).not.toContain("/product/");
  });
  it("returns a retryable non-cacheable outage instead of seed products", async () => {
    query.mockImplementation(async () => {
      throw new Error("Offline");
    });
    const response = await request("/sitemap.xml");
    expect(response?.status).toBe(503);
    expect(response?.headers.get("retry-after")).toBe("300");
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });
  it("includes optional-slug products and absolute image URLs", async () => {
    query.mockResolvedValue([
      { id: "catalog-id", name: "Rose & Oud", cover_image_url: "/rose.webp" },
    ]);
    const body = await (await request("/sitemap.xml"))?.text();
    expect(body).toContain("https://houseofbadr.com/product/catalog-id");
    expect(body).toContain("https://houseofbadr.com/rose.webp");
    expect(body).toContain("Rose &amp; Oud");
  });
  it("deduplicates encoded canonical product URLs", async () => {
    query.mockResolvedValue([
      { id: "a", slug: "rose oil" },
      { id: "b", slug: "rose oil" },
    ]);
    const body = await (await request("/sitemap.xml"))?.text();
    expect(body?.match(/<loc>https:\/\/houseofbadr.com\/product\/rose%20oil<\/loc>/g)).toHaveLength(
      1,
    );
  });
  it("uses stable feed IDs, not internal SKUs as manufacturer identifiers", async () => {
    query.mockResolvedValue([
      {
        id: "stable-id",
        slug: "rose",
        name: "Rose",
        sku: "INTERNAL-01",
        cover_image_url: "/rose.webp",
        price_inr: 599,
        sale_price_inr: 499,
        stock_quantity: 3,
      },
    ]);
    const body = await (await request("/merchant-feed.xml"))?.text();
    expect(body).toContain("<g:id>stable-id</g:id>");
    expect(body).not.toContain("<g:mpn>");
    expect(body).toContain("<g:sale_price>499.00 INR</g:sale_price>");
    expect(body).toContain("<g:availability>in_stock</g:availability>");
  });
  it("describes packs as sets without inventing a 6 ml size", async () => {
    query.mockResolvedValue([
      {
        id: "pack",
        name: "Duo",
        bundle_kind: "pack",
        cover_image_url: "/duo.webp",
        price_inr: 899,
        stock_quantity: 0,
      },
    ]);
    const body = await (await request("/merchant-feed.xml"))?.text();
    expect(body).toContain("Duo Attar Set");
    expect(body).toContain("<g:is_bundle>true</g:is_bundle>");
    expect(body).toContain("<g:availability>out_of_stock</g:availability>");
    expect(body).not.toContain("6 ml");
  });
});
