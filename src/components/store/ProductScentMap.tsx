import realBergamot from "@/assets/real-bergamot.jpg";
import realMandarin from "@/assets/real-mandarin.jpg";
import realVetiver from "@/assets/real-vetiver.jpg";
import notesDariya from "@/assets/notes-dariya.webp";
import notesFitoor from "@/assets/notes-fitoor.webp";
import notesOudGulaab from "@/assets/notes-oud-gulaab.webp";
import notesOudZafar from "@/assets/notes-oud-zafar.webp";
import notesUlfat from "@/assets/notes-ulfat.webp";
import { BOTTLE_IMAGES, type Product } from "@/lib/products";

type ScentCallout = {
  index: string;
  label: string;
  title: string;
  detail: string;
};

type VerifiedPhoto = {
  src: string;
  alt: string;
  credit: string;
  href: string;
  position?: string;
};

const DARIYA_PHOTOS: VerifiedPhoto[] = [
  {
    src: realBergamot,
    alt: "A basket of real bergamot fruit from Calabria",
    credit: "Bergamot: Jacopo Werther",
    href: "https://commons.wikimedia.org/wiki/File:Bergamotti_(Bergamot_fruits).jpg",
    position: "50% 45%",
  },
  {
    src: realMandarin,
    alt: "Real peeled mandarin segments and peel on slate",
    credit: "Mandarin: Nataliya Vaitkevich",
    href: "https://www.pexels.com/photo/orange-peel-and-pieces-of-mandarin-on-a-chopping-board-5735594/",
    position: "64% 50%",
  },
  {
    src: realVetiver,
    alt: "Bundles of real harvested vetiver roots",
    credit: "Vetiver: David Monniaux",
    href: "https://commons.wikimedia.org/wiki/File:Vetiveria_zizanoides_dsc07810.jpg",
    position: "52% 50%",
  },
];

const NOTE_IMAGES: Record<string, string> = {
  dariya: notesDariya,
  fitoor: notesFitoor,
  "oud-gulaab": notesOudGulaab,
  "oud-zafar": notesOudZafar,
  ulfat: notesUlfat,
};

const NOTE_IMAGE_POSITIONS = ["18% 50%", "50% 50%", "82% 50%"];

function joinNotes(notes: string[]) {
  return notes.filter(Boolean).join(" & ");
}

function layerLabel(notes: string[], layer: number) {
  const value = notes.join(" ").toLowerCase();

  if (/(bergamot|mandarin|lemon|lime|orange|citrus)/.test(value)) {
    return layer === 2 ? "Citrus base" : "Citrus opening";
  }
  if (/(pineapple|apple|pear|fruit)/.test(value)) {
    return layer === 0 ? "Juicy opening" : "Crisp fruit";
  }
  if (/(rose|jasmine|flower|floral)/.test(value)) return "Floral heart";
  if (/(saffron|spice)/.test(value)) return "Spiced warmth";
  if (/(lavender|herb|aromatic)/.test(value)) return "Aromatic opening";
  if (/(vetiver)/.test(value)) return "Earthy base";
  if (/(oud|sandalwood|wood)/.test(value)) return layer === 2 ? "Woody base" : "Woody depth";
  if (/(vanilla|amber|musk)/.test(value)) return layer === 2 ? "Warm drydown" : "Soft warmth";
  return layer === 0 ? "First impression" : layer === 1 ? "At the heart" : "The drydown";
}

function scentGroups(product: Product) {
  const notes = product.notes.length ? product.notes : [product.tag];

  if (notes.length <= 3) return notes.map((note) => [note]);
  if (notes.length === 4) return [[notes[0]], [notes[1]], notes.slice(2)];
  return [notes.slice(0, 2), notes.slice(2, 3), notes.slice(3)];
}

function calloutDetail(title: string, index: number) {
  const note = title.toLowerCase();
  if (note.includes("bergamot")) return "Bright, green citrus opens the fragrance clean.";
  if (note.includes("mandarin")) return "Juicy softness rounds the sharper citrus edge.";
  if (note.includes("vetiver")) return "Dry roots create the earthy base that stays.";
  if (index === 0) return "The first notes you notice when the oil meets skin.";
  if (index === 1) return "The character at the centre of the composition.";
  return "The lasting trace that settles closest to skin.";
}

function scentCallouts(product: Product): ScentCallout[] {
  return scentGroups(product)
    .slice(0, 3)
    .map((notes, index) => {
      const title = joinNotes(notes);
      return {
        index: `0${index + 1}`,
        label: layerLabel(notes, index),
        title,
        detail: calloutDetail(title, index),
      };
    });
}

