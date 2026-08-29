import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const MEDIA_BASE = "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev/products";

const products = [
  {
    name: "Oud Zafar",
    slug: "oud-zafar",
    product_type: "Unisex Oud Parfum",
    mood: "Battlefields · Late nights · The ones who don't back down",
    scent_profile: "Deep · Warm · Commanding",
    hook: "It smells like oud, saffron and a fight worth winning.",
    story:
      "Oud Zafar carries the name of victory for a reason. Bold oud and saffron sit at the center, rose keeps it warm, sandalwood stays on the skin long after you've left the room. Wear it on the day you need that in your bones.",
    key_notes: ["Oud", "Saffron", "Rose", "Amber", "Sandalwood"],
    occasion: "Evenings · Occasions",
    intensity: "Bold",
    longevity: "8+ hours",
    volume_label: "6 ml",
    format_label: "Roll-on attar",
    country_of_origin: "India",
    faqs: [
      {
        question: "How long does Oud Zafar last?",
        answer:
          "It's built to stay close for 8+ hours depending on skin and weather — this is the hero attar, made to be felt.",
      },
      {
        question: "What does Oud Zafar smell like?",
        answer:
          "Warm and commanding — deep oud and saffron with a soft rose warmth and a sandalwood drydown. Not loud — just present.",
      },
      {
        question: "When should I wear it?",
        answer: "Evenings, occasions, any day you're walking in to win something.",
      },
    ],
    seo_title: "Oud Zafar Attar — Oud, Saffron & Sandalwood | BADR",
    seo_description:
      "Shop Oud Zafar, BADR's commanding 6 ml unisex oud attar with saffron, rose, amber and sandalwood. Made in India.",
    seo_keywords: ["oud attar", "unisex attar", "saffron perfume oil", "BADR Oud Zafar"],
    sort_order: 10,
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
    product_type: "Unisex Floral Oud Parfum",
    mood: "Evenings · Weddings · The quiet kind of confidence",
    scent_profile: "Rose · Resin · Quiet confidence",
    hook: "It smells like rose, oud and a slow exhale.",
    story:
      "Oud Gulaab pairs Turkish rose with a soft resinous oud, backed by sandalwood and musk that hang around till the night's over. Rose and oud have shared a bottle for centuries — this is BADR's take, without the harshness attars usually get blamed for.",
    key_notes: ["Rose", "Oud", "Sandalwood", "Musk"],
    occasion: "Evenings · Weddings",
    intensity: "Soft",
    longevity: "6–8 hours",
    volume_label: "6 ml",
    format_label: "Roll-on attar",
    country_of_origin: "India",
    faqs: [
      {
        question: "How long does Oud Gulaab last?",
        answer: "Easily 6-8 hours — rose and oud both have staying power.",
      },
      {
        question: "What does Oud Gulaab smell like?",
        answer: "Romantic but not sweet. Bright rose first, then a soft resinous oud underneath.",
      },
      {
        question: "Can I wear this every day?",
        answer: "Yes, though it really comes alive in the evening.",
      },
    ],
    seo_title: "Oud Gulaab Attar — Rose & Oud Perfume Oil | BADR",
    seo_description:
      "Shop Oud Gulaab, a 6 ml unisex floral oud attar with Turkish rose, sandalwood and musk. Made in India by BADR.",
    seo_keywords: ["rose oud attar", "floral oud perfume oil", "unisex attar", "BADR Oud Gulaab"],
    sort_order: 20,
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
    product_type: "Unisex Fruity Woody Parfum",
    mood: "Workdays · Travel · The everyday win",
    scent_profile: "Juicy · Woody · Everyday",
    hook: "It smells like pineapple, vanilla and a little bit of obsession.",
    meaning: "Fitoor means obsession — the good kind.",
    story:
      "Juicy pineapple and apple lead, soft woods sit underneath, and a warm vanilla-musk trail closes it out. This is the one you reach for without thinking, the scent that becomes part of your routine before you notice it happened.",
    key_notes: ["Pineapple", "Apple", "Vanilla", "Musk"],
    occasion: "Workdays · Travel",
    intensity: "Balanced",
    longevity: "6–8 hours",
    volume_label: "6 ml",
    format_label: "Roll-on attar",
    country_of_origin: "India",
    faqs: [
      { question: "How long does Fitoor last?", answer: "6-8 hours, fresh through the day." },
      {
        question: "What does Fitoor smell like?",
        answer: "Fruity and woody, sweet but not heavy — the kind of scent people ask you about.",
      },
      {
        question: "Summer or winter?",
        answer: "Both. Light enough for daily wear, warm enough to hold up in cooler months.",
      },
    ],
    seo_title: "Fitoor Attar — Pineapple, Vanilla & Musk | BADR",
    seo_description:
      "Shop Fitoor, BADR's fruity woody 6 ml unisex attar with pineapple, apple, vanilla and musk for everyday wear.",
    seo_keywords: ["fruity attar", "pineapple perfume oil", "vanilla musk attar", "BADR Fitoor"],
    sort_order: 30,
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
    product_type: "Unisex Fresh Aquatic Parfum",
    mood: "Mornings · The commute · Coming up for air",
    scent_profile: "Clean · Citrus · Open water",
    hook: "It smells like bergamot, vetiver and open water.",
    meaning: "Dariya means river — and it wears like one.",
    story:
      "Bergamot and mandarin open it up clean, vetiver carries it home. The fresh, aquatic note BADR's lineup was missing, for the days you want to feel like you just stepped outside.",
    key_notes: ["Bergamot", "Mandarin", "Vetiver"],
    occasion: "Mornings · Workdays",
    intensity: "Fresh",
    longevity: "Around 6 hours",
    volume_label: "6 ml",
    format_label: "Roll-on attar",
    country_of_origin: "India",
    faqs: [
      {
        question: "How long does Dariya last?",
        answer: "Around 6 hours — freshies wear lighter by design.",
      },
      {
        question: "What does Dariya smell like?",
        answer: "Clean citrus that dries down to an earthy vetiver.",
      },
      {
        question: "When should I wear it?",
        answer: "Mornings, workdays, gym bag — anywhere you want to smell awake.",
      },
    ],
    seo_title: "Dariya Attar — Bergamot, Mandarin & Vetiver | BADR",
    seo_description:
      "Shop Dariya, a clean aquatic 6 ml unisex attar with bergamot, mandarin and vetiver. Fresh everyday perfume oil by BADR.",
    seo_keywords: ["fresh attar", "aquatic perfume oil", "bergamot vetiver attar", "BADR Dariya"],
    sort_order: 40,
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
    product_type: "Unisex Gourmand Vanilla Parfum",
    mood: "Date nights · Cold evenings · Being someone's favourite",
    scent_profile: "Sweet · Amber · Close",
    hook: "It smells like vanilla, amber and being close to someone.",
    story:
      "Ulfat means affection, and it's the softest thing in the BADR lineup. Lavender opens it, vanilla carries the heart, amber wraps it up warm. The gourmand attar BADR never had until now — sweet without asking for permission.",
    key_notes: ["Lavender", "Vanilla", "Amber"],
    occasion: "Date nights · Cold evenings",
    intensity: "Soft",
    longevity: "8+ hours",
    volume_label: "6 ml",
    format_label: "Roll-on attar",
    country_of_origin: "India",
    faqs: [
      {
        question: "How long does Ulfat last?",
        answer: "Vanilla and amber both linger — expect 8+ hours.",
      },
      {
        question: "What does Ulfat smell like?",
        answer: "Warm, sweet, a little addictive. Not sugary — more like skin-warmed vanilla.",
      },
      {
        question: "When should I wear it?",
        answer: "Cold weather, date nights, anytime you want people to lean in.",
      },
    ],
    seo_title: "Ulfat Attar — Vanilla, Lavender & Amber | BADR",
    seo_description:
      "Shop Ulfat, BADR's warm gourmand 6 ml unisex attar with vanilla, lavender and amber for evenings and close wear.",
    seo_keywords: ["vanilla attar", "gourmand perfume oil", "amber attar", "BADR Ulfat"],
    sort_order: 50,
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
