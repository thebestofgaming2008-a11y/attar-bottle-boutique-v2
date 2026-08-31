import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { homepageLayout, homepageMedia, type HomepageLayout } from "./homepageModel";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const LAYOUT_KEY = "main";
const REVISION_LIMIT = 10;
const MEDIA_BASE = "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev/campaign";

const revision = v.object({
  id: v.id("homepage_revisions"),
  version: v.number(),
  publishedAt: v.string(),
  publishedBy: v.union(v.string(), v.null()),
  summary: v.union(v.string(), v.null()),
});

const editorState = v.object({
  draft: homepageLayout,
  published: homepageLayout,
  draftVersion: v.number(),
  publishedVersion: v.number(),
  draftUpdatedAt: v.string(),
  publishedAt: v.string(),
  revisions: v.array(revision),
});

function crop() {
  return { x: 50, y: 50, zoom: 100 };
}

function media(imageUrl = "") {
  return {
    imageUrl,
    mobileImageUrl: null,
    mobileCrop: crop(),
    desktopCrop: crop(),
  };
}

function bounded(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function cleanText(value: string, max = 240) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanUrl(value: string, allowBlank = true) {
  const raw = value.trim().slice(0, 2_000);
  if (!raw && allowBlank) return "";
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") throw new Error("Only HTTPS links are allowed.");
    return url.toString();
  } catch {
    throw new Error(`Invalid homepage link: ${raw.slice(0, 80)}`);
  }
}

function cleanMedia(value: typeof homepageMedia.type) {
  return {
    imageUrl: cleanUrl(value.imageUrl),
    mobileImageUrl: value.mobileImageUrl ? cleanUrl(value.mobileImageUrl) : null,
    mobileCrop: {
      x: bounded(value.mobileCrop.x, 0, 100, 50),
      y: bounded(value.mobileCrop.y, 0, 100, 50),
      zoom: bounded(value.mobileCrop.zoom, 100, 300, 100),
    },
    desktopCrop: {
      x: bounded(value.desktopCrop.x, 0, 100, 50),
      y: bounded(value.desktopCrop.y, 0, 100, 50),
      zoom: bounded(value.desktopCrop.zoom, 100, 300, 100),
    },
  };
}

function normalizeLayout(layout: HomepageLayout): HomepageLayout {
  if (layout.sections.length < 2 || layout.sections.length > 60) {
    throw new Error("A homepage must contain between 2 and 60 sections.");
  }
  const ids = new Set<string>();
  let heroCount = 0;
  const sections = layout.sections.map((section) => {
    const id = cleanText(section.id, 80);
    if (!id || ids.has(id)) throw new Error("Every homepage section needs a unique ID.");
    ids.add(id);
    if (section.type === "hero") heroCount += 1;
    if (section.type === "hero") {
      return {
        ...section,
        id,
        eyebrow: cleanText(section.eyebrow, 80),
        headline: cleanText(section.headline, 120),
        subtext: cleanText(section.subtext, 240),
        ctaLabel: cleanText(section.ctaLabel, 60),
        ctaHref: cleanUrl(section.ctaHref),
        productIds: Array.from(
          new Set(section.productIds.map((item) => cleanText(item, 120))),
        ).slice(0, 30),
      };
    }
    if (section.type === "video") {
      return {
        ...section,
        id,
        poster: cleanMedia(section.poster),
        videoWebmUrl: section.videoWebmUrl ? cleanUrl(section.videoWebmUrl) : null,
        videoMp4Url: section.videoMp4Url ? cleanUrl(section.videoMp4Url) : null,
      };
    }
    if (section.type === "collection") {
      return {
        ...section,
        id,
        eyebrow: cleanText(section.eyebrow, 80),
        headline: cleanText(section.headline, 120),
        subtext: cleanText(section.subtext, 240),
        ctaLabel: cleanText(section.ctaLabel, 60),
        ctaHref: cleanUrl(section.ctaHref),
        productIds: Array.from(
          new Set(section.productIds.map((item) => cleanText(item, 120))),
        ).slice(0, 50),
      };
    }
    return {
      ...section,
      id,
      productId:
        section.type === "promo"
          ? section.productId
            ? cleanText(section.productId, 120)
            : null
          : cleanText(section.productId, 120),
      media: cleanMedia(section.media),
      eyebrow: cleanText(section.eyebrow, 80),
      headline: cleanText(section.headline, 120),
      subtext: cleanText(section.subtext, 240),
      ctaLabel: cleanText(section.ctaLabel, 60),
      ctaHref: cleanUrl(section.ctaHref),
    };
  });
  if (heroCount !== 1 || sections[0]?.type !== "hero") {
    throw new Error("The homepage hero must exist exactly once and remain first.");
  }
  return { schemaVersion: 1, sections } as HomepageLayout;
}

