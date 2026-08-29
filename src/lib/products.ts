import imgZafar from "@/assets/sku-oud-zafar.webp";
import imgGulaab from "@/assets/sku-oud-gulaab.webp";
import imgFitoor from "@/assets/sku-fitoor.webp";
import imgDariya from "@/assets/sku-dariya.webp";
import imgUlfat from "@/assets/sku-ulfat.webp";
import sceneZafar from "@/assets/scene-oud-zafar.webp";
import sceneGulaab from "@/assets/scene-oud-gulaab.webp";
import sceneFitoor from "@/assets/scene-fitoor.webp";
import sceneDariya from "@/assets/scene-dariya.webp";
import sceneUlfat from "@/assets/scene-ulfat.webp";
import spinZafar from "@/assets/spin-oud-zafar.webp";
import spinGulaab from "@/assets/spin-oud-gulaab.webp";
import spinFitoor from "@/assets/spin-fitoor.webp";
import spinDariya from "@/assets/spin-dariya.webp";
import spinUlfat from "@/assets/spin-ulfat.webp";

/** Cinematic poster per scent, keyed by product id. */
export const SCENE_IMAGES: Record<string, string> = {
  "oud-zafar": sceneZafar,
  "oud-gulaab": sceneGulaab,
  fitoor: sceneFitoor,
  dariya: sceneDariya,
  ulfat: sceneUlfat,
};

/** Clean front-facing bottle renders used in product galleries. */
export const BOTTLE_IMAGES: Record<string, string> = {
  "oud-zafar": spinZafar,
  "oud-gulaab": spinGulaab,
  fitoor: spinFitoor,
  dariya: spinDariya,
  ulfat: spinUlfat,
};

export type Occasion = "evening" | "everyday" | "morning" | "close";

export type Product = {
  id: string;
  name: string;
  category: string;
  tag: string;
  /** Mood tag straight from the product copy doc. */
  mood: string;
  /** What the name means, where it has a meaning. */
  meaning?: string;
  hook: string;
  image: string;
  story: string;
  notes: string[];
  price: number;
  mrp: number;
  occasion: Occasion;
  intensity: "bold" | "soft";
  longevity: string;
  faqs: { q: string; a: string }[];
};

