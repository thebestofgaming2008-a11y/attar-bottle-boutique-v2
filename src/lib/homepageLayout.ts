export type HomepageCrop = {
  x: number;
  y: number;
  zoom: number;
};

export type HomepageMedia = {
  imageUrl: string;
  mobileImageUrl: string | null;
  mobileCrop: HomepageCrop;
  desktopCrop: HomepageCrop;
};

type BaseHomepageSection = {
  id: string;
  visible: boolean;
};

export type HomepageHeroSection = BaseHomepageSection & {
  type: "hero";
  eyebrow: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  productIds: string[];
};

export type HomepageVideoSection = BaseHomepageSection & {
  type: "video";
  poster: HomepageMedia;
  videoWebmUrl: string | null;
  videoMp4Url: string | null;
  mobileFit: "cover" | "contain";
  desktopFit: "cover" | "contain";
  focalPosition: "top" | "center" | "bottom";
};

export type HomepageScentSection = BaseHomepageSection & {
  type: "scent";
  productId: string;
  media: HomepageMedia;
  eyebrow: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  textAlign: "left" | "center" | "right";
};

export type HomepagePromoSection = BaseHomepageSection & {
  type: "promo";
  productId: string | null;
  media: HomepageMedia;
  eyebrow: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  textAlign: "left" | "center" | "right";
};

export type HomepageCollectionSection = BaseHomepageSection & {
  type: "collection";
  eyebrow: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  productIds: string[];
};

export type HomepageSection =
  | HomepageHeroSection
  | HomepageVideoSection
  | HomepageScentSection
  | HomepagePromoSection
  | HomepageCollectionSection;

export type HomepageLayout = {
  schemaVersion: 1;
  sections: HomepageSection[];
};

export type HomepageRevision = {
  id: string;
  version: number;
  publishedAt: string;
  publishedBy: string | null;
  summary: string | null;
};

export type HomepageEditorState = {
  draft: HomepageLayout;
  published: HomepageLayout;
  draftVersion: number;
  publishedVersion: number;
  draftUpdatedAt: string;
  publishedAt: string;
  revisions: HomepageRevision[];
};

export const DEFAULT_HOMEPAGE_CROP: HomepageCrop = { x: 50, y: 50, zoom: 100 };

export function createHomepageMedia(imageUrl = ""): HomepageMedia {
  return {
    imageUrl,
    mobileImageUrl: null,
    mobileCrop: { ...DEFAULT_HOMEPAGE_CROP },
    desktopCrop: { ...DEFAULT_HOMEPAGE_CROP },
  };
}

export function homepageSectionName(section: HomepageSection) {
  if (section.type === "hero") return "Hero";
  if (section.type === "video") return "Campaign film";
  if (section.type === "collection") return section.headline || "Collection";
  if (section.type === "scent") return section.headline || section.productId || "Scent banner";
  return section.headline || "Promotional banner";
}

export function layoutsEqual(left: HomepageLayout, right: HomepageLayout) {
  return JSON.stringify(left) === JSON.stringify(right);
}
