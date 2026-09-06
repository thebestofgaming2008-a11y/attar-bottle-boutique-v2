import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";

export function AnnouncementBanner() {
  const config = useQuery(api.promotions.publicConfig);
  const [paused, setPaused] = useState(false);
  if (!config?.banner_active || !config.banner_messages.length) return null;
  const message = config.banner_messages.join("   ·   ");
  return (
    <div
      className="announcement-bar fixed inset-x-0 top-0 z-[55] flex h-9 items-center overflow-hidden bg-black text-white"
      aria-label="Store announcements"
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className="announcement-track flex w-max gap-12 whitespace-nowrap text-xs font-medium tracking-wide"
          style={{ animationPlayState: paused ? "paused" : "running" }}
        >
          <span>{message}</span>
          <span aria-hidden="true">{message}</span>
        </div>
      </div>
      <button
        type="button"
        className="h-9 shrink-0 bg-black px-3 text-[10px] underline"
        aria-label={paused ? "Resume announcements" : "Pause announcements"}
        onClick={() => setPaused(!paused)}
      >
        {paused ? "Play" : "Pause"}
      </button>
    </div>
  );
}
