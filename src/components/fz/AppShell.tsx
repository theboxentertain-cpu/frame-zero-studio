import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  BookOpen,
  Clapperboard,
  Film,
  Languages,
  LibraryBig,
  LogOut,
  Menu,
  PenLine,
  Plus,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PAGES, WORLDS, STATUS_LABEL, worldForPath, type PageDef, type World } from "@/lib/pages";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const WORLD_ICON: Record<string, typeof PenLine> = {
  create: PenLine,
  cast_world: Users,
  direct: Clapperboard,
  finish: Film,
};

export function projectPath(seg: string) {
  return `/projects/$id/${seg}` as "/projects/$id/brief";
}

export function firstPageOf(world: World) {
  return PAGES.find((p) => p.world === world && p.scope === "project")!;
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n();
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-display text-xl leading-none text-ivory">
        {locale === "ar" ? "كادر صفر" : "Frame Zero"}
      </span>
      {!compact && (
        <span className="eyebrow hidden opacity-70 sm:inline">{locale === "ar" ? "FRAME ZERO" : "كادر صفر"}</span>
      )}
    </span>
  );
}

export function LangToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="tap inline-flex items-center justify-center gap-2 rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Languages className="size-4" />
      <span>{locale === "ar" ? "EN" : "عربي"}</span>
    </button>
  );
}

function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

function StatusDot({ status }: { status: PageDef["status"] }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        status === "live" && "bg-success",
        status === "partial" && "bg-warning",
        status === "roadmap" && "border border-roadmap",
      )}
    />
  );
}

function ProjectNav({ projectId, onNavigate }: { projectId: string; onNavigate?: () => void }) {
  const { tx } = useI18n();
  const { pathname } = useLocation();
  const item = (p: PageDef) => {
    const href = `/projects/${projectId}/${p.seg}`;
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={p.id}
        to={projectPath(p.seg)}
        params={{ id: projectId }}
        onClick={onNavigate}
        className={cn(
          "tap flex items-center gap-3 rounded-md px-3 text-sm transition-colors",
          active ? "bg-champagne-dim text-champagne" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )}
        title={tx(STATUS_LABEL[p.status])}
      >
        <StatusDot status={p.status} />
        <span className="flex-1 truncate">{tx(p.label)}</span>
        <span className="font-mono text-[10px] opacity-40">{p.id}</span>
      </Link>
    );
  };
  return (
    <nav className="space-y-5">
      <Link
        to="/projects/$id"
        params={{ id: projectId }}
        onClick={onNavigate}
        className="tap flex items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent"
      >
        <Sparkles className="size-4 text-champagne" />
        {tx({ en: "Project overview", ar: "نظرة عامة" })}
      </Link>
      {WORLDS.map((w) => {
        const Icon = WORLD_ICON[w.id];
        return (
          <div key={w.id}>
            <div className="mb-1 flex items-center gap-2 px-3">
              <Icon className="size-3.5 text-champagne" />
              <span className="eyebrow">
                {w.n} · {tx(w.label)}
              </span>
            </div>
            <div className="space-y-0.5">{PAGES.filter((p) => p.world === w.id && p.scope === "project").map(item)}</div>
            {w.id === "direct" && (
              <p className="px-3 pt-1 text-[11px] leading-snug text-muted-foreground">
                {tx({
                  en: "Shot Lab, Storyboard, Production & Retake open per scene from the Navigator.",
                  ar: "معمل اللقطات واللوحة والتصوير والإعادة تُفتح لكل مشهد من المتصفح.",
                })}
              </p>
            )}
          </div>
        );
      })}
      <div>
        <div className="mb-1 px-3">
          <span className="eyebrow opacity-70">{tx({ en: "Utilities", ar: "أدوات" })}</span>
        </div>
        {PAGES.filter((p) => p.world === "utility" && p.scope === "project").map(item)}
      </div>
    </nav>
  );
}

function GlobalNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const cls =
    "tap flex items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground";
  const active = "!bg-champagne-dim !text-champagne";
  return (
    <nav className="space-y-0.5">
      <Link to="/projects" onClick={onNavigate} className={cls} activeOptions={{ exact: true }} activeProps={{ className: active }}>
        <LibraryBig className="size-4" /> {t("library")}
      </Link>
      <Link to="/projects/new" onClick={onNavigate} className={cls} activeProps={{ className: active }}>
        <Plus className="size-4" /> {t("newFilm")}
      </Link>
      <Link to="/account" onClick={onNavigate} className={cls} activeProps={{ className: active }}>
        <UserRound className="size-4" /> {t("account")}
      </Link>
    </nav>
  );
}

