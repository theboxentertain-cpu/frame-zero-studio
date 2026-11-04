import { Link } from "@tanstack/react-router";
import createImg from "@/assets/portal-create.webp";
import castImg from "@/assets/portal-cast-world.webp";
import directImg from "@/assets/portal-direct.webp";
import finishImg from "@/assets/portal-finish.webp";
import { Badge } from "@/components/ui/badge";
import { useI18n, type Bi } from "@/lib/i18n";
import { PAGES, STATUS_LABEL, WORLDS } from "@/lib/pages";

const ART: Record<string, { src: string; place: Bi }> = {
  create: { src: createImg, place: { en: "Screenplay & treatment desk", ar: "مكتب السيناريو والمعالجة" } },
  cast_world: { src: castImg, place: { en: "Casting & location wall", ar: "جدار الممثلين والأماكن" } },
  direct: { src: directImg, place: { en: "Camera, monitor & storyboard wall", ar: "الكاميرا والشاشة ولوحة القصة" } },
  finish: { src: finishImg, place: { en: "Editing desk & timeline", ar: "مكتب المونتاج والخط الزمني" } },
};

/**
 * The four existing worlds as illustrated portals. Each portal is a real link:
 * with a projectId it opens that world's first page; without one it opens the library.
 */
export function WorldPortals({ projectId, signedIn }: { projectId?: string; signedIn?: boolean }) {
  const { tx } = useI18n();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {WORLDS.map((w) => {
        const pages = PAGES.filter((p) => p.world === w.id && p.scope === "project");
        const first = pages[0]!;
        const art = ART[w.id]!;
        const body = (
          <>
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={art.src}
                alt=""
                width={720}
                height={540}
                loading="lazy"
                className="motion-lamp size-full object-cover opacity-80 group-hover:scale-[1.03] group-hover:opacity-100 group-focus-visible:opacity-100"
              />
              <div className="bg-scrim absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-mono text-xs text-brass">0{w.n}</p>
                <h3 className="font-display text-3xl text-ivory">{tx(w.label)}</h3>
                <p className="text-xs text-ivory/70">{tx(art.place)}</p>
              </div>
            </div>
            <ul className="space-y-1.5 p-4 text-sm">
              {pages.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="truncate">{tx(p.label)}</span>
                  <Badge variant={p.status}>{tx(STATUS_LABEL[p.status])}</Badge>
                </li>
              ))}
            </ul>
          </>
        );
        const cls =
          "group shadow-frame block overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-lift focus-visible:shadow-lift";
        return projectId ? (
          <Link
            key={w.id}
            to={`/projects/$id/${first.seg}` as "/projects/$id/brief"}
            params={{ id: projectId }}
            className={cls}
            aria-label={`${tx(w.label)} — ${tx(art.place)}`}
          >
            {body}
          </Link>
        ) : (
          <Link
            key={w.id}
            to={signedIn ? "/projects" : "/auth"}
            className={cls}
            aria-label={`${tx(w.label)} — ${tx({ en: "open a film to enter", ar: "افتح فيلمًا للدخول" })}`}
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}
