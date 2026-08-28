import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const MEDIA_BASE = "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev/products";

const products = [
  {
    name: "Oud Zafar",
    slug: "oud-zafar",
    short_description: "Deep oud, saffron and rose with a commanding sandalwood drydown.",
    description:
      "Oud Zafar carries the name of victory for a reason. Bold oud and saffron sit at the center, rose keeps it warm, and sandalwood stays on the skin long after you have left the room.",
    price_inr: 899,
    sale_price_inr: 599,
    sku: "BADR-OZ-6ML",
    stock_quantity: 25,
    category: "attars",
    category_id: "oud",
    tags: ["Oud", "Saffron", "Rose", "Amber", "Sandalwood", "Unisex"],
    cover_image_url: `${MEDIA_BASE}/sku-oud-zafar.jpg`,
    images: [`${MEDIA_BASE}/scene-oud-zafar.jpg`, `${MEDIA_BASE}/spin-oud-zafar.png`],
    badge: "Hero Attar",
    is_bestseller: true,
  },
  {
    name: "Oud Gulaab",
    slug: "oud-gulaab",
    short_description: "Turkish rose and soft resinous oud with sandalwood and musk.",
    description:
      "Oud Gulaab pairs Turkish rose with a soft resinous oud, backed by sandalwood and musk that stay close through the evening. Romantic without becoming overly sweet.",
    price_inr: 899,
    sale_price_inr: 599,
    sku: "BADR-OG-6ML",
    stock_quantity: 25,
    category: "attars",
    category_id: "oud",
    tags: ["Rose", "Oud", "Sandalwood", "Musk", "Unisex"],
    cover_image_url: `${MEDIA_BASE}/sku-oud-gulaab.jpg`,
    images: [`${MEDIA_BASE}/scene-oud-gulaab.jpg`, `${MEDIA_BASE}/spin-oud-gulaab.png`],
    badge: "Evening",
    is_bestseller: false,
  },
  {
    name: "Fitoor",
    slug: "fitoor",
    short_description: "Juicy pineapple and apple over soft woods, vanilla and musk.",
    description:
      "Fitoor means obsession. Juicy pineapple and apple lead, soft woods sit underneath, and a warm vanilla-musk trail closes it out. An easy everyday signature.",
    price_inr: 749,
    sale_price_inr: 499,
    sku: "BADR-FI-6ML",
    stock_quantity: 25,
    category: "attars",
    category_id: "fruity",
    tags: ["Pineapple", "Apple", "Vanilla", "Musk", "Unisex"],
    cover_image_url: `${MEDIA_BASE}/sku-fitoor.jpg`,
    images: [`${MEDIA_BASE}/scene-fitoor.jpg`, `${MEDIA_BASE}/spin-fitoor.png`],
    badge: "Everyday",
    is_bestseller: true,
  },
  {
    name: "Dariya",
    slug: "dariya",
    short_description: "Clean bergamot and mandarin with an earthy vetiver finish.",
    description:
      "Dariya means river. Bergamot and mandarin open it up clean, while vetiver carries it home. A fresh aquatic attar for mornings, workdays and travel.",
    price_inr: 749,
    sale_price_inr: 499,
    sku: "BADR-DA-6ML",
    stock_quantity: 25,
    category: "attars",
    category_id: "fresh",
    tags: ["Bergamot", "Mandarin", "Vetiver", "Aquatic", "Unisex"],
    cover_image_url: `${MEDIA_BASE}/sku-dariya.jpg`,
    images: [`${MEDIA_BASE}/scene-dariya.jpg`, `${MEDIA_BASE}/spin-dariya.png`],
    badge: "Fresh",
    is_bestseller: false,
  },
  {
    name: "Ulfat",
    slug: "ulfat",
    short_description: "Skin-warmed vanilla, lavender and amber made for close evenings.",
    description:
      "Ulfat means affection. Lavender opens it, vanilla carries the heart, and amber wraps it up warm. Sweet and intimate without becoming sugary.",
    price_inr: 749,
    sale_price_inr: 499,
    sku: "BADR-UL-6ML",
    stock_quantity: 25,
    category: "attars",
    category_id: "gourmand",
    tags: ["Lavender", "Vanilla", "Amber", "Gourmand", "Unisex"],
    cover_image_url: `${MEDIA_BASE}/sku-ulfat.jpg`,
    images: [`${MEDIA_BASE}/scene-ulfat.jpg`, `${MEDIA_BASE}/spin-ulfat.png`],
    badge: "Gourmand",
    is_bestseller: false,
  },
];

export const seedBadrCatalog = mutation({
  args: { replaceExisting: v.optional(v.boolean()) },
  returns: v.object({ inserted: v.number(), updated: v.number() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const timestamp = nowIso();
    let inserted = 0;
    let updated = 0;

    for (const product of products) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", product.slug))
        .first();
      const payload = {
        ...product,
        price: product.price_inr,
        sale_price: product.sale_price_inr,
        color_options: [],
        size_options: ["6 ml roll-on"],
        option_types: [{ name: "Size", values: ["6 ml roll-on"] }],
        linked_product_ids: [],
        is_active: true,
        is_featured: true,
        show_in_category_section: true,
        is_new_arrival: true,
        is_on_sale: true,
        in_stock: product.stock_quantity > 0,
        rating: null,
        reviews_count: 0,
        updated_at: timestamp,
      };

      if (existing) {
        if (args.replaceExisting) {
          await ctx.db.patch(existing._id, payload);
          updated += 1;
        }
      } else {
        await ctx.db.insert("products", { ...payload, created_at: timestamp });
        inserted += 1;
      }
    }

    await writeAuditLog(ctx, {
      action: "catalog.seed_badr",
      entityType: "product",
      summary: "Seeded BADR launch catalog",
      metadata: { inserted, updated },
    });
    return { inserted, updated };
  },
});
