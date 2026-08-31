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
      <main className="bg-white px-5 pb-24 pt-32 text-black sm:px-8 sm:pt-40">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs text-black/45">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-display text-6xl leading-[0.88] sm:text-8xl">
            {title}
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-8 text-black/65 sm:text-lg">{intro}</p>
          {updated ? (
            <p className="mt-5 text-[10px] uppercase tracking-[0.12em] text-black/40">
              Last updated {updated}
            </p>
          ) : null}

          <div className="mt-16 border-t border-black/12">
            {sections.map((section) => (
              <section
                key={section.title}
                className="grid gap-5 border-b border-black/12 py-10 sm:grid-cols-[0.7fr_1.3fr] sm:gap-12 sm:py-12"
              >
                <h2 className="font-display text-2xl leading-none sm:text-3xl">{section.title}</h2>
                <div className="space-y-5 text-sm leading-7 text-black/65 sm:text-[15px] sm:leading-8">
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
