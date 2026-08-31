import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nowIso, requireAdmin, writeAuditLog } from "./lib";

const placement = v.union(
  v.literal("after_hero"),
  v.literal("after_scent_1"),
  v.literal("after_scent_2"),
  v.literal("after_scent_3"),
  v.literal("after_scent_4"),
  v.literal("after_scent_5"),
  v.literal("before_shop"),
  v.literal("after_shop"),
);
const fit = v.union(v.literal("cover"), v.literal("contain"));
const focalPosition = v.union(v.literal("top"), v.literal("center"), v.literal("bottom"));

const filmConfig = v.object({
  enabled: v.boolean(),
  posterUrl: v.string(),
  videoWebmUrl: v.union(v.string(), v.null()),
  videoMp4Url: v.union(v.string(), v.null()),
  placement,
  mobileFit: fit,
  desktopFit: fit,
  focalPosition,
});

type FilmConfig = {
  enabled: boolean;
  posterUrl: string;
  videoWebmUrl: string | null;
  videoMp4Url: string | null;
  placement:
    | "after_hero"
    | "after_scent_1"
    | "after_scent_2"
    | "after_scent_3"
    | "after_scent_4"
    | "after_scent_5"
    | "before_shop"
    | "after_shop";
  mobileFit: "cover" | "contain";
  desktopFit: "cover" | "contain";
  focalPosition: "top" | "center" | "bottom";
};

const MEDIA_BASE = "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev/campaign";
const DEFAULT_FILM_CONFIG: FilmConfig = {
  enabled: true,
  posterUrl: `${MEDIA_BASE}/oud-zafar-film-v134-half-wrap-poster.webp`,
  videoWebmUrl: `${MEDIA_BASE}/oud-zafar-film-v134-half-wrap.webm`,
  videoMp4Url: `${MEDIA_BASE}/oud-zafar-film-v134-half-wrap.mp4`,
  placement: "after_hero",
  mobileFit: "cover",
  desktopFit: "contain",
  focalPosition: "center",
};

const LEGACY_V133_MEDIA = {
  posterUrl: `${MEDIA_BASE}/oud-zafar-film-v133-poster.webp`,
  videoWebmUrl: `${MEDIA_BASE}/oud-zafar-film-v133.webm`,
  videoMp4Url: `${MEDIA_BASE}/oud-zafar-film-v133.mp4`,
};

function safeHttpsUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim().slice(0, 2_000) : "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeConfig(value: unknown): FilmConfig {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const allowedPlacements = new Set<FilmConfig["placement"]>([
    "after_hero",
    "after_scent_1",
    "after_scent_2",
    "after_scent_3",
    "after_scent_4",
    "after_scent_5",
    "before_shop",
    "after_shop",
  ]);
  const rawPlacement = input.placement as FilmConfig["placement"];
  const rawFocal = input.focalPosition;
  const posterUrl = safeHttpsUrl(input.posterUrl);
  const videoWebmUrl = safeHttpsUrl(input.videoWebmUrl);
  const videoMp4Url = safeHttpsUrl(input.videoMp4Url);
  return {
    enabled: input.enabled !== false,
    posterUrl:
      !posterUrl || posterUrl === LEGACY_V133_MEDIA.posterUrl
        ? DEFAULT_FILM_CONFIG.posterUrl
        : posterUrl,
    videoWebmUrl:
      input.videoWebmUrl === null
        ? null
        : !videoWebmUrl || videoWebmUrl === LEGACY_V133_MEDIA.videoWebmUrl
          ? DEFAULT_FILM_CONFIG.videoWebmUrl
          : videoWebmUrl,
    videoMp4Url:
      input.videoMp4Url === null
        ? null
        : !videoMp4Url || videoMp4Url === LEGACY_V133_MEDIA.videoMp4Url
          ? DEFAULT_FILM_CONFIG.videoMp4Url
          : videoMp4Url,
    placement: allowedPlacements.has(rawPlacement) ? rawPlacement : DEFAULT_FILM_CONFIG.placement,
    mobileFit: input.mobileFit === "contain" ? "contain" : "cover",
    desktopFit: input.desktopFit === "cover" ? "cover" : "contain",
    focalPosition:
      rawFocal === "top" || rawFocal === "bottom" || rawFocal === "center" ? rawFocal : "center",
  };
}

export const getFilmConfig = query({
  args: {},
  returns: filmConfig,
  handler: async (ctx) => {
    const row = await ctx.db
      .query("store_settings")
      .withIndex("by_key", (q) => q.eq("key", "homepage_brand_film"))
      .first();
    return normalizeConfig(row?.value);
  },
});

export const saveFilmConfig = mutation({
  args: { config: filmConfig },
  returns: filmConfig,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!safeHttpsUrl(args.config.posterUrl)) {
      throw new Error("Poster URL must be a valid HTTPS URL.");
    }
    if (args.config.videoWebmUrl !== null && !safeHttpsUrl(args.config.videoWebmUrl)) {
      throw new Error("WebM URL must be a valid HTTPS URL.");
    }
    if (args.config.videoMp4Url !== null && !safeHttpsUrl(args.config.videoMp4Url)) {
      throw new Error("MP4 URL must be a valid HTTPS URL.");
    }
    const config = normalizeConfig(args.config);
    if (config.enabled && !config.videoWebmUrl && !config.videoMp4Url) {
      throw new Error("Add at least one WebM or MP4 film before enabling this section.");
    }
    const existing = await ctx.db
      .query("store_settings")
      .withIndex("by_key", (q) => q.eq("key", "homepage_brand_film"))
      .first();
    const updatedAt = nowIso();
    if (existing) await ctx.db.patch(existing._id, { value: config, updated_at: updatedAt });
    else {
      await ctx.db.insert("store_settings", {
        key: "homepage_brand_film",
        value: config,
        updated_at: updatedAt,
      });
    }
    await writeAuditLog(ctx, {
      action: "homepage.film.update",
      entityType: "store_settings",
      entityId: "homepage_brand_film",
      summary: `Film ${config.enabled ? "enabled" : "hidden"} at ${config.placement}`,
      metadata: {
        placement: config.placement,
        posterUrl: config.posterUrl,
        videoWebmUrl: config.videoWebmUrl,
        videoMp4Url: config.videoMp4Url,
      },
    });
    return config;
  },
});