export function AppShell({ projectId, projectTitle, children }: { projectId?: string; projectTitle?: string; children: ReactNode }) {
  const { tx, t } = useI18n();
  const signOut = useSignOut();
  const { pathname } = useLocation();
  const currentWorld = worldForPath(pathname);

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-e border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center px-5">
          <Link to="/projects" className="tap inline-flex items-center">
            <BrandMark />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          <GlobalNav />
          {projectId && (
            <div className="mt-6 border-t border-sidebar-border pt-5">
              <p className="mb-3 truncate px-3 font-display text-lg text-ivory">{projectTitle}</p>
              <ProjectNav projectId={projectId} />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-sidebar-border px-2 py-2">
          <LangToggle />
          <button
            onClick={signOut}
            className="tap inline-flex items-center gap-2 rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-4" /> {t("signOut")}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-2 backdrop-blur md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button className="tap inline-flex items-center justify-center rounded-md" aria-label={tx({ en: "Menu", ar: "القائمة" })}>
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto bg-sidebar p-3">
            <SheetTitle className="px-3 py-3">
              <BrandMark />
            </SheetTitle>
            <GlobalNav />
            {projectId && (
              <div className="mt-5 border-t border-sidebar-border pt-4">
                <p className="mb-3 truncate px-3 font-display text-lg">{projectTitle}</p>
                <ProjectNav projectId={projectId} />
              </div>
            )}
            <div className="mt-6 border-t border-sidebar-border pt-3">
              <button onClick={signOut} className="tap flex w-full items-center gap-2 rounded-md px-3 text-sm text-muted-foreground">
                <LogOut className="size-4" /> {t("signOut")}
              </button>
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/projects" className="tap inline-flex items-center">
          <BrandMark compact />
        </Link>
        <LangToggle />
      </header>

      <main className="min-w-0 flex-1 pb-safe md:pb-12">{children}</main>

      {/* Android-first bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${projectId ? 5 : 3}, minmax(0, 1fr))` }}
        aria-label={tx({ en: "Main", ar: "الرئيسية" })}
      >
        {projectId ? (
          <>
            <BottomTab to="/projects" icon={BookOpen} label={t("library")} active={false} />
            {WORLDS.map((w) => {
              const first = firstPageOf(w.id);
              return (
                <Link
                  key={w.id}
                  to={projectPath(first.seg)}
                  params={{ id: projectId }}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
                    currentWorld === w.id ? "text-champagne" : "text-muted-foreground",
                  )}
                >
                  {(() => {
                    const Icon = WORLD_ICON[w.id];
                    return <Icon className="size-5" />;
                  })()}
                  <span className="truncate">{tx(w.short)}</span>
                </Link>
              );
            })}
          </>
        ) : (
          <>
            <BottomTab to="/projects" icon={LibraryBig} label={t("library")} active={pathname === "/projects"} />
            <BottomTab to="/projects/new" icon={Plus} label={t("newFilm")} active={pathname === "/projects/new"} />
            <BottomTab to="/account" icon={UserRound} label={t("account")} active={pathname === "/account"} />
          </>
        )}
      </nav>
    </div>
  );
}

function BottomTab({ to, icon: Icon, label, active }: { to: "/projects" | "/projects/new" | "/account"; icon: typeof PenLine; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]", active ? "text-champagne" : "text-muted-foreground")}
    >
      <Icon className="size-5" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** Horizontal chips for the pages of the current world (mobile & desktop). */
export function WorldChips({ projectId }: { projectId: string }) {
  const { tx } = useI18n();
  const { pathname } = useLocation();
  const world = worldForPath(pathname);
  if (!world || world === "library") return null;
  const pages = PAGES.filter((p) => p.world === world && p.scope === "project");
  const w = WORLDS.find((x) => x.id === world);
  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 md:px-8">
        {w && <span className="eyebrow shrink-0 pe-2">{w.n} · {tx(w.label)}</span>}
        {pages.map((p) => {
          const href = `/projects/${projectId}/${p.seg}`;
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={p.id}
              to={projectPath(p.seg)}
              params={{ id: projectId }}
              className={cn(
                "tap inline-flex shrink-0 items-center gap-2 rounded-full border px-4 text-xs",
                active ? "border-champagne/50 bg-champagne-dim text-champagne" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <StatusDot status={p.status} />
              {tx(p.label)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
