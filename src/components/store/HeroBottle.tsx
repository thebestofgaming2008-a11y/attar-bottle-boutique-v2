import type { HeroBottleImage } from "@/lib/homepageLayout";

/** Same proportional frame in the editor and storefront. Never crops the source image. */
export function HeroBottle({
  image,
  alt,
  priority = false,
  guides = false,
}: {
  image: HeroBottleImage;
  alt: string;
  priority?: boolean;
  guides?: boolean;
}) {
  return (
    <div className="relative mx-auto aspect-[176/230] h-full max-w-full">
      <img
        src={image.imageUrl}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ transform: `translate(${image.x}%, ${image.y}%) scale(${image.scale / 100})` }}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={false}
      />
      {guides ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 inset-y-[8%] border-y border-dashed border-emerald-400"
        >
          <div className="mx-auto h-full w-px border-l border-dashed border-emerald-400/60" />
        </div>
      ) : null}
    </div>
  );
}
