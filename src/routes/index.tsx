import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark, LangToggle } from "@/components/fz/AppShell";
import { Logo, Presents } from "@/components/brand/Logo";
import { WorldPortals } from "@/components/brand/Portals";
import { Director } from "@/components/brand/Director";
import { OPENING_REMARKS } from "@/lib/director";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import controlRoom from "@/assets/director-control-room-sm.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MIZENZA · ميزنزا — The Filmmaker's Studio" },
      {
        name: "description",
        content:
          "Every shot has a reason. A private bilingual Arabic/English workspace where directors write the brief, the cast, the world and every motivated shot.",
      },
      { property: "og:title", content: "MIZENZA · ميزنزا" },
      {
        property: "og:description",
        content:
          "The Filmmaker's Studio — every shot has a reason. Story before spectacle. Human director control.",
      },
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
      <header className="mx-auto flex max-w-6xl items-end justify-between px-4 pt-6">
        <div>
          <Presents />
          <Link to="/" className="tap mt-1.5 inline-flex items-center">
            <BrandMark />
          </Link>
        </div>
        <div className="flex items-center gap-1 pb-1">
          <LangToggle />
          {user ? (
            <Button asChild size="sm" variant="frame">
              <Link to="/projects">{t("library")}</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="frame">
              <Link to="/auth">{t("signIn")}</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Control room hero: one illustrated space, every control a real element */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-10 pb-16 md:grid-cols-2 md:pt-16">
        <div>
          <p className="eyebrow">{t("studio")}</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ivory md:text-7xl">
            {t("philosophy")}
          </h1>
          <p className="mt-4 max-w-xl font-display text-xl italic text-brass md:text-2xl">
            {t("tagline")}
          </p>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            {tx({
              en: "A private workspace for directors. Write the brief, choose a directing interpretation, build your cast and world, and plan every shot with a reason.",
              ar: "مساحة خاصة للمخرجين. اكتب الموجز، اختر قراءتك الإخراجية، ابنِ شخصياتك وعالمك، وخطّط كل لقطة بسبب.",
            })}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={user ? "/projects/new" : "/auth"}>
                {tx({ en: "Start a film", ar: "ابدأ فيلمًا" })}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/rights">{tx({ en: "Rights & honesty", ar: "الحقوق والشفافية" })}</Link>
            </Button>
          </div>
        </div>
        <figure className="frame-corners shadow-frame relative overflow-hidden rounded-lg border border-border">
          <img
            src={controlRoom}
            alt={tx({
              en: "The Director's control room: a worn wood desk under a warm brass lamp, storyboard pinboard, camera and viewfinder, annotated shot list and casting wall.",
              ar: "غرفة تحكم المخرج: مكتب خشب مستهل تحت مصباح نحاسي دافئ، لوحة قصة مثبّتة، كاميرا وعدسة، قائمة لقطات مشروحة وجدار اختيار ممثلين.",
            })}
            width={1024}
            height={1024}
            className="motion-lamp size-full object-cover"
          />
          <div className="bg-scrim absolute inset-x-0 bottom-0 p-4">
            <figcaption className="text-xs text-ivory/75">
              {tx({
                en: "The Director is in. He questions every shot — you make every decision.",
                ar: "المخرج في مكانه. يسائل كل لقطة — وأنت من يتخذ كل قرار.",
              })}
            </figcaption>
          </div>
        </figure>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4">
        <Director remarks={OPENING_REMARKS} showScope={false} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="eyebrow">{tx({ en: "Four worlds", ar: "أربعة عوالم" })}</p>
        <h2 className="mt-3 font-display text-3xl text-ivory md:text-4xl">
          {tx({
            en: "Walk from his office into the control room.",
            ar: "من مكتبه إلى غرفة التحكم.",
          })}
        </h2>
        <div className="mt-8">
          <WorldPortals signedIn={!!user} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <p className="eyebrow">{tx({ en: "Creative philosophy", ar: "الفلسفة الإبداعية" })}</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <li key={i} className="border-t border-border pt-4 font-display text-2xl text-ivory/90">
              {tx(p)}
            </li>
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
          <span className="inline-flex items-center gap-2">
            <Logo variant="icon" className="size-6" decorative />© mrahmostudios
          </span>
          <div className="flex gap-4">
            <Link to="/privacy" className="tap inline-flex items-center hover:text-foreground">
              {tx({ en: "Privacy", ar: "الخصوصية" })}
            </Link>
            <Link to="/rights" className="tap inline-flex items-center hover:text-foreground">
              {tx({ en: "Rights", ar: "الحقوق" })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