export function ProductScentMap({ product }: { product: Product }) {
  const callouts = scentCallouts(product);
  const bottle = BOTTLE_IMAGES[product.id] || product.image;
  const verifiedPhotos = product.id === "dariya" ? DARIYA_PHOTOS : [];
  const noteImage = NOTE_IMAGES[product.id];

  return (
    <section className="overflow-hidden border-t border-black/10 bg-white py-14 sm:py-20 lg:py-24">
      <header className="mx-auto max-w-[1380px] px-5 sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
          Inside {product.name}
        </p>
        <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <h2 className="max-w-3xl font-display text-4xl leading-[0.94] sm:text-6xl">
            The scent, ingredient by ingredient.
          </h2>
          <p className="max-w-md text-sm leading-6 text-black/58 sm:text-base sm:leading-7">
            Real materials. Clear notes. No invented product scene.
          </p>
        </div>
      </header>

      <div className="no-scrollbar mt-9 overflow-x-auto px-5 sm:mt-12 sm:px-8">
        <div className="mx-auto grid h-[440px] min-w-[720px] max-w-[1380px] grid-cols-[31%_repeat(3,minmax(0,1fr))] overflow-hidden border border-black/20 bg-white lg:h-[600px] lg:grid-cols-[27%_repeat(3,minmax(0,1fr))]">
          <article className="relative overflow-hidden bg-white px-6 py-7 lg:px-10 lg:py-10">
            <div className="relative z-10">
              <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">
                BADR scent anatomy
              </p>
              <h3 className="mt-2 font-display text-3xl leading-none lg:text-5xl">
                {product.name}
              </h3>
              <p className="mt-3 max-w-48 text-[10px] leading-5 text-black/55 lg:text-xs">
                {product.tag}
              </p>
            </div>
            <img
              src={bottle}
              alt={`${product.name} BADR attar bottle`}
              className="absolute bottom-[7%] left-[17%] h-[69%] w-[72%] object-contain drop-shadow-[0_22px_18px_rgba(0,0,0,0.13)]"
              loading="lazy"
              decoding="async"
            />
            <p className="absolute bottom-5 left-6 text-[8px] font-medium uppercase tracking-[0.1em] text-black/45 lg:bottom-8 lg:left-10">
              {product.volume || "6 ml"} · {product.longevity}
            </p>
          </article>

          {callouts.map((callout, index) => {
            const photo = verifiedPhotos[index];
            const image = photo?.src || noteImage;
            return (
              <article
                key={callout.index}
                className="relative min-w-0 overflow-hidden border-l border-black/20 bg-white"
              >
                {image ? (
                  <figure className="absolute inset-x-0 top-0 h-[62%] overflow-hidden bg-[#f3f3f1]">
                    <img
                      src={image}
                      alt={photo?.alt || `${callout.title} ingredients in ${product.name}`}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: photo?.position || NOTE_IMAGE_POSITIONS[index] }}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                ) : (
                  <div className="absolute inset-x-0 top-0 h-[62%] bg-[#f3f3f1]" />
                )}

                <span className="absolute left-1/2 top-[55%] h-[19%] w-px -translate-x-1/2 bg-black/75">
                  <span className="absolute -left-1 top-0 h-2 w-2 rounded-full border border-black bg-white" />
                </span>

                <div className="absolute inset-x-4 bottom-5 lg:inset-x-7 lg:bottom-8">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.13em] text-black/55">
                    {callout.label}
                  </p>
                  <h3 className="mt-2 font-display text-xl leading-none tracking-[-0.02em] lg:text-3xl">
                    {callout.title}
                  </h3>
                  <p className="mt-3 max-w-56 text-[9px] leading-4 text-black/55 lg:text-[11px] lg:leading-5">
                    {callout.detail}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-3 flex max-w-[1380px] flex-wrap justify-between gap-3 px-5 sm:px-8">
        <p className="text-[8px] uppercase tracking-[0.12em] text-black/40 sm:hidden">
          Swipe to follow the notes →
        </p>
        {verifiedPhotos.length ? (
          <p className="text-[8px] leading-4 text-black/35">
            Documentary ingredient photography:{" "}
            {verifiedPhotos.map((photo, index) => (
              <span key={photo.href}>
                {index ? " · " : ""}
                <a
                  href={photo.href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {photo.credit}
                </a>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </section>
  );
}
