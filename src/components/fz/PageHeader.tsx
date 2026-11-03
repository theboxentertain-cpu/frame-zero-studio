import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { pageById, STATUS_LABEL } from "@/lib/pages";
import { useSession } from "@/lib/session";

export function PageHeader({
  pageId,
  children,
  sub,
}: {
  pageId: string;
  children?: ReactNode;
  sub?: ReactNode;
}) {
  const { tx } = useI18n();
  const p = pageById(pageId);
  return (
    <header className="flex flex-col gap-4 px-4 pt-6 pb-4 md:flex-row md:items-end md:justify-between md:px-8 md:pt-10">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{p.id}</span>
          <Badge variant={p.status}>{tx(STATUS_LABEL[p.status])}</Badge>
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ivory md:text-5xl">
          {tx(p.label)}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{sub ?? tx(p.summary)}</p>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

/** Mode-aware guidance: Storyteller/Filmmaker see it, Director hides it. */
export function Guidance({ children }: { children: ReactNode }) {
  const { mode } = useSession();
  if (mode === "director") return null;
  return (
    <aside className="mx-4 mb-4 rounded-md border-s-2 border-champagne/60 bg-champagne-dim px-4 py-3 text-sm leading-relaxed text-ivory/85 md:mx-8">
      {children}
    </aside>
  );
}

export function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="px-4 py-4 md:px-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="eyebrow">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="frame-corners rounded-md border border-dashed border-border bg-surface/50 px-6 py-10 text-center">
      <p className="font-display text-2xl text-ivory">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingBlock() {
  const { t } = useI18n();
  return (
    <div className="space-y-3 px-4 py-6 md:px-8" aria-busy="true">
      <div className="h-8 w-1/3 animate-pulse rounded bg-surface-raised" />
      <div className="h-24 animate-pulse rounded bg-surface" />
      <div className="h-24 animate-pulse rounded bg-surface" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
