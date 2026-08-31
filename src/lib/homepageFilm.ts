export type HomepageFilmPlacement =
  | "after_hero"
  | "after_scent_1"
  | "after_scent_2"
  | "after_scent_3"
  | "after_scent_4"
  | "after_scent_5"
  | "before_shop"
  | "after_shop";

export interface HomepageFilmConfig {
  enabled: boolean;
  posterUrl: string;
  videoWebmUrl: string | null;
  videoMp4Url: string | null;
  placement: HomepageFilmPlacement;
  mobileFit: "cover" | "contain";
  desktopFit: "cover" | "contain";
  focalPosition: "top" | "center" | "bottom";
  posterFit: "cover" | "contain";
  posterPositionX: number;
  posterPositionY: number;
  posterZoom: number;
}

const MEDIA_BASE = "https://pub-30772d6b9c8546adbd34e4a9f0683d2d.r2.dev/campaign";

export const DEFAULT_HOMEPAGE_FILM_CONFIG: HomepageFilmConfig = {
  enabled: true,
  posterUrl: `${MEDIA_BASE}/oud-zafar-film-v134-half-wrap-poster.webp`,
  videoWebmUrl: `${MEDIA_BASE}/oud-zafar-film-v134-half-wrap.webm`,
  videoMp4Url: `${MEDIA_BASE}/oud-zafar-film-v134-half-wrap.mp4`,
  placement: "after_hero",
  mobileFit: "cover",
  desktopFit: "contain",
  focalPosition: "center",
  posterFit: "cover",
  posterPositionX: 50,
  posterPositionY: 50,
  posterZoom: 100,
};

export const HOMEPAGE_FILM_PLACEMENTS: Array<{
  value: HomepageFilmPlacement;
  label: string;
}> = [
  { value: "after_hero", label: "Directly after the hero" },
  { value: "after_scent_1", label: "After scent story 1" },
  { value: "after_scent_2", label: "After scent story 2" },
  { value: "after_scent_3", label: "After scent story 3" },
  { value: "after_scent_4", label: "After scent story 4" },
  { value: "after_scent_5", label: "After scent story 5" },
  { value: "before_shop", label: "Immediately before Shop the collection" },
  { value: "after_shop", label: "After Shop the collection" },
];
