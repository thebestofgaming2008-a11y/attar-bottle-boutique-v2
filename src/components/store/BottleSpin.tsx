import { Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import zafar from "@/assets/spin-oud-zafar.webp";
import gulaab from "@/assets/spin-oud-gulaab.webp";
import fitoor from "@/assets/spin-fitoor.webp";
import dariya from "@/assets/spin-dariya.webp";
import ulfat from "@/assets/spin-ulfat.webp";

export const SPIN_BOTTLES = [
  { src: zafar, name: "Oud Zafar", id: "oud-zafar" },
  { src: gulaab, name: "Oud Gulaab", id: "oud-gulaab" },
  { src: fitoor, name: "Fitoor", id: "fitoor" },
  { src: dariya, name: "Dariya", id: "dariya" },
  { src: ulfat, name: "Ulfat", id: "ulfat" },
];

/**
 * All five signature bottles gliding sideways forever — a duplicated track
 * loops seamlessly. Each bottle carries a quick-view icon straight to its
 * product page.
 */
export function BottleSpin({ className = "" }: { className?: string }) {
  const row = [...SPIN_BOTTLES, ...SPIN_BOTTLES];

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="marquee-track items-end gap-14" style={{ animationDuration: "26s" }}>
        {row.map((b, i) => (
          <figure
            key={`${b.id}-${i}`}
            className="relative flex w-36 shrink-0 flex-col items-center gap-3"
          >
            <Link
              to="/product/$id"
              params={{ id: b.id }}
              aria-label={`Quick view ${b.name}`}
              tabIndex={i >= SPIN_BOTTLES.length ? -1 : 0}
              className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-background/30 bg-background/10 text-background backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
            </Link>
            <img
              src={b.src}
              alt={i < SPIN_BOTTLES.length ? `BADR ${b.name} 6 ml roll-on attar bottle` : ""}
              aria-hidden={i >= SPIN_BOTTLES.length}
              className="w-full"
              loading={i >= SPIN_BOTTLES.length ? "lazy" : "eager"}
              decoding="async"
              draggable={false}
            />
            <figcaption className="text-[9px] uppercase tracking-[0.3em] text-background/50">
              {b.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
