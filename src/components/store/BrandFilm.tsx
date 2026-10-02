import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { HomepageFilmConfig } from "@/lib/homepageFilm";
import type { HomepageMedia } from "@/lib/homepageLayout";
import { publicMediaData } from "@/lib/publicMedia";

function loadFilm(video: HTMLVideoElement) {
  let changed = false;
  video.querySelectorAll<HTMLSourceElement>("source[data-src]").forEach((source) => {
    if (!source.hasAttribute("src") && source.dataset.src) {
      source.src = source.dataset.src;
      changed = true;
    }
  });
  if (changed) video.load();
}

/**
 * The Oud Zafar launch film. It fills a phone screen, stays uncropped on wider
 * displays, and pauses whenever it is outside the viewport to avoid wasting
 * bandwidth, battery or GPU time farther down the page.
 */
export function BrandFilm({
  config: sourceConfig,
  posterMedia,
}: {
  config: HomepageFilmConfig;
  posterMedia?: HomepageMedia;
}) {
  const config = publicMediaData(sourceConfig);
  const videoRef = useRef<HTMLVideoElement>(null);
  const manuallyPaused = useRef(false);
  const [paused, setPaused] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setVideoReady(false);
  }, [config.posterUrl, config.videoMp4Url, config.videoWebmUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData;
    manuallyPaused.current = reducedMotion || Boolean(saveData);
    let visible = false;
    const updatePlayback = () => {
      if (visible && !document.hidden && !manuallyPaused.current) {
        loadFilm(video);
        void video.play().catch(() => setPaused(true));
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        updatePlayback();
      },
      { threshold: 0.12 },
    );
    observer.observe(video);
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updatePlayback);
      video.pause();
    };
  }, [config.videoMp4Url, config.videoWebmUrl]);

  const mobileFit = config.mobileFit === "contain" ? "object-contain" : "object-cover";
  const desktopFit = config.desktopFit === "cover" ? "sm:object-cover" : "sm:object-contain";
  const objectPosition = `center ${config.focalPosition}`;
  const posterPosition = `${config.posterPositionX}% ${config.posterPositionY}%`;
  const posterStyle = posterMedia
    ? ({
        "--homepage-mobile-position": `${posterMedia.mobileCrop.x}% ${posterMedia.mobileCrop.y}%`,
        "--homepage-desktop-position": `${posterMedia.desktopCrop.x}% ${posterMedia.desktopCrop.y}%`,
        "--homepage-mobile-zoom": posterMedia.mobileCrop.zoom / 100,
        "--homepage-desktop-zoom": posterMedia.desktopCrop.zoom / 100,
      } as CSSProperties)
    : undefined;

  return (
    <section
      aria-label="Oud Zafar campaign film"
      className="relative h-[100svh] min-h-[620px] max-h-[1200px] overflow-hidden bg-black"
    >
      <video
        key={`${config.videoWebmUrl ?? ""}|${config.videoMp4Url ?? ""}`}
        ref={videoRef}
        className={`h-full w-full ${mobileFit} ${desktopFit}`}
        style={{ objectPosition }}
        poster={config.posterUrl}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        aria-hidden="true"
        onLoadedData={() => setVideoReady(true)}
        onCanPlay={() => setVideoReady(true)}
        onPlaying={() => {
          setVideoReady(true);
          setPaused(false);
        }}
        onPause={() => setPaused(true)}
        onError={() => {
          setVideoReady(false);
          setPaused(true);
        }}
      >
        {config.videoWebmUrl && <source data-src={config.videoWebmUrl} type="video/webm" />}
        {config.videoMp4Url && <source data-src={config.videoMp4Url} type="video/mp4" />}
      </video>
      <picture>
        {posterMedia?.mobileImageUrl ? (
          <source media="(max-width: 639px)" srcSet={posterMedia.mobileImageUrl} />
        ) : null}
        <img
          src={config.posterUrl}
          alt=""
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300 ${posterMedia ? "homepage-cropped-media" : ""} ${videoReady ? "opacity-0" : "opacity-100"}`}
          style={
            posterStyle ?? {
              objectFit: config.posterFit,
              objectPosition: posterPosition,
              transform: `scale(${config.posterZoom / 100})`,
              transformOrigin: posterPosition,
            }
          }
        />
      </picture>
      <button
        type="button"
        aria-label={paused ? "Play campaign film" : "Pause campaign film"}
        aria-pressed={paused}
        onClick={() => {
          const video = videoRef.current;
          if (!video) return;
          if (video.paused) {
            manuallyPaused.current = false;
            loadFilm(video);
            void video
              .play()
              .then(() => {
                setPaused(false);
                setVideoReady(true);
              })
              .catch(() => setPaused(true));
          } else {
            manuallyPaused.current = true;
            video.pause();
            setPaused(true);
          }
        }}
        className="motion-button absolute bottom-5 right-5 grid h-11 w-11 place-items-center border border-white/35 bg-black/35 text-white backdrop-blur-md hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {paused ? <Play className="h-4 w-4" fill="currentColor" /> : <Pause className="h-4 w-4" />}
      </button>
    </section>
  );
}
