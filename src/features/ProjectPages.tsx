import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, WorldChips } from "@/components/fz/AppShell";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/fz/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { errorMessage, projectQuery, updateRow, type Row } from "@/lib/records";
import { PAGES } from "@/lib/pages";
import { ProjectEditors } from "./ProjectEditors";
import { WorldPortals } from "@/components/brand/Portals";

export function ProjectLibrary() {
  const { tx, t } = useI18n();
  const qc = useQueryClient();
  const [archived, setArchived] = useState(false);
  const q = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const change = async (p: Row<"projects">) => {
    try {
      await updateRow("projects", p.id, p.version, {
        status: p.status === "archived" ? "active" : "archived",
        archived_at: p.status === "archived" ? null : new Date().toISOString(),
      });
      await qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <AppShell>
      <PageHeader pageId="P00">
        <Button asChild>
          <Link to="/projects/new">{t("newFilm")}</Link>
        </Button>
      </PageHeader>
      <main className="space-y-4 px-4 md:px-8">
        <Button variant="ghost" onClick={() => setArchived(!archived)}>
          {archived ? t("hideArchived") : t("showArchived")}
        </Button>
        {q.isLoading ? (
          <LoadingBlock />
        ) : q.error ? (
          <p role="alert">{errorMessage(q.error)}</p>
        ) : (
          <>
            {q.data
              ?.filter((p) => archived || p.status !== "archived")
              .map((p) => (
                <article key={p.id} className="rounded border border-border bg-surface p-4">
                  <h2 className="break-words font-display text-2xl">{p.title}</h2>
                  <p dir="auto" className="my-3 whitespace-pre-wrap break-words">
                    {p.logline_ar || p.logline_en}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link to="/projects/$id/brief" params={{ id: p.id }}>
                        {t("open")}
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={() => change(p)}>
                      {p.status === "archived" ? t("restore") : t("archive")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const { error } = await supabase.rpc("fz_duplicate_project", {
                            _project_id: p.id,
                          });
                          if (error) throw error;
                          await qc.invalidateQueries({ queryKey: ["projects"] });
                          toast.success(t("saved"));
                        } catch (e) {
                          toast.error(errorMessage(e));
                        }
                      }}
                    >
                      {tx({
                        en: "Copy brief, directions, references, cast & world",
                        ar: "نسخ الموجز والاتجاهات والمراجع والشخصيات والعالم",
                      })}
                    </Button>
                  </div>
                </article>
              ))}
            {q.data?.length === 0 && (
              <EmptyState
                title={tx({ en: "Your first film", ar: "فيلمك الأول" })}
                body={tx({
                  en: "Create a private written development project.",
                  ar: "ابدأ مشروع تطوير مكتوبًا وخاصًا.",
                })}
              />
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
export function NewFilm() {
  const { tx, t, locale } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <AppShell>
      <PageHeader pageId="P01" />
      <form
        className="mx-4 max-w-2xl space-y-4 md:mx-8"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            const { data, error } = await supabase
              .from("projects")
              .insert({
                title: String(f.get("title")).trim(),
                logline_ar: String(f.get("logline_ar")),
                logline_en: String(f.get("logline_en")),
                region: String(f.get("region")),
                duration_target: f.get("duration") as "3min",
              })
              .select()
              .single();
            if (error) throw error;
            await qc.invalidateQueries({ queryKey: ["projects"] });
            await navigate({ to: "/projects/$id/brief", params: { id: data.id } });
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          {tx({ en: "Film title", ar: "اسم الفيلم" })}
          <Input name="title" dir="auto" required maxLength={200} />
        </label>
        <label className="block">
          {tx({ en: "Arabic pitch / logline", ar: "الفكرة بالمصري / ملخص الفيلم" })}
          <Textarea name="logline_ar" dir="rtl" required={locale === "ar"} />
        </label>
        <label className="block">
          {tx({ en: "English pitch / logline", ar: "الفكرة بالإنجليزية" })}
          <Textarea name="logline_en" dir="ltr" required={locale === "en"} />
        </label>
        <label className="block">
          {tx({ en: "Region", ar: "المنطقة" })}
          <Input name="region" dir="auto" required />
        </label>
        <label className="block">
          {tx({ en: "Target duration — development only", ar: "المدة المستهدفة — للتطوير فقط" })}
          <select
            name="duration"
            className="h-11 w-full rounded border border-input bg-surface px-3"
            defaultValue="3min"
          >
            {["30s", "3min", "15min", "60min"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <Button disabled={busy}>{busy ? t("saving") : t("newFilm")}</Button>
      </form>
    </AppShell>
  );
}
export function ProjectPage({
  pageId,
  projectId,
  sceneId,
  shotId,
}: {
  pageId: string;
  projectId: string;
  sceneId?: string;
  shotId?: string;
}) {
  const { tx } = useI18n();
  const q = useQuery(projectQuery(projectId));
  const nested = useQuery({
    queryKey: ["nested-context", projectId, sceneId, shotId],
    enabled: !!(sceneId || shotId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(sceneId ? "scenes" : "shots")
        .select("id")
        .eq("project_id", projectId)
        .eq("id", (sceneId || shotId)!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading || nested.isLoading) return <LoadingBlock />;
  if (q.error || nested.error)
    return (
      <AppShell>
        <p role="alert" className="p-4">
          {errorMessage(q.error || nested.error)}
        </p>
      </AppShell>
    );
  if (!q.data || ((sceneId || shotId) && !nested.data))
    return (
      <AppShell>
        <p role="alert" className="p-4">
          {tx({
            en: "Project or record not found, or access denied.",
            ar: "المشروع أو السجل غير موجود، أو لا تملك صلاحية الوصول.",
          })}
        </p>
      </AppShell>
    );
  return (
    <AppShell projectId={projectId} projectTitle={q.data.title}>
      <WorldChips projectId={projectId} />
      <PageHeader pageId={pageId} />
      <main className="space-y-4 px-4 pb-6 md:px-8">
        <ProjectEditors
          key={`${projectId}:${pageId}:${sceneId ?? shotId ?? ""}`}
          {...{ pageId, projectId, ...(sceneId ? { sceneId } : {}), ...(shotId ? { shotId } : {}) }}
        />
      </main>
    </AppShell>
  );
}
export function ProjectOverview({ projectId }: { projectId: string }) {
  const { tx } = useI18n();
  const q = useQuery(projectQuery(projectId));
  if (q.isLoading) return <LoadingBlock />;
  if (q.error || !q.data)
    return (
      <AppShell>
        <p role="alert" className="p-4">
          {q.error
            ? errorMessage(q.error)
            : tx({
                en: "Project not found, or access denied.",
                ar: "المشروع غير موجود، أو لا تملك صلاحية الوصول.",
              })}
        </p>
      </AppShell>
    );
  return (
    <AppShell projectId={projectId} projectTitle={q.data.title}>
      <header className="px-4 pt-6 pb-4 md:px-8 md:pt-10">
        <p className="eyebrow">{tx({ en: "Control room", ar: "غرفة التحكم" })}</p>
        <h1 className="mt-2 break-words font-display text-3xl text-ivory md:text-5xl">
          {q.data.title}
        </h1>
        <p dir="auto" className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {q.data.logline_ar || q.data.logline_en}
        </p>
      </header>
      <main className="px-4 pb-6 md:px-8">
        <WorldPortals projectId={projectId} />
      </main>
    </AppShell>
  );
}
export function Account() {
  const { user, profile } = useSession();
  const { tx, t, setLocale } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <AppShell>
      <PageHeader pageId="P23" />
      <form
        key={profile?.updated_at}
        className="mx-4 max-w-xl space-y-4 md:mx-8"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!user) return;
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            const locale = f.get("locale") as "ar" | "en";
            const { error } = await supabase.from("profiles").upsert({
              id: user.id,
              display_name: String(f.get("name")),
              mode: f.get("mode") as "filmmaker",
              locale,
            });
            if (error) throw error;
            setLocale(locale);
            await qc.invalidateQueries({ queryKey: ["profile"] });
            toast.success(t("saved"));
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <p dir="ltr">{user?.email}</p>
        <label className="block">
          {tx({ en: "Display name", ar: "الاسم الظاهر" })}
          <Input name="name" defaultValue={profile?.display_name ?? ""} />
        </label>
        <label className="block">
          {tx({ en: "Mode", ar: "الوضع" })}
          <select
            name="mode"
            className="h-11 w-full border border-input bg-surface"
            defaultValue={profile?.mode ?? "filmmaker"}
          >
            {[
              { v: "storyteller", en: "Storyteller", ar: "حكّاء" },
              { v: "filmmaker", en: "Filmmaker", ar: "صانع أفلام" },
              { v: "director", en: "Director", ar: "مخرج" },
            ].map((m) => (
              <option value={m.v} key={m.v}>
                {tx(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {tx({ en: "Language", ar: "اللغة" })}
          <select
            name="locale"
            className="h-11 w-full border border-input bg-surface"
            defaultValue={profile?.locale ?? "ar"}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
        <Button disabled={busy}>{t("save")}</Button>
        <div className="flex gap-4">
          <Link to="/rights">{tx({ en: "Rights", ar: "الحقوق" })}</Link>
          <Link to="/privacy">{tx({ en: "Privacy", ar: "الخصوصية" })}</Link>
        </div>
      </form>
    </AppShell>
  );
}
