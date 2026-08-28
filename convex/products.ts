import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  BOOK_SUBJECT_KEYS,
  BOOK_SUBJECT_LABELS,
  nowIso,
  publicProduct,
  publicProductCard,
  requireAdmin,
  writeAuditLog,
} from "./lib";

const productInput = {
  name: v.string(),
  slug: v.optional(v.union(v.string(), v.null())),
  short_description: v.optional(v.union(v.string(), v.null())),
  description: v.optional(v.union(v.string(), v.null())),
  author: v.optional(v.union(v.string(), v.null())),
  publisher: v.optional(v.union(v.string(), v.null())),
  language: v.optional(v.union(v.string(), v.null())),
  pages: v.optional(v.union(v.number(), v.null())),
  isbn: v.optional(v.union(v.string(), v.null())),
  binding: v.optional(v.union(v.string(), v.null())),
  edition: v.optional(v.union(v.string(), v.null())),
  weight_g: v.optional(v.union(v.number(), v.null())),
  length_cm: v.optional(v.union(v.number(), v.null())),
  width_cm: v.optional(v.union(v.number(), v.null())),
  height_cm: v.optional(v.union(v.number(), v.null())),
  shipping_class: v.optional(v.union(v.string(), v.null())),
  weight_source_url: v.optional(v.union(v.string(), v.null())),
  weight_confidence: v.optional(v.union(v.string(), v.null())),
  price: v.optional(v.number()),
  price_inr: v.number(),
  sale_price: v.optional(v.union(v.number(), v.null())),
  sale_price_inr: v.optional(v.union(v.number(), v.null())),
  sku: v.optional(v.union(v.string(), v.null())),
  stock_quantity: v.optional(v.union(v.number(), v.null())),
  category: v.optional(v.union(v.string(), v.null())),
  category_id: v.optional(v.union(v.string(), v.null())),
  tags: v.optional(v.union(v.array(v.string()), v.null())),
  cover_image_url: v.optional(v.union(v.string(), v.null())),
  images: v.optional(v.union(v.array(v.string()), v.null())),
  linked_product_ids: v.optional(v.union(v.array(v.string()), v.null())),
  variant_label: v.optional(v.union(v.string(), v.null())),
  color_options: v.optional(v.union(v.array(v.string()), v.null())),
  size_options: v.optional(v.union(v.array(v.string()), v.null())),
  option_types: v.optional(v.union(v.array(v.any()), v.null())),
  badge: v.optional(v.union(v.string(), v.null())),
  rating: v.optional(v.union(v.number(), v.null())),
  reviews_count: v.optional(v.union(v.number(), v.null())),
  is_active: v.optional(v.union(v.boolean(), v.null())),
  is_featured: v.optional(v.union(v.boolean(), v.null())),
  show_in_category_section: v.optional(v.union(v.boolean(), v.null())),
  is_new_arrival: v.optional(v.union(v.boolean(), v.null())),
  is_bestseller: v.optional(v.union(v.boolean(), v.null())),
  is_on_sale: v.optional(v.union(v.boolean(), v.null())),
  in_stock: v.optional(v.union(v.boolean(), v.null())),
};