async function activeProductSlugs(ctx: MutationCtx) {
  const products = await ctx.db
    .query("products")
    .withIndex("by_active", (q) => q.eq("is_active", true))
    .take(100);
  return products
    .sort((a, b) => Number(a.sort_order ?? 9_999) - Number(b.sort_order ?? 9_999))
    .flatMap((product) => (product.slug ? [product.slug] : []));
}

async function assertActiveProductReferences(ctx: MutationCtx, layout: HomepageLayout) {
  const active = new Set(await activeProductSlugs(ctx));
  for (const section of layout.sections) {
    if (section.type === "hero" || section.type === "collection") {
      if (section.productIds.length === 0) {
        throw new Error(
          `${section.type === "hero" ? "Hero" : "Collection"} needs at least one product.`,
        );
      }
      for (const productId of section.productIds) {
        if (!active.has(productId)) {
          throw new Error(`The product “${productId}” is inactive or no longer exists.`);
        }
      }
      continue;
    }
    if (section.type === "scent" && !active.has(section.productId)) {
      throw new Error(`The product “${section.productId}” is inactive or no longer exists.`);
    }
    if (section.type === "promo" && section.productId && !active.has(section.productId)) {
      throw new Error(`The product “${section.productId}” is inactive or no longer exists.`);
    }
  }
}

async function initialLayout(ctx: MutationCtx): Promise<HomepageLayout> {
  const productIds = await activeProductSlugs(ctx);
  const filmRow = await ctx.db
    .query("store_settings")
    .withIndex("by_key", (q) => q.eq("key", "homepage_brand_film"))
    .first();
  const film = (filmRow?.value ?? {}) as Record<string, unknown>;
  const sections: HomepageLayout["sections"] = [
    {
      id: "hero",
      type: "hero",
      visible: true,
      eyebrow: "",
      headline: "Rare Air",
      subtext: "",
      ctaLabel: "Shop now",
      ctaHref: "#shop",
      productIds,
    },
    {
      id: "campaign-film",
      type: "video",
      visible: film.enabled !== false,
      poster: {
        ...media(
          typeof film.posterUrl === "string"
            ? film.posterUrl
            : `${MEDIA_BASE}/oud-zafar-film-v134-half-wrap-poster.webp`,
        ),
        mobileCrop: {
          x: Number(film.posterPositionX ?? 50),
          y: Number(film.posterPositionY ?? 50),
          zoom: Number(film.posterZoom ?? 100),
        },
        desktopCrop: {
          x: Number(film.posterPositionX ?? 50),
          y: Number(film.posterPositionY ?? 50),
          zoom: Number(film.posterZoom ?? 100),
        },
      },
      videoWebmUrl:
        typeof film.videoWebmUrl === "string"
          ? film.videoWebmUrl
          : `${MEDIA_BASE}/oud-zafar-film-v134-half-wrap.webm`,
      videoMp4Url:
        typeof film.videoMp4Url === "string"
          ? film.videoMp4Url
          : `${MEDIA_BASE}/oud-zafar-film-v134-half-wrap.mp4`,
      mobileFit: film.mobileFit === "contain" ? "contain" : "cover",
      desktopFit: film.desktopFit === "cover" ? "cover" : "contain",
      focalPosition:
        film.focalPosition === "top" || film.focalPosition === "bottom"
          ? film.focalPosition
          : "center",
    },
    ...productIds.map((productId): HomepageLayout["sections"][number] => ({
      id: `scent-${productId}`,
      type: "scent",
      visible: true,
      productId,
      media: media(),
      eyebrow: "",
      headline: "",
      subtext: "",
      ctaLabel: "",
      ctaHref: "",
      textAlign: "center",
    })),
    {
      id: "collection",
      type: "collection",
      visible: true,
      eyebrow: "",
      headline: "Shop the collection",
      subtext: "",
      ctaLabel: "View all products",
      ctaHref: "/shop",
      productIds,
    },
  ];
  return normalizeLayout({ schemaVersion: 1, sections });
}

