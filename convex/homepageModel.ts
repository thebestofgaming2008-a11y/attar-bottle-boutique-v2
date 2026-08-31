import { type Infer, v } from "convex/values";

export const homepageCrop = v.object({
  x: v.number(),
  y: v.number(),
  zoom: v.number(),
});

export const homepageMedia = v.object({
  imageUrl: v.string(),
  mobileImageUrl: v.union(v.string(), v.null()),
  mobileCrop: homepageCrop,
  desktopCrop: homepageCrop,
});

const heroSection = v.object({
  id: v.string(),
  type: v.literal("hero"),
  visible: v.boolean(),
  eyebrow: v.string(),
  headline: v.string(),
  subtext: v.string(),
  ctaLabel: v.string(),
  ctaHref: v.string(),
  productIds: v.array(v.string()),
});

const videoSection = v.object({
  id: v.string(),
  type: v.literal("video"),
  visible: v.boolean(),
  poster: homepageMedia,
  videoWebmUrl: v.union(v.string(), v.null()),
  videoMp4Url: v.union(v.string(), v.null()),
  mobileFit: v.union(v.literal("cover"), v.literal("contain")),
  desktopFit: v.union(v.literal("cover"), v.literal("contain")),
  focalPosition: v.union(v.literal("top"), v.literal("center"), v.literal("bottom")),
});

const scentSection = v.object({
  id: v.string(),
  type: v.literal("scent"),
  visible: v.boolean(),
  productId: v.string(),
  media: homepageMedia,
  eyebrow: v.string(),
  headline: v.string(),
  subtext: v.string(),
  ctaLabel: v.string(),
  ctaHref: v.string(),
  textAlign: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
});

const promoSection = v.object({
  id: v.string(),
  type: v.literal("promo"),
  visible: v.boolean(),
  productId: v.union(v.string(), v.null()),
  media: homepageMedia,
  eyebrow: v.string(),
  headline: v.string(),
  subtext: v.string(),
  ctaLabel: v.string(),
  ctaHref: v.string(),
  textAlign: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
});

const collectionSection = v.object({
  id: v.string(),
  type: v.literal("collection"),
  visible: v.boolean(),
  eyebrow: v.string(),
  headline: v.string(),
  subtext: v.string(),
  ctaLabel: v.string(),
  ctaHref: v.string(),
  productIds: v.array(v.string()),
});

export const homepageSection = v.union(
  heroSection,
  videoSection,
  scentSection,
  promoSection,
  collectionSection,
);

export const homepageLayout = v.object({
  schemaVersion: v.literal(1),
  sections: v.array(homepageSection),
});

export type HomepageLayout = Infer<typeof homepageLayout>;
export type HomepageSection = Infer<typeof homepageSection>;
export type HomepageMedia = Infer<typeof homepageMedia>;