const productPatch = {
  name: v.optional(v.string()),
  slug: v.optional(v.union(v.string(), v.null())),
  short_description: v.optional(v.union(v.string(), v.null())),
  description: v.optional(v.union(v.string(), v.null())),
  author: v.optional(v.union(v.string(), v.null())),
  publisher: v.optional(v.union(v.string(), v.null())),
  language: v.optional(v.union(v.string(), v.null())),
  pages: v.optional(v.union(v.number(), v.null())),
  isbn: v.optional(v.union(v.string(), v.null())),
  binding: v.optional(v.union(v.string(), v.null())),
  edition: v.optional(v.union(v.string(), v.null())),
  weight_g: v.optional(v.union(v.number(), v.null())),
  length_cm: v.optional(v.union(v.number(), v.null())),
  width_cm: v.optional(v.union(v.number(), v.null())),
  height_cm: v.optional(v.union(v.number(), v.null())),
  shipping_class: v.optional(v.union(v.string(), v.null())),
  weight_source_url: v.optional(v.union(v.string(), v.null())),
  weight_confidence: v.optional(v.union(v.string(), v.null())),
  price: v.optional(v.number()),
  price_inr: v.optional(v.number()),
  sale_price: v.optional(v.union(v.number(), v.null())),
  sale_price_inr: v.optional(v.union(v.number(), v.null())),
  sku: v.optional(v.union(v.string(), v.null())),
  stock_quantity: v.optional(v.union(v.number(), v.null())),
  category: v.optional(v.union(v.string(), v.null())),
  category_id: v.optional(v.union(v.string(), v.null())),
  tags: v.optional(v.union(v.array(v.string()), v.null())),
  cover_image_url: v.optional(v.union(v.string(), v.null())),
  images: v.optional(v.union(v.array(v.string()), v.null())),
  linked_product_ids: v.optional(v.union(v.array(v.string()), v.null())),
  variant_label: v.optional(v.union(v.string(), v.null())),
  color_options: v.optional(v.union(v.array(v.string()), v.null())),
  size_options: v.optional(v.union(v.array(v.string()), v.null())),
  option_types: v.optional(v.union(v.array(v.any()), v.null())),
  badge: v.optional(v.union(v.string(), v.null())),
  rating: v.optional(v.union(v.number(), v.null())),
  reviews_count: v.optional(v.union(v.number(), v.null())),
  is_active: v.optional(v.union(v.boolean(), v.null())),
  is_featured: v.optional(v.union(v.boolean(), v.null())),
  show_in_category_section: v.optional(v.union(v.boolean(), v.null())),
  is_new_arrival: v.optional(v.union(v.boolean(), v.null())),
  is_bestseller: v.optional(v.union(v.boolean(), v.null())),
  is_on_sale: v.optional(v.union(v.boolean(), v.null())),
  in_stock: v.optional(v.union(v.boolean(), v.null())),
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function cleanText(value: string | null | undefined, max = 500) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanNullable(value: string | null | undefined, max = 500) {
  const next = cleanText(value, max);
  return next.length ? next : null;
}

function cleanUrl(value: string | null | undefined) {
  const url = cleanText(value, 1000);
  if (!url) return null;
  if (
    /^https?:\/\//i.test(url) ||
    /^\/api\/storage\//i.test(url) ||
    /^\/images\//i.test(url) ||
    /^\/assets\//i.test(url) ||
    /^\/photoroom\//i.test(url)
  ) {
    return url;
  }
  throw new Error(
    "Image URL must be http(s), a Convex storage URL, or an approved public asset URL.",
  );
}

function normalize(input: any, isPatch = false, existingPrice?: number) {
  const timestamp = nowIso();
  const output: Record<string, any> = { updated_at: timestamp };
  if (input.name !== undefined) {
    const name = cleanText(input.name, 180);
    if (!name) throw new Error("Product name is required.");
    output.name = name;
    output.slug = cleanNullable(input.slug, 100) || slugify(name);
  } else if (input.slug !== undefined) {
    output.slug = cleanNullable(input.slug, 100);
  }

  if (!isPatch || input.price_inr !== undefined || input.price !== undefined) {
    const priceInr = Number(input.price_inr ?? input.price ?? 0);
    if (!Number.isFinite(priceInr) || priceInr < 0)
      throw new Error("Product price must be a positive number.");
    output.price = priceInr;
    output.price_inr = priceInr;
  }
  if (input.sale_price_inr !== undefined || input.sale_price !== undefined || !isPatch) {
    const salePriceInr =
      input.sale_price_inr == null && input.sale_price == null
        ? null
        : Number(input.sale_price_inr ?? input.sale_price);
    const priceLimit =
      output.price_inr ??
      existingPrice ??
      Number(input.price_inr ?? input.price ?? Number.POSITIVE_INFINITY);
    if (
      salePriceInr != null &&
      (!Number.isFinite(salePriceInr) || salePriceInr < 0 || salePriceInr > priceLimit)
    ) {
      throw new Error("Sale price must be between ₹0 and the regular price.");
    }
    output.sale_price = salePriceInr;
    output.sale_price_inr = salePriceInr;
    output.is_on_sale = input.is_on_sale ?? Boolean(salePriceInr && salePriceInr > 0);
  }
  if (input.stock_quantity !== undefined || !isPatch) {
    const stock = input.stock_quantity == null ? 0 : Math.floor(Number(input.stock_quantity));
    if (!Number.isFinite(stock) || stock < 0)
      throw new Error("Stock must be a positive whole number.");
    output.stock_quantity = stock;
    output.in_stock = stock > 0;
  }

  const stringFields: Array<[string, number]> = [
    ["short_description", 280],
    ["description", 5000],
    ["author", 120],
    ["publisher", 120],
    ["language", 40],
    ["isbn", 40],
    ["binding", 80],
    ["edition", 80],
    ["shipping_class", 80],
    ["weight_source_url", 500],
    ["weight_confidence", 40],
    ["sku", 80],
    ["category", 80],
    ["category_id", 80],
    ["variant_label", 80],
    ["badge", 40],
  ];
  for (const [field, max] of stringFields) {
    if (input[field] !== undefined || !isPatch) output[field] = cleanNullable(input[field], max);
  }
  for (const field of ["weight_g", "length_cm", "width_cm", "height_cm"]) {
    if (input[field] !== undefined || !isPatch) {
      const value = input[field] == null || input[field] === "" ? null : Number(input[field]);
      if (value != null && (!Number.isFinite(value) || value < 0))
        throw new Error(`${field} must be a positive number.`);
      output[field] = value;
    }
  }
  if (input.cover_image_url !== undefined || !isPatch)
    output.cover_image_url = cleanUrl(input.cover_image_url);
  if (input.tags !== undefined || !isPatch) {
    output.tags = Array.isArray(input.tags)
      ? input.tags
          .map((tag: string) => cleanText(tag, 40))
          .filter(Boolean)
          .slice(0, 20)
      : [];
  }
  if (input.images !== undefined || !isPatch) {
    output.images = Array.isArray(input.images)
      ? input.images
          .map((url: string) => cleanUrl(url))
          .filter(Boolean)
          .slice(0, 8)
      : [];
  }
  if (input.linked_product_ids !== undefined || !isPatch) {
    output.linked_product_ids = Array.isArray(input.linked_product_ids)
      ? input.linked_product_ids
          .map((id: string) => cleanText(id, 80))
          .filter(Boolean)
          .slice(0, 12)
      : [];
  }
  for (const field of ["color_options", "size_options"]) {
    if (input[field] !== undefined || !isPatch) {
      output[field] = Array.isArray(input[field])
        ? Array.from(
            new Set(input[field].map((option: string) => cleanText(option, 60)).filter(Boolean)),
          ).slice(0, 30)
        : [];
    }
  }
  if (input.option_types !== undefined || !isPatch) {
    output.option_types = Array.isArray(input.option_types)
      ? input.option_types
          .map((group: any) => ({
            name: cleanText(group?.name, 60),
            values: Array.isArray(group?.values)
              ? Array.from(
                  new Set(
                    group.values.map((value: string) => cleanText(value, 60)).filter(Boolean),
                  ),
                ).slice(0, 30)
              : [],
          }))
          .filter((group: { name: string; values: string[] }) => group.name && group.values.length)
          .slice(0, 3)
      : [];
  }
  output.is_active = input.is_active ?? (isPatch ? undefined : true);
  output.is_featured = input.is_featured ?? (isPatch ? undefined : false);
  output.show_in_category_section = input.show_in_category_section ?? (isPatch ? undefined : false);
  output.is_new_arrival = input.is_new_arrival ?? (isPatch ? undefined : false);
  output.is_bestseller = input.is_bestseller ?? (isPatch ? undefined : false);
  for (const key of Object.keys(output)) if (output[key] === undefined) delete output[key];
  return output;
}

function isLaunchReady(product: any) {
  return Boolean(product.cover_image_url && (product.description || product.short_description));
}

const BOOK_SUBJECTS = new Set<string>(BOOK_SUBJECT_KEYS);
const TOP_LEVEL_CATEGORIES = new Set(["books", "clothing", "women", "children"]);
const NON_BOOK_CATEGORY_IDS = new Set(["clothing", "children", "essentials"]);

const SUBJECT_PRIORITY = [
  "aqeedah",
  "tafsir",
  "hadith",
  "fiqh",
  "seerah",
  "islamic-history",
  "purification",
  "dua-adhkar",
  "character-development",
  "womens-issues",
  "family-marriage",
  "arabic",
  "urdu",
];

const SUBJECT_ALIASES: Record<string, string> = {
  aqidah: "aqeedah",
  aqeedah: "aqeedah",
  creed: "aqeedah",
  tawheed: "aqeedah",
  tawhid: "aqeedah",
  tazkiyah: "purification",
  spirituality: "purification",
  purification: "purification",
  adab: "character-development",
  manners: "character-development",
  character: "character-development",
  "character development": "character-development",
  dua: "dua-adhkar",
  duaa: "dua-adhkar",
  "du'a": "dua-adhkar",
  "du'a & adhkar": "dua-adhkar",
  "dua & adhkar": "dua-adhkar",
  adhkar: "dua-adhkar",
  azkar: "dua-adhkar",
  dhikr: "dua-adhkar",
  remembrance: "dua-adhkar",
  womens: "womens-issues",
  women: "womens-issues",
  "women's issues": "womens-issues",
  "women issues": "womens-issues",
  "womens issues": "womens-issues",
  sisters: "womens-issues",
  history: "islamic-history",
  "islamic history": "islamic-history",
  marriage: "family-marriage",
  family: "family-marriage",
  "family marriage": "family-marriage",
  "family & marriage": "family-marriage",
  nikah: "family-marriage",
};

const SUBJECT_PATTERNS: Record<string, RegExp[]> = {
  aqeedah: [
    /\baq[ie]e?dah\b/i,
    /\bcreed\b/i,
    /\btawh[ei]ed\b/i,
    /\btawhid\b/i,
    /\bnullifiers?\b/i,
    /\bnawaqid\b/i,
    /\bfaith\b/i,
    /\biman\b/i,
    /\busool\b/i,
    /\bwasitiyyah\b/i,
    /\bhai'?yah\b/i,
    /\bnames?\s+of\s+allah\b/i,
    /\basma/i,
  ],
  arabic: [
    /\barabic\s+(course|language|grammar|reader|reading)\b/i,
    /\bnahw\b/i,
    /\bsarf\b/i,
    /\bajrumiyyah\b/i,
    /\bajroomiyyah\b/i,
    /\bbalagah\b/i,
    /\bnuraniyyah\b/i,
    /\bnooraniyyah\b/i,
    /\bqa'?idah\b/i,
  ],
  fiqh: [
    /\bfiqh\b/i,
    /\brulings?\b/i,
    /\bwudu\b/i,
    /\bwudhu\b/i,
    /\bsalah\b/i,
    /\bprayer\b/i,
    /\bmarriage\b/i,
    /\bnikah\b/i,
    /\bwomen\b/i,
    /\bobligatory\s+duties\b/i,
    /\bbulugh\b/i,
  ],
  hadith: [
    /\bhadith\b/i,
    /\bahadith\b/i,
    /\bsunnah\b/i,
    /\bbukhari\b/i,
    /\bmuslim\b/i,
    /\briyad\b/i,
    /\bsunan\b/i,
    /\badab\b/i,
  ],
  purification: [
    /\btazkiyah\b/i,
    /\bpurification\b/i,
    /\bheart\b/i,
    /\bsoul\b/i,
    /\bsins?\b/i,
    /\btawbah\b/i,
    /\brepentance\b/i,
    /\bdistress\b/i,
    /\bmadarij\b/i,
    /\bdivine\s+seekers\b/i,
  ],
  seerah: [
    /\bseerah\b/i,
    /\bprophet'?s?\s+(life|biograph|story|stories|wives|companions|description|depiction)\b/i,
    /\bdepiction\s+of\s+the\s+prophet\b/i,
    /\bsealed\s+nectar\b/i,
    /\bmoon\s+split\b/i,
    /\bbiograph/i,
    /\bwives\s+of\s+the\s+prophet\b/i,
    /\bshama/i,
  ],
  tafsir: [/\btafsir\b/i, /\bexegesis\b/i, /\bahsanul\s+bayan\b/i, /\bqur'?anic\s+commentary\b/i],
  urdu: [/\burdu\b/i],
  "character-development": [
    /\badab\b/i,
    /\bakhlaq\b/i,
    /\bcharacter\b/i,
    /\bmanners?\b/i,
    /\bmorals?\b/i,
    /\betiquette\b/i,
    /\bsins?\b/i,
    /\btazkiyah\b/i,
  ],
  "dua-adhkar": [
    /\bdu['a]*a\b/i,
    /\bdua\b/i,
    /\badhkar\b/i,
    /\bazkar\b/i,
    /\bdhikr\b/i,
    /\bsupplications?\b/i,
    /\bremembrance\b/i,
    /\bdistress\b/i,
    /\byunus\b/i,
  ],
  "womens-issues": [
    /\bwomen'?s?\b/i,
    /\bwoman'?s?\b/i,
    /\bsister\b/i,
    /\bsisters\b/i,
    /\bmuslim women\b/i,
    /\bwives\b/i,
    /\bmother\b/i,
  ],
  "islamic-history": [
    /\bhistory\b/i,
    /\bbiograph/i,
    /\bseerah\b/i,
    /\bprophet'?s?\s+(life|story|stories|wives|companions|description|depiction)\b/i,
    /\bcompanions\b/i,
    /\bsahabah\b/i,
    /\bsealed\s+nectar\b/i,
    /\bmoon\s+split\b/i,
    /\bnations?\b/i,
  ],
  "family-marriage": [
    /\bfamily\b/i,
    /\bmarriage\b/i,
    /\bnikah\b/i,
    /\bparenting\b/i,
    /\braising\b/i,
    /\bchildren\b/i,
    /\bchild\b/i,
    /\bhome\b/i,
    /\bwives\b/i,
  ],
};

function normalizeSubject(value: unknown): string | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  if (!normalized || normalized === "books") return null;
  if (BOOK_SUBJECTS.has(normalized)) return normalized;
  const compact = normalized.replace(/-/g, " ");
  const byLabel = Object.entries(BOOK_SUBJECT_LABELS).find(
    ([, label]) => label.toLowerCase() === compact,
  )?.[0];
  if (byLabel) return byLabel;
  return SUBJECT_ALIASES[compact] ?? SUBJECT_ALIASES[normalized] ?? null;
}

function looksLikeBook(product: any) {
  return Boolean(
    product.author || product.publisher || product.isbn || product.pages || product.binding,
  );
}

function collectBookSubjects(product: any) {
  const keys = new Set<string>();
  for (const value of [product.category_id, product.category]) {
    const subject = normalizeSubject(value);
    if (subject) keys.add(subject);
  }
  const tags = Array.isArray(product.tags) ? product.tags : [];
  for (const tag of tags) {
    const subject = normalizeSubject(tag);
    if (subject) keys.add(subject);
  }
  const signalText = [
    product.name,
    product.slug,
    product.author,
    product.publisher,
    product.short_description,
    product.description,
    product.language,
    product.category,
    product.category_id,
    ...tags,
  ]
    .filter(Boolean)
    .join(" ");
  for (const [key, patterns] of Object.entries(SUBJECT_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(signalText))) keys.add(key);
  }
  if (
    String(product.language ?? "")
      .toLowerCase()
      .includes("urdu")
  )
    keys.add("urdu");
  return SUBJECT_PRIORITY.filter((key) => keys.has(key));
}

function primarySubjectForProduct(product: any, subjects: string[]) {
  const existingSubject =
    normalizeSubject(product.category_id) ?? normalizeSubject(product.category);
  if (existingSubject) return existingSubject;

  const titleText = [product.name, product.slug].filter(Boolean).join(" ");

  const preferred: Array<[string, RegExp[]]> = [
    [
      "family-marriage",
      [
        /\bmarriage\b/i,
        /\bnikah\b/i,
        /\bspouses?\b/i,
        /\bfamily\b/i,
        /\braising\b/i,
        /\bparenting\b/i,
      ],
    ],
    ["womens-issues", [/\bwomen'?s?\b/i, /\bwoman'?s?\b/i, /\bsisters?\b/i, /\bmuslim women\b/i]],
    [
      "dua-adhkar",
      [
        /\bdu['a]*a\b/i,
        /\bdua\b/i,
        /\badhkar\b/i,
        /\bazkar\b/i,
        /\bdhikr\b/i,
        /\bsupplications?\b/i,
        /\bremembrance\b/i,
        /\bdistress\b/i,
        /\byunus\b/i,
      ],
    ],
    [
      "purification",
      [
        /\btazkiyah\b/i,
        /\bpurification\b/i,
        /\bheart\b/i,
        /\bsoul\b/i,
        /\bsins?\b/i,
        /\bdisease\b/i,
        /\bcure\b/i,
        /\bdeceptions?\b/i,
        /\bdisciplining\b/i,
        /\bdivine\s+seekers\b/i,
      ],
    ],
    [
      "seerah",
      [
        /\bseerah\b/i,
        /\bsealed\s+nectar\b/i,
        /\bmoon\s+split\b/i,
        /\bprophet'?s?\s+(life|biograph|story|stories|description|depiction)\b/i,
      ],
    ],
  ];

  for (const [subject, patterns] of preferred) {
    if (subjects.includes(subject) && patterns.some((pattern) => pattern.test(titleText)))
      return subject;
  }

  return SUBJECT_PRIORITY.find((key) => subjects.includes(key)) ?? subjects[0] ?? "aqeedah";
}

function subjectPatchForProduct(product: any) {
  const currentCategory = String(product.category ?? "")
    .trim()
    .toLowerCase();
  const currentCategoryId = String(product.category_id ?? "")
    .trim()
    .toLowerCase();
  if (NON_BOOK_CATEGORY_IDS.has(currentCategory) || NON_BOOK_CATEGORY_IDS.has(currentCategoryId))
    return null;
  const isBook =
    currentCategory === "books" ||
    currentCategoryId === "books" ||
    BOOK_SUBJECTS.has(currentCategory) ||
    BOOK_SUBJECTS.has(currentCategoryId) ||
    looksLikeBook(product);
  if (!isBook) return null;

  const subjects = collectBookSubjects(product);
  const primary = primarySubjectForProduct(product, subjects);
  const orderedSubjects = SUBJECT_PRIORITY.filter(
    (key) => key === primary || subjects.includes(key),
  );
  const subjectLabels = orderedSubjects.map((key) => BOOK_SUBJECT_LABELS[key]).filter(Boolean);
  const rawTags = Array.isArray(product.tags) ? product.tags : [];
  const subjectLabelSet = new Set(Object.values(BOOK_SUBJECT_LABELS));
  const nonSubjectTags = rawTags.filter(
    (tag: string) => !subjectLabelSet.has(tag) && !normalizeSubject(tag),
  );
  const tags = Array.from(new Set([...subjectLabels, ...nonSubjectTags])).slice(0, 30);

  return {
    category: "books",
    category_id: primary,
    tags,
    subjects: orderedSubjects,
  };
}

function topCategoryForProduct(product: any) {
  const category = String(product.category ?? "").toLowerCase();
  const categoryId = String(product.category_id ?? "").toLowerCase();
  if (categoryId === "essentials") return "children";
  if (TOP_LEVEL_CATEGORIES.has(categoryId) && categoryId !== "books") return categoryId;
  if (
    category === "books" ||
    categoryId === "books" ||
    BOOK_SUBJECTS.has(category) ||
    BOOK_SUBJECTS.has(categoryId)
  )
    return "books";
  if (
    category === "essentials" ||
    categoryId === "essentials" ||
    category === "children" ||
    categoryId === "children"
  )
    return "children";
  return category || categoryId || null;
}

export const listActiveProducts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();
    return rows
      .filter(isLaunchReady)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .map(publicProductCard);
  },
});