async function getRevisions(ctx: QueryCtx | MutationCtx) {
  const rows = await ctx.db
    .query("homepage_revisions")
    .withIndex("by_published_at")
    .order("desc")
    .take(REVISION_LIMIT);
  return rows.map((row) => ({
    id: row._id,
    version: row.version,
    publishedAt: row.published_at,
    publishedBy: row.published_by ?? null,
    summary: row.summary ?? null,
  }));
}

async function trimRevisions(ctx: MutationCtx) {
  const rows = await ctx.db
    .query("homepage_revisions")
    .withIndex("by_published_at")
    .order("desc")
    .take(REVISION_LIMIT + 20);
  for (const row of rows.slice(REVISION_LIMIT)) await ctx.db.delete(row._id);
}

export const getPublishedLayout = query({
  args: {},
  returns: v.union(homepageLayout, v.null()),
  handler: async (ctx) => {
    const row = await ctx.db
      .query("homepage_layouts")
      .withIndex("by_key", (q) => q.eq("key", LAYOUT_KEY))
      .first();
    return row?.published ?? null;
  },
});

export const getEditorState = query({
  args: {},
  returns: v.union(editorState, v.null()),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("homepage_layouts")
      .withIndex("by_key", (q) => q.eq("key", LAYOUT_KEY))
      .first();
    if (!row) return null;
    return {
      draft: row.draft,
      published: row.published,
      draftVersion: row.draft_version,
      publishedVersion: row.published_version,
      draftUpdatedAt: row.draft_updated_at,
      publishedAt: row.published_at,
      revisions: await getRevisions(ctx),
    };
  },
});

export const initialize = mutation({
  args: {},
  returns: editorState,
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("homepage_layouts")
      .withIndex("by_key", (q) => q.eq("key", LAYOUT_KEY))
      .first();
    if (existing) {
      return {
        draft: existing.draft,
        published: existing.published,
        draftVersion: existing.draft_version,
        publishedVersion: existing.published_version,
        draftUpdatedAt: existing.draft_updated_at,
        publishedAt: existing.published_at,
        revisions: await getRevisions(ctx),
      };
    }
    const layout = await initialLayout(ctx);
    const now = nowIso();
    await ctx.db.insert("homepage_layouts", {
      key: LAYOUT_KEY,
      draft: layout,
      published: layout,
      draft_version: 1,
      published_version: 1,
      draft_updated_at: now,
      published_at: now,
      updated_by: String(await getAuthUserId(ctx)),
    });
    await writeAuditLog(ctx, {
      action: "homepage.layout.initialize",
      entityType: "homepage_layouts",
      entityId: LAYOUT_KEY,
      summary: "Initialized the visual homepage editor without changing the live layout",
    });
    return {
      draft: layout,
      published: layout,
      draftVersion: 1,
      publishedVersion: 1,
      draftUpdatedAt: now,
      publishedAt: now,
      revisions: [],
    };
  },
});

export const saveDraft = mutation({
  args: { layout: homepageLayout, expectedVersion: v.number() },
  returns: editorState,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("homepage_layouts")
      .withIndex("by_key", (q) => q.eq("key", LAYOUT_KEY))
      .first();
    if (!row) throw new Error("Initialize the homepage editor before saving.");
    if (row.draft_version !== args.expectedVersion) {
      throw new Error("This draft changed in another admin session. Reload before continuing.");
    }
    const draft = normalizeLayout(args.layout);
    const nextVersion = row.draft_version + 1;
    const now = nowIso();
    await ctx.db.patch(row._id, {
      draft,
      draft_version: nextVersion,
      draft_updated_at: now,
      updated_by: String(await getAuthUserId(ctx)),
    });
    return {
      draft,
      published: row.published,
      draftVersion: nextVersion,
      publishedVersion: row.published_version,
      draftUpdatedAt: now,
      publishedAt: row.published_at,
      revisions: await getRevisions(ctx),
    };
  },
});

