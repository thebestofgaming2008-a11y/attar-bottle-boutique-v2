import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function AnnouncementBanner() {
  const config = useQuery(api.promotions.publicConfig);
  if (!config?.banner_active || !config.banner_messages.length) return null;
  return <AnnouncementMessages messages={config.banner_messages} />;
}

export function AnnouncementMessages({ messages }: { messages: string[] }) {
  const cleanMessages = messages.map((message) => message.trim()).filter(Boolean);
  if (!cleanMessages.length) return null;
  return (
    <div
      className="announcement-bar fixed inset-x-0 top-0 z-[55] flex h-9 items-center overflow-hidden bg-black text-white"
      aria-label="Store announcements"
      role="region"
      tabIndex={0}
    >
      <div className="announcement-viewport min-w-0 flex-1 overflow-hidden">
        <div className="announcement-track flex w-max text-xs font-medium tracking-wide">
          {[false, true].map((duplicate) => (
            <div
              key={String(duplicate)}
              className="announcement-group"
              aria-hidden={duplicate || undefined}
            >
              {cleanMessages.map((message, index) => (
                <span key={`${index}-${message}`} className="announcement-message">
                  {message}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