export const listAllProducts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("products").collect();
    return rows
      .map(publicProduct)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  },
});

export const getProductById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const doc = (await ctx.db.get(args.id as any)) as any;
    if (!doc || doc.is_active === false || !isLaunchReady(doc)) return null;
    return publicProduct(doc);
  },
});

export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!doc || doc.is_active === false || !isLaunchReady(doc)) return null;
    return publicProduct(doc);
  },
});

export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const requested = args.category === "essentials" ? "children" : args.category;
    const rows = await ctx.db.query("products").collect();
    return rows
      .filter(
        (p) => p.is_active !== false && isLaunchReady(p) && topCategoryForProduct(p) === requested,
      )
      .map(publicProductCard);
  },
});

export const listByIds = query({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const docs = await Promise.all(args.ids.map((id) => ctx.db.get(id as any)));
    return docs
      .filter((doc) => doc && (doc as any).is_active !== false && isLaunchReady(doc))
      .map((doc) => publicProductCard(doc as any));
  },
});

export const createProduct = mutation({
  args: productInput,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const timestamp = nowIso();
    const payload = normalize(args);
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", payload.slug))
      .first();
    if (existing) throw new Error("A product with this slug already exists.");
    const id = await ctx.db.insert("products", { ...payload, created_at: timestamp } as any);
    await writeAuditLog(ctx, {
      action: "product.create",
      entityType: "product",
      entityId: String(id),
      summary: payload.name,
      metadata: {
        slug: payload.slug,
        category: payload.category,
        category_id: payload.category_id,
      },
    });
    const doc = await ctx.db.get(id);
    return doc ? publicProduct(doc) : null;
  },
});

