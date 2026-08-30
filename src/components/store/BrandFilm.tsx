import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { HomepageFilmConfig } from "@/lib/homepageFilm";

/**
 * The Oud Zafar launch film. It fills a phone screen, stays uncropped on wider
 * displays, and pauses whenever it is outside the viewport to avoid wasting
 * bandwidth, battery or GPU time farther down the page.
 */
export function BrandFilm({ config }: { config: HomepageFilmConfig }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const manuallyPaused = useRef(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      manuallyPaused.current = true;
      video.pause();
      setPaused(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !manuallyPaused.current) {
          void video
            .play()
            .then(() => setPaused(false))
            .catch(() => setPaused(true));
        } else {
          video.pause();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [config.videoMp4Url, config.videoWebmUrl]);

  const mobileFit = config.mobileFit === "contain" ? "object-contain" : "object-cover";
  const desktopFit = config.desktopFit === "cover" ? "sm:object-cover" : "sm:object-contain";
  const objectPosition = `center ${config.focalPosition}`;

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
        autoPlay
        preload="metadata"
        disablePictureInPicture
        aria-hidden="true"
      >
        {config.videoWebmUrl && <source src={config.videoWebmUrl} type="video/webm" />}
        {config.videoMp4Url && <source src={config.videoMp4Url} type="video/mp4" />}
      </video>
      <button
        type="button"
        aria-label={paused ? "Play campaign film" : "Pause campaign film"}
        aria-pressed={paused}
        onClick={() => {
          const video = videoRef.current;
          if (!video) return;
          if (video.paused) {
            manuallyPaused.current = false;
            void video
              .play()
              .then(() => setPaused(false))
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
