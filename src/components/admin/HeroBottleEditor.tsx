import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HeroBottle } from "@/components/store/HeroBottle";
import type { HeroBottleImage, HomepageHeroSection } from "@/lib/homepageLayout";
import { BOTTLE_IMAGES, type Product } from "@/lib/products";
import { uploadProductImage } from "@/services/adminService";

export function HeroBottleEditor({
  section,
  products,
  onChange,
}: {
  section: HomepageHeroSection;
  products: Product[];
  onChange: (section: HomepageHeroSection) => void;
}) {
  const [selectedId, setSelectedId] = useState(section.productIds[0] ?? "");
  const [uploading, setUploading] = useState(false);
  const latest = useRef({ section, onChange });
  latest.current = { section, onChange };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const selectedProducts = section.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);
  const product = selectedProducts.find((p) => p.id === selectedId) ?? selectedProducts[0];
  if (!product) return null;
  const original = BOTTLE_IMAGES[product.id] || product.image;
  const saved = section.bottleImages?.find((image) => image.productId === product.id);
  const image: HeroBottleImage = saved ?? {
    productId: product.id,
    imageUrl: original,
    scale: 100,
    x: 0,
    y: 0,
  };
  const gallery = [...new Set([product.image, ...(product.gallery ?? [])])].filter(
    (url) => url && !/\.(mp4|webm)(?:[?#]|$)/i.test(url),
  );
  const update = (next: HeroBottleImage) => {
    const current = latest.current;
    current.onChange({
      ...current.section,
      bottleImages: [
        ...(current.section.bottleImages ?? []).filter((item) => item.productId !== next.productId),
        next,
      ],
    });
  };
  const replace = (imageUrl: string) =>
    update({ productId: product.id, imageUrl, scale: 100, x: 0, y: 0 });
  const upload = async (file: File) => {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file.name)) {
      toast.error("Choose a JPG, PNG, WebP or AVIF image.");
      return;
    }
    const productId = product.id;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      if (!url) throw new Error("No image URL was returned.");
      if (mounted.current) {
        update({ productId, imageUrl: url, scale: 100, x: 0, y: 0 });
        toast.success("Hero image added to draft");
      }
    } catch (error) {
      toast.error("Image upload failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      if (mounted.current) setUploading(false);
    }
  };
  return (
    <section
      className="@container space-y-5 rounded-lg border border-zinc-300 p-4 sm:p-5"
      aria-label="Hero bottle images"
    >
      <div>
        <h3 className="text-sm font-semibold">Hero bottle images</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-600">
          Separate from product photos. Changes go live when you publish the homepage.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Choose fragrance">
        {selectedProducts.map((item) => (
          <button
            type="button"
            key={item.id}
            disabled={uploading}
            aria-pressed={item.id === product.id}
            onClick={() => setSelectedId(item.id)}
            className={`min-h-10 rounded-md border px-3 text-xs font-semibold ${item.id === product.id ? "border-black bg-black text-white" : "border-zinc-300 bg-white text-zinc-800"}`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="grid gap-5 @min-[520px]:grid-cols-2">
        <div className="rounded-md bg-black px-4 py-5">
          <div className="mx-auto aspect-[176/230] w-full max-w-44 overflow-hidden">
            <HeroBottle image={image} alt={`${product.name} hero preview`} guides />
          </div>
          <p className="mt-4 text-center text-xs text-white/80">
            Match the cap and base to the green guides.
          </p>
        </div>
        <div className="space-y-5">
          <label
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-black px-4 text-sm font-semibold text-white ${uploading ? "opacity-50" : ""}`}
          >
            {uploading ? "Uploading…" : "Upload replacement"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file);
              }}
            />
          </label>
          {(
            [
              ["scale", "Bottle size", 50, 300],
              ["x", "Move left / right", -50, 50],
              ["y", "Move up / down", -50, 50],
            ] as const
          ).map(([key, label, min, max]) => (
            <label key={key} className="block text-xs font-medium">
              <span className="mb-2 flex justify-between gap-3">
                <span>{label}</span>
                <span>{image[key]}%</span>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={1}
                value={image[key]}
                disabled={uploading}
                className="w-full accent-black"
                onChange={(event) => update({ ...image, [key]: Number(event.target.value) })}
              />
            </label>
          ))}
          <button
            type="button"
            disabled={uploading}
            className="min-h-10 rounded-md border border-zinc-300 px-3 text-xs font-semibold"
            onClick={() => update({ ...image, scale: 100, x: 0, y: 0 })}
          >
            Reset size & position
          </button>
        </div>
      </div>
      <p className="text-xs leading-5 text-zinc-600">
        No automatic cropping. Use the same guides for every bottle; check that the whole bottle
        stays in frame. Transparent PNG or WebP works best on the dark hero.
      </p>
      {gallery.length ? (
        <div>
          <p className="mb-3 text-xs font-semibold">Or choose a product photo</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {gallery.map((url, index) => (
              <button
                type="button"
                key={url}
                disabled={uploading}
                aria-label={`Use product photo ${index + 1} for ${product.name}`}
                aria-pressed={image.imageUrl === url}
                onClick={() => replace(url)}
                className={`h-16 w-16 shrink-0 rounded-md border-2 p-1 ${image.imageUrl === url ? "border-black" : "border-zinc-200"}`}
              >
                <img src={url} alt="" loading="lazy" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {saved ? (
        <button
          type="button"
          disabled={uploading}
          className="min-h-10 text-xs font-medium underline underline-offset-4"
          onClick={() =>
            onChange({
              ...section,
              bottleImages: section.bottleImages?.filter((item) => item.productId !== product.id),
            })
          }
        >
          Use original hero image
        </button>
      ) : null}
    </section>
  );
}