export const updateProduct = mutation({
  args: { id: v.string(), patch: v.object(productPatch) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = (await ctx.db.get(args.id as any)) as any;
    if (!current) throw new Error("Product not found.");
    const payload = normalize(args.patch, true, current.price_inr ?? current.price);
    if (payload.slug) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", payload.slug))
        .first();
      if (existing && String(existing._id) !== args.id)
        throw new Error("A product with this slug already exists.");
    }
    await ctx.db.patch(args.id as any, payload);
    await writeAuditLog(ctx, {
      action: "product.update",
      entityType: "product",
      entityId: args.id,
      summary: payload.name ?? current.name,
      metadata: { changed: Object.keys(payload).filter((key) => key !== "updated_at") },
    });
    const doc = (await ctx.db.get(args.id as any)) as any;
    return doc ? publicProduct(doc) : null;
  },
});

export const assignBookSubjects = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("products").collect();
    const updates = rows
      .map((product: any) => {
        const patch = subjectPatchForProduct(product);
        if (!patch) return null;
        const currentTags = Array.isArray(product.tags) ? product.tags : [];
        const changed =
          product.category !== patch.category ||
          product.category_id !== patch.category_id ||
          JSON.stringify(currentTags) !== JSON.stringify(patch.tags);
        return {
          id: String(product._id),
          name: product.name,
          slug: product.slug,
          category: product.category,
          category_id: product.category_id,
          next_category_id: patch.category_id,
          subjects: patch.subjects,
          tags: patch.tags,
          changed,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      slug: string | null;
      category: string | null;
      category_id: string | null;
      next_category_id: string;
      subjects: string[];
      tags: string[];
      changed: boolean;
    }>;

    if (!args.dryRun) {
      const timestamp = nowIso();
      for (const update of updates.filter((item) => item.changed)) {
        await ctx.db.patch(update.id as any, {
          category: "books",
          category_id: update.next_category_id,
          tags: update.tags,
          updated_at: timestamp,
        });
      }
      await writeAuditLog(ctx, {
        action: "product.assign_book_subjects",
        entityType: "product",
        summary: "Assigned book subjects",
        metadata: {
          updated: updates.filter((item) => item.changed).length,
          inspected: updates.length,
        },
      });
    }

    return {
      dryRun: Boolean(args.dryRun),
      inspected: updates.length,
      changed: updates.filter((item) => item.changed).length,
      samples: updates.slice(0, 80).map((item) => ({
        name: item.name,
        slug: item.slug,
        from: item.category_id ?? item.category,
        to: item.next_category_id,
        subjects: item.subjects,
        changed: item.changed,
      })),
    };
  },
});

export const deleteProduct = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const current = (await ctx.db.get(args.id as any)) as any;
    await ctx.db.delete(args.id as any);
    await writeAuditLog(ctx, {
      action: "product.delete",
      entityType: "product",
      entityId: args.id,
      summary: current?.name ?? null,
      metadata: { slug: current?.slug ?? null },
    });
    return true;
  },
});

export const generateProductImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getProductImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.storage.getUrl(args.storageId as any);
  },
});
