import { Link } from "@tanstack/react-router";
import { SiteFooter, StoreShell } from "./StoreShell";

export type InformationSection = {
  title: string;
  paragraphs: Array<string | { label: string; href: string }>;
  bullets?: string[];
};

export function InformationPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated?: string;
  sections: InformationSection[];
}) {
  return (
    <StoreShell>
      <main className="bg-white px-5 pb-20 pt-28 text-left text-black [overflow-wrap:anywhere] sm:px-8 sm:pb-24 sm:pt-40">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs leading-5 text-black/60">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-balance font-display text-[clamp(2rem,8.5vw,2.5rem)] leading-[1.12] sm:text-6xl sm:leading-[1.05] lg:text-8xl lg:leading-[0.95]">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-black/75 sm:mt-8 sm:text-lg sm:leading-8">
            {intro}
          </p>
          {updated ? (
            <p className="mt-4 text-xs leading-5 text-black/60 sm:mt-5">Last updated {updated}</p>
          ) : null}

          <div className="mt-10 border-t border-black/12 sm:mt-16">
            {sections.map((section) => (
              <section
                key={section.title}
                className="grid gap-4 border-b border-black/12 py-8 sm:gap-6 sm:py-12 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-12"
              >
                <h2 className="min-w-0 text-balance font-display text-[22px] leading-[1.25] sm:text-3xl">
                  {section.title}
                </h2>
                <div className="min-w-0 space-y-4 text-base leading-7 text-black/75 sm:space-y-5 sm:leading-8">
                  {section.paragraphs.map((paragraph) =>
                    typeof paragraph === "string" ? (
                      <p key={paragraph}>{paragraph}</p>
                    ) : paragraph.href.startsWith("/") ? (
                      <p key={paragraph.href}>
                        <Link
                          className="font-semibold underline underline-offset-4"
                          to={paragraph.href}
                        >
                          {paragraph.label}
                        </Link>
                      </p>
                    ) : (
                      <p key={paragraph.href}>
                        <a
                          className="font-semibold underline underline-offset-4"
                          href={paragraph.href}
                        >
                          {paragraph.label}
                        </a>
                      </p>
                    ),
                  )}
                  {section.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}
