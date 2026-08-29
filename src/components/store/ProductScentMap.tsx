import { BOTTLE_IMAGES, SCENT_PROFILE_IMAGES, type Product } from "@/lib/products";

type ScentCallout = {
  index: string;
  label: string;
  title: string;
  target: [number, number];
};

const TARGETS: Record<string, [number, number][]> = {
  dariya: [
    [710, 415],
    [965, 405],
    [1195, 420],
  ],
  fitoor: [
    [690, 385],
    [1130, 430],
    [885, 500],
  ],
  "oud-gulaab": [
    [800, 355],
    [585, 425],
    [1160, 455],
  ],
  "oud-zafar": [
    [575, 420],
    [885, 450],
    [1170, 420],
  ],
  ulfat: [
    [625, 375],
    [915, 475],
    [1180, 435],
  ],
};

const CALLOUT_STARTS: [number, number][] = [
  [585, 151],
  [855, 151],
  [1115, 151],
];

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

function scentCallouts(product: Product): ScentCallout[] {
  const groups = scentGroups(product);
  const fallbackTargets: [number, number][] = [
    [700, 410],
    [930, 430],
    [1160, 420],
  ];
  const targets = TARGETS[product.id] || fallbackTargets;

  return groups.slice(0, 3).map((notes, index) => ({
    index: `0${index + 1}`,
    label: layerLabel(notes, index),
    title: joinNotes(notes),
    target: targets[index] || fallbackTargets[index],
  }));
}

export function ProductScentMap({ product }: { product: Product }) {
  const callouts = scentCallouts(product);
  const bottle = BOTTLE_IMAGES[product.id] || product.image;
  const ingredients = SCENT_PROFILE_IMAGES[product.id] || product.image;

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
            Follow the composition from its first bright note to the trace that stays on skin.
          </p>
        </div>
      </header>

      <div className="no-scrollbar mt-9 overflow-x-auto px-5 sm:mt-12 sm:px-8">
        <div className="relative mx-auto aspect-[1360/610] min-w-[690px] max-w-[1380px] overflow-hidden border border-black/15 bg-white">
          <img
            src={ingredients}
            alt={`${product.name} perfume ingredients: ${product.notes.join(", ")}`}
            className="absolute inset-y-0 right-0 h-full w-[70%] object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-y-0 left-[26%] w-[20%] bg-gradient-to-r from-white via-white/92 to-transparent" />

          <div className="absolute bottom-[8%] left-[2.5%] top-[7%] w-[31%] bg-white">
            <div className="absolute left-0 top-0 z-10 max-w-[250px]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/42">
                Scent anatomy
              </p>
              <p className="mt-2 font-display text-[34px] leading-[0.92]">{product.name}</p>
              <p className="mt-3 max-w-[210px] text-[11px] leading-5 text-black/55">
                {product.tag}
              </p>
            </div>
            <img
              src={bottle}
              alt={`${product.name} BADR attar bottle`}
              className="absolute -bottom-[4%] left-[20%] h-[83%] w-[76%] object-contain drop-shadow-[0_24px_20px_rgba(0,0,0,0.14)]"
              loading="lazy"
              decoding="async"
            />
            <p className="absolute bottom-0 left-0 text-[9px] font-medium uppercase tracking-[0.1em] text-black/45">
              {product.volume || "6 ml"} · {product.longevity}
            </p>
          </div>

          <svg
            viewBox="0 0 1360 610"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.2" className="text-black/65">
              {callouts.map((callout, index) => {
                const [startX, startY] = CALLOUT_STARTS[index];
                const [targetX, targetY] = callout.target;
                const middleY = Math.max(startY + 50, targetY - 72);
                return (
                  <path
                    key={callout.index}
                    d={`M ${startX} ${startY} V ${middleY} L ${targetX} ${targetY}`}
                  />
                );
              })}
            </g>
            <g fill="white" stroke="currentColor" strokeWidth="2" className="text-black">
              {callouts.map((callout) => (
                <circle key={callout.index} cx={callout.target[0]} cy={callout.target[1]} r="5" />
              ))}
            </g>
          </svg>

          <div className="absolute left-[39%] right-[2.5%] top-[6%] grid grid-cols-3 gap-[4%]">
            {callouts.map((callout) => (
              <article key={callout.index} className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-black/40 bg-white text-[7px] font-semibold">
                    {callout.index}
                  </span>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-black/55">
                    {callout.label}
                  </p>
                </div>
                <h3 className="mt-2 max-w-[220px] font-display text-[18px] leading-[0.95] tracking-[-0.02em] lg:text-[25px]">
                  {callout.title}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 px-5 text-right text-[9px] uppercase tracking-[0.12em] text-black/42 sm:hidden">
        Swipe to follow the notes →
      </p>
    </section>
  );
}
