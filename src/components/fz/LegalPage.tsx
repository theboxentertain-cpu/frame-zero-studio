import { Link } from "@tanstack/react-router";
import { BrandMark, LangToggle } from "./AppShell";
import { useI18n, type Bi } from "@/lib/i18n";

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: Bi;
  intro: Bi;
  sections: { h: Bi; p: Bi }[];
}) {
  const { tx } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Link to="/" className="tap inline-flex items-center">
          <BrandMark />
        </Link>
        <LangToggle />
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-8 pb-20">
        <h1 className="font-display text-5xl">{tx(title)}</h1>
        <p className="mt-4 text-muted-foreground">{tx(intro)}</p>
        <div className="mt-10 space-y-8">
          {sections.map((s, i) => (
            <section key={i} className="border-t border-border pt-5">
              <h2 className="font-display text-2xl text-ivory">{tx(s.h)}</h2>
              <p className="mt-2 leading-relaxed text-ivory/80">{tx(s.p)}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 text-xs text-muted-foreground">
          {tx({
            en: "Draft policy text for review by counsel before public launch.",
            ar: "نص مبدئي يحتاج مراجعة قانونية قبل الإطلاق العام.",
          })}
        </p>
      </main>
    </div>
  );
}
