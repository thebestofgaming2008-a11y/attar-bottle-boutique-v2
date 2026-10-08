export type SeoCollection = {
  slug: string;
  name: string;
  shortName: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  productIds: string[];
  sections: Array<{ heading: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

export const SEO_COLLECTIONS: SeoCollection[] = [
  {
    slug: "oud-attar",
    name: "Oud attar perfume oils",
    shortName: "Oud attar",
    title: "Oud Attar Perfume Oils Online | BADR India",
    description:
      "Explore BADR oud attar perfume oils made for all genders. Compare warm saffron oud with rose oud in concentrated 6 ml roll-on bottles.",
    eyebrow: "Deep woods · Warm spice · Rose",
    intro:
      "BADR's oud collection takes two distinct routes: Oud Zafar pairs oud with saffron, amber and sandalwood, while Oud Gulaab brings rose, musk and soft woods to the centre.",
    productIds: ["oud-zafar", "oud-gulaab"],
    sections: [
      {
        heading: "What does oud attar smell like?",
        body: "Oud gives a fragrance a dark, woody structure, but the notes around it decide the mood. Saffron and amber make it feel drier and warmer; rose and musk make the same woody base feel softer and more floral.",
      },
      {
        heading: "Choosing between BADR's oud scents",
        body: "Choose Oud Zafar when you want a bold evening profile with saffron, amber and sandalwood. Choose Oud Gulaab when you want rose to lead, supported by oud, sandalwood and musk.",
      },
      {
        heading: "How to wear concentrated oud oil",
        body: "Begin with one light pass on a pulse point and allow the fragrance to settle before adding more. Oud-led oils develop gradually, so the drydown is a better guide than the first minute.",
      },
    ],
    faqs: [
      {
        question: "Is BADR oud attar alcohol-free?",
        answer:
          "Yes. BADR oud fragrances are concentrated, alcohol-free perfume oils supplied in 6 ml roll-on bottles.",
      },
      {
        question: "Can all genders wear BADR oud attars?",
        answer:
          "Yes. BADR fragrances are designed for all genders; choose between the warm saffron profile of Oud Zafar and the floral rose profile of Oud Gulaab.",
      },
    ],
  },
  {
    slug: "fresh-attar",
    name: "Fresh attar perfume oils",
    shortName: "Fresh attar",
    title: "Fresh Attar Perfume Oils | Citrus & Fruity BADR Scents",
    description:
      "Shop fresh BADR attar perfume oils for all genders. Compare Dariya's bergamot and vetiver with Fitoor's pineapple, apple and woods.",
    eyebrow: "Citrus · Fruit · Clean woods",
    intro:
      "Fresh attar does not have to mean one thing. Dariya is clean and aquatic with bergamot, mandarin and vetiver; Fitoor is brighter and fruitier with pineapple, apple, vanilla and musk.",
    productIds: ["dariya", "fitoor"],
    sections: [
      {
        heading: "A clean citrus route",
        body: "Dariya opens with bergamot and mandarin before settling into earthy vetiver. It is the clearer choice for mornings, workdays and anyone who prefers a crisp scent profile.",
      },
      {
        heading: "A fruitier everyday route",
        body: "Fitoor uses pineapple and apple for brightness, then moves into vanilla, woods and musk. It keeps the lift of a fresh scent while adding a warmer base.",
      },
      {
        heading: "Fresh perfume oil versus spray perfume",
        body: "A roll-on attar places perfume oil directly on selected pulse points instead of dispersing a spray cloud. Start lightly and let body heat reveal the full profile over time.",
      },
    ],
    faqs: [
      {
        question: "Which BADR attar smells the freshest?",
        answer:
          "Dariya is BADR's cleanest aquatic-citrus profile, built around bergamot, mandarin and vetiver. Fitoor is the fruitier fresh option.",
      },
      {
        question: "Are fresh BADR attars suitable for everyday wear?",
        answer:
          "Yes. Both Dariya and Fitoor are designed for everyday use, with compact roll-on bottles that allow controlled application.",
      },
    ],
  },
  {
    slug: "vanilla-attar",
    name: "Vanilla attar perfume oils",
    shortName: "Vanilla attar",
    title: "Vanilla Attar Perfume Oils | Warm Gourmand Scents | BADR",
    description:
      "Explore BADR vanilla attar perfume oils for all genders. Compare Ulfat's vanilla, lavender and amber with Fitoor's fruity vanilla-musk profile.",
    eyebrow: "Vanilla · Amber · Soft musk",
    intro:
      "BADR uses vanilla in two different ways. Ulfat makes it the centre of a warm lavender-and-amber profile; Fitoor uses it beneath pineapple, apple, woods and musk.",
    productIds: ["ulfat", "fitoor"],
    sections: [
      {
        heading: "Warm vanilla and amber",
        body: "Ulfat is the fuller gourmand choice. Vanilla and amber create warmth while lavender keeps the scent composed, making it especially suited to evenings and close settings.",
      },
      {
        heading: "Vanilla under bright fruit",
        body: "Fitoor begins with pineapple and apple, then lets vanilla and musk soften the woody base. Choose it when you want sweetness without giving up a bright opening.",
      },
      {
        heading: "How much vanilla attar to apply",
        body: "Concentrated perfume oil rewards restraint. Apply a short roll to one or two pulse points, wait for the opening to settle, then decide whether the setting calls for more.",
      },
    ],
    faqs: [
      {
        question: "Which BADR attar has the strongest vanilla profile?",
        answer:
          "Ulfat places vanilla at the heart of the fragrance with lavender and amber. Fitoor uses vanilla more softly beneath fruit, woods and musk.",
      },
      {
        question: "Is vanilla attar only for women?",
        answer:
          "No. BADR designs Ulfat and Fitoor for all genders. The choice depends on whether you prefer warm gourmand vanilla or a brighter fruity-woody profile.",
      },
    ],
  },
];

export const SEO_COLLECTION_BY_SLUG = new Map(
  SEO_COLLECTIONS.map((collection) => [collection.slug, collection]),
);
