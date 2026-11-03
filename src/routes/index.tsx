import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark, LangToggle } from "@/components/fz/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { WORLDS, PAGES, STATUS_LABEL } from "@/lib/pages";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FRAME ZERO · كادر صفر — From one thought to the final cut" },
      { name: "description", content: "A bilingual Arabic/English filmmaker workspace for private film development: brief, directing, cast, world and shot planning." },
      { property: "og:title", content: "FRAME ZERO · كادر صفر" },
      { property: "og:description", content: "From one thought to the final cut. Story before spectacle. Human director control." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PRINCIPLES = [
  { en: "Story before spectacle", ar: "القصة قبل الإبهار" },
  { en: "Psychologically credible, playable acting", ar: "أداء نفسي صادق وقابل للتمثيل" },
  { en: "Motivated camera", ar: "كاميرا لها دافع" },
  { en: "Restrained color", ar: "لون منضبط" },
  { en: "Deliberate cutting", ar: "قطع مقصود" },
  { en: "Human director control", ar: "السيطرة للمخرج الإنسان" },
];

function Landing() {
  const { tx, t } = useI18n();
  const { user } = useSession();
  return (
    <div className="min-h-screen bg-stage">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <BrandMark />
        <div className="flex items-center gap-1">
          <LangToggle />
          {user ? (
            <Button asChild size="sm" variant="frame"><Link to="/projects">{t("library")}</Link></Button>
          ) : (
            <Button asChild size="sm" variant="frame"><Link to="/auth">{t("signIn")}</Link></Button>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-28">
        <p className="eyebrow">{tx({ en: "Egyptian-Arabic flagship · globally extensible", ar: "الإصدار المصري الرائد · قابل للتوسع عالميًا" })}</p>
        <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[1.05] text-ivory md:text-8xl">{t("tagline")}</h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
          {tx({
            en: "A private workspace for directors. Write the brief, choose a directing interpretation, build your cast and world, and plan every shot with a reason.",
            ar: "مساحة خاصة للمخرجين. اكتب الموجز، اختر قراءتك الإخراجية، ابنِ شخصياتك وعالمك، وخطّط كل لقطة بسبب.",
          })}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to={user ? "/projects/new" : "/auth"}>{tx({ en: "Start a film", ar: "ابدأ فيلمًا" })}</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/rights">{tx({ en: "Rights & honesty", ar: "الحقوق والشفافية" })}</Link></Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-md border border-border bg-border px-0 md:grid-cols-4">
        {WORLDS.map((w) => (
          <div key={w.id} className="bg-surface p-6">
            <p className="font-mono text-xs text-champagne">0{w.n}</p>
            <h2 className="mt-3 font-display text-3xl">{tx(w.label)}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {PAGES.filter((p) => p.world === w.id).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span>{tx(p.label)}</span>
                  <Badge variant={p.status}>{tx(STATUS_LABEL[p.status])}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="eyebrow">{tx({ en: "Creative philosophy", ar: "الفلسفة الإبداعية" })}</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <li key={i} className="border-t border-border pt-4 font-display text-2xl text-ivory/90">{tx(p)}</li>
          ))}
        </ul>
        <p className="mt-12 max-w-2xl text-sm text-muted-foreground">
          {tx({
            en: "Honest status: AI analysis and image, motion, voice or sound generation are not connected. Every suggestion in this app is a written proposal, never an invented fact. Stages marked Roadmap are not operational.",
            ar: "حالة صريحة: التحليل بالذكاء الاصطناعي وتوليد الصور والحركة والصوت غير متصلة. كل اقتراح في التطبيق مقترح مكتوب، لا حقيقة مختلقة. المراحل المعلّمة «خارطة الطريق» غير مفعّلة.",
          })}
        </p>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
          <span>© mrahmo studios</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="tap inline-flex items-center hover:text-foreground">{tx({ en: "Privacy", ar: "الخصوصية" })}</Link>
            <Link to="/rights" className="tap inline-flex items-center hover:text-foreground">{tx({ en: "Rights", ar: "الحقوق" })}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
