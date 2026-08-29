import { BOTTLE_IMAGES, type Product } from "@/lib/products";

type ScentLayer = {
  index: string;
  label: string;
  title: string;
  detail: string;
  placement: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

function joinNotes(notes: string[]) {
  return notes.filter(Boolean).join(" & ");
}

function scentLayers(product: Product): ScentLayer[] {
  const notes = product.notes.length ? product.notes : [product.tag];
  const openingCount = notes.length >= 4 ? 2 : 1;
  const opening = notes.slice(0, openingCount);
  const remaining = notes.slice(openingCount);
  const drydownCount = remaining.length >= 3 ? 2 : 1;
  const heart = remaining.slice(0, Math.max(1, remaining.length - drydownCount));
  const drydown = remaining.slice(Math.max(1, remaining.length - drydownCount));

  return [
    {
      index: "01",
      label: "First impression",
      title: joinNotes(opening) || product.tag,
      detail: "The notes you notice first, bright on the initial roll.",
      placement: "top-left",
    },
    {
      index: "02",
      label: "At the heart",
      title: joinNotes(heart) || product.tag,
      detail: "The character at the centre of the composition.",
      placement: "top-right",
    },
    {
      index: "03",
      label: "The drydown",
      title: joinNotes(drydown) || product.notes.at(-1) || product.tag,
      detail: "The trace that settles closest and stays on skin.",
      placement: "bottom-left",
    },
    {
      index: "04",
      label: "On skin",
      title: product.longevity,
      detail: `${product.intensity} intensity · ${product.format || "Roll-on attar"}`,
      placement: "bottom-right",
    },
  ];
}

const placementClasses: Record<ScentLayer["placement"], string> = {
  "top-left": "left-[1.5%] top-[8%] text-left",
  "top-right": "right-[1.5%] top-[18%] text-right",
  "bottom-left": "bottom-[13%] left-[1.5%] text-left",
  "bottom-right": "bottom-[5%] right-[1.5%] text-right",
};

export function ProductScentMap({ product }: { product: Product }) {
  const layers = scentLayers(product);
  const bottle = BOTTLE_IMAGES[product.id] || product.image;

  return (
    <section className="overflow-hidden bg-[#eee8de] px-4 py-16 sm:px-7 sm:py-24">
      <div className="mx-auto max-w-[1380px]">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
            The scent, unfolded
          </p>
          <h2 className="mt-4 font-display text-4xl leading-[0.92] sm:text-6xl">
            How {product.name} moves on skin.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-black/58 sm:text-base">
            From the first roll to the final trace, every layer has a part to play.
          </p>
        </header>

        <div className="relative mx-auto mt-10 hidden aspect-[12/7.4] max-w-[1200px] lg:block">
          <div className="absolute bottom-[4%] left-1/2 top-[3%] w-[31%] -translate-x-1/2">
            <span className="absolute inset-x-[18%] bottom-[2%] h-[6%] rounded-[50%] bg-black/12 blur-xl" />
            <img
              src={bottle}
              alt={`${product.name} attar bottle with scent profile callouts`}
              className="relative h-full w-full object-contain drop-shadow-[0_28px_24px_rgba(0,0,0,0.12)]"
              loading="lazy"
              decoding="async"
            />
          </div>

          <svg
            viewBox="0 0 1200 740"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.15" className="text-black/42">
              <path d="M268 158 H422 L526 226" />
              <path d="M932 234 H782 L672 294" />
              <path d="M268 535 H430 L534 474" />
              <path d="M932 604 H776 L660 574" />
            </g>
            <g fill="currentColor" className="text-black">
              <circle cx="526" cy="226" r="4" />
              <circle cx="672" cy="294" r="4" />
              <circle cx="534" cy="474" r="4" />
              <circle cx="660" cy="574" r="4" />
            </g>
          </svg>

          {layers.map((layer) => (
            <article
              key={layer.index}
              className={`group absolute w-[25%] ${placementClasses[layer.placement]}`}
            >
              <div
                className={`mb-4 flex items-center gap-3 ${layer.placement.endsWith("right") ? "flex-row-reverse" : ""}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/25 text-[9px] font-semibold transition-colors duration-500 group-hover:border-black group-hover:bg-black group-hover:text-white">
                  {layer.index}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/45">
                  {layer.label}
                </span>
              </div>
              <h3 className="font-display text-3xl leading-none xl:text-[2.15rem]">
                {layer.title}
              </h3>
              <p
                className={`mt-3 max-w-[270px] text-xs leading-5 text-black/52 ${layer.placement.endsWith("right") ? "ml-auto" : ""}`}
              >
                {layer.detail}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 lg:hidden">
          <figure className="relative mx-auto aspect-[4/5] max-w-[420px]">
            <span className="absolute inset-x-[24%] bottom-[5%] h-[5%] rounded-[50%] bg-black/12 blur-lg" />
            <img
              src={bottle}
              alt={`${product.name} attar bottle`}
              className="relative h-full w-full object-contain px-10 drop-shadow-[0_22px_20px_rgba(0,0,0,0.12)]"
              loading="lazy"
              decoding="async"
            />
          </figure>

          <div className="grid gap-px overflow-hidden border border-black/15 bg-black/15 sm:grid-cols-2">
            {layers.map((layer) => (
              <article key={layer.index} className="bg-[#eee8de] p-5 sm:min-h-48 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/42">
                    {layer.label}
                  </span>
                  <span className="text-[9px] text-black/35">{layer.index}</span>
                </div>
                <h3 className="mt-5 font-display text-2xl leading-none">{layer.title}</h3>
                <p className="mt-3 text-xs leading-5 text-black/55">{layer.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-[9px] uppercase tracking-[0.12em] text-black/38">
          {product.volume || "6 ml"} concentrated perfume oil · Made in{" "}
          {product.countryOfOrigin || "India"}
        </p>
      </div>
    </section>
  );
}