export const PRODUCTS: Product[] = [
  {
    id: "oud-zafar",
    name: "Oud Zafar",
    category: "Unisex Oud Parfum",
    tag: "Deep · Warm · Commanding",
    mood: "Battlefields · Late nights · The ones who don't back down",
    occasion: "evening",
    intensity: "bold",
    longevity: "8+ hours",
    hook: "It smells like oud, saffron and a fight worth winning.",
    image: imgZafar,
    story:
      "Oud Zafar carries the name of victory for a reason. Bold oud and saffron sit at the center, rose keeps it warm, sandalwood stays on the skin long after you've left the room. Wear it on the day you need that in your bones.",
    notes: ["Oud", "Saffron", "Rose", "Amber", "Sandalwood"],
    price: 599,
    mrp: 899,
    faqs: [
      {
        q: "How long does Oud Zafar last?",
        a: "It's built to stay close for 8+ hours depending on skin and weather — this is the hero attar, made to be felt.",
      },
      {
        q: "What does Oud Zafar smell like?",
        a: "Warm and commanding — deep oud and saffron with a soft rose warmth and a sandalwood drydown. Not loud — just present.",
      },
      {
        q: "When should I wear it?",
        a: "Evenings, occasions, any day you're walking in to win something.",
      },
    ],
  },
  {
    id: "oud-gulaab",
    name: "Oud Gulaab",
    category: "Unisex Floral Oud Parfum",
    tag: "Rose · Resin · Quiet confidence",
    mood: "Evenings · Weddings · The quiet kind of confidence",
    occasion: "evening",
    intensity: "soft",
    longevity: "6–8 hours",
    hook: "It smells like rose, oud and a slow exhale.",
    image: imgGulaab,
    story:
      "Oud Gulaab pairs Turkish rose with a soft resinous oud, backed by sandalwood and musk that hang around till the night's over. Rose and oud have shared a bottle for centuries — this is BADR's take, without the harshness attars usually get blamed for.",
    notes: ["Rose", "Oud", "Sandalwood", "Musk"],
    price: 599,
    mrp: 899,
    faqs: [
      {
        q: "How long does Oud Gulaab last?",
        a: "Easily 6-8 hours — rose and oud both have staying power.",
      },
      {
        q: "What does Oud Gulaab smell like?",
        a: "Romantic but not sweet. Bright rose first, then a soft resinous oud underneath.",
      },
      {
        q: "Can I wear this every day?",
        a: "Yes, though it really comes alive in the evening.",
      },
    ],
  },
  {
    id: "fitoor",
    name: "Fitoor",
    category: "Unisex Fruity Woody Parfum",
    tag: "Juicy · Woody · Everyday",
    mood: "Workdays · Travel · The everyday win",
    meaning: "Fitoor means obsession — the good kind.",
    occasion: "everyday",
    intensity: "bold",
    longevity: "6–8 hours",
    hook: "It smells like pineapple, vanilla and a little bit of obsession.",
    image: imgFitoor,
    story:
      "Juicy pineapple and apple lead, soft woods sit underneath, and a warm vanilla-musk trail closes it out. This is the one you reach for without thinking, the scent that becomes part of your routine before you notice it happened.",
    notes: ["Pineapple", "Apple", "Vanilla", "Musk"],
    price: 499,
    mrp: 749,
    faqs: [
      { q: "How long does Fitoor last?", a: "6-8 hours, fresh through the day." },
      {
        q: "What does Fitoor smell like?",
        a: "Fruity and woody, sweet but not heavy — the kind of scent people ask you about.",
      },
      {
        q: "Summer or winter?",
        a: "Both. Light enough for daily wear, warm enough to hold up in cooler months.",
      },
    ],
  },
  {
    id: "dariya",
    name: "Dariya",
    category: "Unisex Fresh Aquatic Parfum",
    tag: "Clean · Citrus · Open water",
    mood: "Mornings · The commute · Coming up for air",
    meaning: "Dariya means river — and it wears like one.",
    occasion: "morning",
    intensity: "soft",
    longevity: "Around 6 hours",
    hook: "It smells like bergamot, vetiver and open water.",
    image: imgDariya,
    story:
      "Bergamot and mandarin open it up clean, vetiver carries it home. The fresh, aquatic note BADR's lineup was missing, for the days you want to feel like you just stepped outside.",
    notes: ["Bergamot", "Mandarin", "Vetiver"],
    price: 499,
    mrp: 749,
    faqs: [
      {
        q: "How long does Dariya last?",
        a: "Around 6 hours — freshies wear lighter by design.",
      },
      {
        q: "What does Dariya smell like?",
        a: "Clean citrus that dries down to an earthy vetiver.",
      },
      {
        q: "When should I wear it?",
        a: "Mornings, workdays, gym bag — anywhere you want to smell awake.",
      },
    ],
  },
  {
    id: "ulfat",
    name: "Ulfat",
    category: "Unisex Gourmand Vanilla Parfum",
    tag: "Sweet · Amber · Close",
    mood: "Date nights · Cold evenings · Being someone's favourite",
    occasion: "close",
    intensity: "soft",
    longevity: "8+ hours",
    hook: "It smells like vanilla, amber and being close to someone.",
    image: imgUlfat,
    story:
      "Ulfat means affection, and it's the softest thing in the BADR lineup. Lavender opens it, vanilla carries the heart, amber wraps it up warm. The gourmand attar BADR never had until now — sweet without asking for permission.",
    notes: ["Lavender", "Vanilla", "Amber"],
    price: 499,
    mrp: 749,
    faqs: [
      {
        q: "How long does Ulfat last?",
        a: "Vanilla and amber both linger — expect 8+ hours.",
      },
      {
        q: "What does Ulfat smell like?",
        a: "Warm, sweet, a little addictive. Not sugary — more like skin-warmed vanilla.",
      },
      {
        q: "When should I wear it?",
        a: "Cold weather, date nights, anytime you want people to lean in.",
      },
    ],
  },
];

export const FREE_SHIPPING_THRESHOLD = 999;
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