export const publishDraft = mutation({
  args: { expectedVersion: v.number(), summary: v.optional(v.string()) },
  returns: editorState,
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db
      .query("homepage_layouts")
      .withIndex("by_key", (q) => q.eq("key", LAYOUT_KEY))
      .first();
    if (!row) throw new Error("Initialize the homepage editor before publishing.");
    if (row.draft_version !== args.expectedVersion) {
      throw new Error("This draft changed in another admin session. Reload before publishing.");
    }
    await assertActiveProductReferences(ctx, row.draft);
    const nextPublishedVersion = row.published_version + 1;
    const now = nowIso();
    await ctx.db.insert("homepage_revisions", {
      layout: row.published,
      version: row.published_version,
      published_at: row.published_at,
      published_by: (admin.user as { email?: string }).email ?? null,
      summary: cleanText(args.summary ?? "Previous published homepage", 160),
    });
    await ctx.db.patch(row._id, {
      published: row.draft,
      published_version: nextPublishedVersion,
      published_at: now,
      updated_by: String(admin.userId),
    });
    await trimRevisions(ctx);
    await writeAuditLog(ctx, {
      action: "homepage.layout.publish",
      entityType: "homepage_layouts",
      entityId: LAYOUT_KEY,
      summary: `Published homepage revision ${nextPublishedVersion}`,
      metadata: { sectionCount: row.draft.sections.length },
    });
    return {
      draft: row.draft,
      published: row.draft,
      draftVersion: row.draft_version,
      publishedVersion: nextPublishedVersion,
      draftUpdatedAt: row.draft_updated_at,
      publishedAt: now,
      revisions: await getRevisions(ctx),
    };
  },
});

export const discardDraft = mutation({
  args: { expectedVersion: v.number() },
  returns: editorState,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("homepage_layouts")
      .withIndex("by_key", (q) => q.eq("key", LAYOUT_KEY))
      .first();
    if (!row) throw new Error("Initialize the homepage editor before discarding.");
    if (row.draft_version !== args.expectedVersion) {
      throw new Error("This draft changed in another admin session. Reload before discarding.");
    }
    const nextVersion = row.draft_version + 1;
    const now = nowIso();
    await ctx.db.patch(row._id, {
      draft: row.published,
      draft_version: nextVersion,
      draft_updated_at: now,
    });
    return {
      draft: row.published,
      published: row.published,
      draftVersion: nextVersion,
      publishedVersion: row.published_version,
      draftUpdatedAt: now,
      publishedAt: row.published_at,
      revisions: await getRevisions(ctx),
    };
  },
});

export const restoreRevision = mutation({
  args: { revisionId: v.id("homepage_revisions"), expectedVersion: v.number() },
  returns: editorState,
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const [row, selected] = await Promise.all([
      ctx.db
        .query("homepage_layouts")
        .withIndex("by_key", (q) => q.eq("key", LAYOUT_KEY))
        .first(),
      ctx.db.get(args.revisionId),
    ]);
    if (!row || !selected) throw new Error("That homepage revision no longer exists.");
    if (row.draft_version !== args.expectedVersion) {
      throw new Error("This draft changed in another admin session. Reload before restoring.");
    }
    const now = nowIso();
    const nextDraftVersion = row.draft_version + 1;
    const nextPublishedVersion = row.published_version + 1;
    await ctx.db.insert("homepage_revisions", {
      layout: row.published,
      version: row.published_version,
      published_at: row.published_at,
      published_by: (admin.user as { email?: string }).email ?? null,
      summary: "Homepage before revision restore",
    });
    await ctx.db.patch(row._id, {
      draft: selected.layout,
      published: selected.layout,
      draft_version: nextDraftVersion,
      published_version: nextPublishedVersion,
      draft_updated_at: now,
      published_at: now,
      updated_by: String(admin.userId),
    });
    await trimRevisions(ctx);
    await writeAuditLog(ctx, {
      action: "homepage.layout.restore",
      entityType: "homepage_layouts",
      entityId: LAYOUT_KEY,
      summary: `Restored homepage revision ${selected.version}`,
    });
    return {
      draft: selected.layout,
      published: selected.layout,
      draftVersion: nextDraftVersion,
      publishedVersion: nextPublishedVersion,
      draftUpdatedAt: now,
      publishedAt: now,
      revisions: await getRevisions(ctx),
    };
  },
});
