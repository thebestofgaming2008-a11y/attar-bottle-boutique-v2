export type JournalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type JournalArticle = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  published: string;
  updated: string;
  readingTime: string;
  keywords: string[];
  sections: JournalSection[];
  productSlugs: string[];
};

export const JOURNAL_ARTICLES: JournalArticle[] = [
  {
    slug: "how-to-apply-attar",
    title: "How to Apply Attar: A Simple Roll-On Ritual",
    shortTitle: "How to apply attar",
    description:
      "Learn where and how to apply roll-on attar perfume oil, how much to use, and how to let a fragrance develop naturally on skin.",
    published: "2026-08-31",
    updated: "2026-08-31",
    readingTime: "4 minute read",
    keywords: ["how to apply attar", "roll-on perfume oil", "attar pulse points"],
    productSlugs: ["oud-zafar", "dariya", "ulfat"],
    sections: [
      {
        heading: "Begin with clean, dry skin",
        paragraphs: [
          "Attar is concentrated perfume oil, so a small application is enough to begin. Use the roll-on after bathing or on clean, dry skin. This gives the fragrance a neutral surface and makes it easier to judge how much you actually need.",
          "Do not try to create a cloud of fragrance. Attar is designed for controlled, close application. Start lightly, wait for the oil to settle, and add more only if you want a stronger presence.",
        ],
      },
      {
        heading: "Choose warm pulse points",
        paragraphs: [
          "Roll the bottle lightly over the wrists, inner elbows, sides of the neck, or behind the ears. These warmer areas help the scent open gradually as you move through the day.",
        ],
        bullets: [
          "Use one short pass rather than repeatedly rolling over the same area.",
          "Apply to two or three pulse points first.",
          "Avoid broken, irritated, or freshly shaved skin.",
        ],
      },
      {
        heading: "Let the fragrance settle",
        paragraphs: [
          "After applying, let the oil dry naturally. Rubbing the wrists together changes how the opening develops and can spread the oil beyond the area you intended.",
          "Smell the fragrance again after several minutes. The first impression is only the opening; the heart and drydown reveal the warmer or deeper parts of the composition.",
        ],
      },
      {
        heading: "Adjust for skin, weather and setting",
        paragraphs: [
          "Fragrance behaves differently with skin chemistry, temperature and humidity. A warm day may make a scent feel more present, while cool conditions can keep it closer to the skin. Office wear usually calls for less than an evening setting.",
          "If you apply attar to fabric, test an unseen area first. Perfume oil can mark delicate or pale materials. Skin application remains the simplest way to experience how the scent develops on you.",
        ],
      },
    ],
  },
  {
    slug: "choose-attar-by-scent",
    title: "How to Choose an Attar by Scent Profile",
    shortTitle: "Choose your scent profile",
    description:
      "A clear guide to choosing between oud, rose, fruity, aquatic and vanilla attar perfume oils in the BADR collection.",
    published: "2026-08-31",
    updated: "2026-08-31",
    readingTime: "5 minute read",
    keywords: ["how to choose attar", "attar scent profiles", "best attar fragrance"],
    productSlugs: ["oud-zafar", "oud-gulaab", "fitoor", "dariya", "ulfat"],
    sections: [
      {
        heading: "Choose by character, not gender",
        paragraphs: [
          "Every BADR fragrance is made for all genders. The useful question is not who a scent is supposedly for, but what atmosphere you want it to create: deep, floral, bright, clean, or warm.",
          "Begin with notes you already enjoy, then look at the overall profile. A single note never tells the whole story; oud can feel commanding beside saffron, or more romantic beside rose and musk.",
        ],
      },
      {
        heading: "Deep and commanding: Oud Zafar",
        paragraphs: [
          "Oud Zafar brings together oud, saffron, rose, amber and sandalwood. Choose it when you want warmth, depth and a more deliberate presence rather than a fresh or casual profile.",
        ],
      },
      {
        heading: "Floral and composed: Oud Gulaab",
        paragraphs: [
          "Oud Gulaab places rose at the centre with oud, sandalwood and musk around it. It suits someone who wants a clear floral identity without losing the darker structure of woods and musk.",
        ],
      },
      {
        heading: "Bright or clean: Fitoor and Dariya",
        paragraphs: [
          "Fitoor uses pineapple and apple with vanilla, woods and musk for a fruity-woody direction. Dariya is the cleaner option, pairing bergamot and mandarin with vetiver for a fresh aquatic-citrus impression.",
        ],
      },
      {
        heading: "Soft and warm: Ulfat",
        paragraphs: [
          "Ulfat combines vanilla, lavender and amber. Choose it when you want a gentler gourmand warmth that stays close and feels suited to evenings or quieter settings.",
        ],
      },
    ],
  },
  {
    slug: "attar-vs-spray-perfume",
    title: "Attar vs Spray Perfume: What Actually Changes?",
    shortTitle: "Attar vs spray perfume",
    description:
      "Compare concentrated roll-on attar perfume oil with spray fragrance by application, feel, projection, portability and control.",
    published: "2026-08-31",
    updated: "2026-08-31",
    readingTime: "5 minute read",
    keywords: ["attar vs perfume", "perfume oil vs spray", "roll-on attar"],
    productSlugs: ["fitoor", "dariya", "oud-gulaab"],
    sections: [
      {
        heading: "The main difference is the format",
        paragraphs: [
          "A spray perfume disperses fragrance through an atomiser. A roll-on attar places concentrated perfume oil directly onto a chosen area of skin. That change in application affects how much control you have and how the scent is experienced around you.",
          "Neither format is automatically better. The right choice depends on whether you prefer a broader spray or a compact oil that can be applied precisely.",
        ],
      },
      {
        heading: "Attar gives you precise application",
        paragraphs: [
          "A roll-on lets you decide exactly where the fragrance sits and how much you apply. This makes it easy to begin lightly and build only when needed. It also avoids spraying fragrance into the surrounding air.",
        ],
      },
      {
        heading: "Projection and wear are personal",
        paragraphs: [
          "Sprays often create a wider initial cloud, while oils commonly begin closer to the application point. The final result still depends on the formula, amount used, skin, weather and movement.",
          "Do not judge either format only by the first minute. Fragrance changes as the opening gives way to its heart and drydown.",
        ],
      },
      {
        heading: "A compact bottle changes the routine",
        paragraphs: [
          "BADR attars come in 6 ml roll-on bottles. The compact format is easy to carry and allows a controlled reapplication without handling a full-size spray bottle. Keep the cap secure and store the bottle upright away from excessive heat and direct sunlight.",
        ],
      },
    ],
  },
  {
    slug: "oud-attar-guide",
    title: "A Clear Guide to Oud Attar",
    shortTitle: "Understanding oud attar",
    description:
      "Understand how oud works with saffron, rose, amber, sandalwood and musk, and compare BADR's two oud-led attar profiles.",
    published: "2026-08-31",
    updated: "2026-08-31",
    readingTime: "5 minute read",
    keywords: ["oud attar guide", "oud perfume oil", "oud and rose attar"],
    productSlugs: ["oud-zafar", "oud-gulaab"],
    sections: [
      {
        heading: "Oud is a structure, not a single mood",
        paragraphs: [
          "Oud is associated with a dark, woody depth, but the ingredients around it decide whether the finished scent feels dry, floral, warm, smoky, soft or commanding. Looking only for the word oud is therefore not enough when choosing a fragrance.",
        ],
      },
      {
        heading: "Oud with saffron and amber",
        paragraphs: [
          "Saffron adds a dry spiced warmth, while amber rounds the composition with a deeper glow. Sandalwood can make the base feel smoother and more composed. In Oud Zafar, these notes support a profile designed to feel deep, warm and commanding.",
        ],
      },
      {
        heading: "Oud with rose and musk",
        paragraphs: [
          "Rose gives oud a floral centre instead of treating it only as a heavy base note. Musk softens the edges and keeps the drydown close. Oud Gulaab follows this direction with rose, oud, sandalwood and musk.",
        ],
      },
      {
        heading: "How to choose between the two",
        paragraphs: [
          "Choose Oud Zafar for saffron, amber and a more commanding woody warmth. Choose Oud Gulaab when you want the oud framed by a recognisable rose heart and a softer musky finish.",
          "Apply either lightly at first. Oud-led compositions reward patience; give the opening time to settle before deciding whether to add more.",
        ],
      },
    ],
  },
];

export const JOURNAL_BY_SLUG = new Map(JOURNAL_ARTICLES.map((article) => [article.slug, article]));
