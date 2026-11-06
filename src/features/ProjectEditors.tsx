import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { RecordEditor } from "@/components/fz/RecordEditor";
import { GatePanel } from "@/components/fz/GatePanel";
import { LoadingBlock } from "@/components/fz/PageHeader";
import { RoadmapPanel } from "@/components/fz/RoadmapPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  briefQuery,
  errorMessage,
  rowsQuery,
  SHOT_REQUIRED,
  type AnyRow,
  type TableName,
} from "@/lib/records";
import { fields } from "./editor-definitions";
import { StillStudio } from "./stills/StillStudio";

type EditorTable = keyof typeof fields;
export function ProjectEditors({
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
  const { tx, t } = useI18n();
  const qc = useQueryClient();
  const brief = useQuery(briefQuery(projectId));
  const revision = brief.data?.current_revision ?? 0;
  const editor = (
    table: EditorTable,
    extra: Partial<React.ComponentProps<typeof RecordEditor>> = {},
  ) => (
    <RecordEditor
      key={table}
      table={table}
      projectId={projectId}
      fields={fields[table]}
      titleOf={(r, refs) =>
        String(
          r["title"] ||
            r["name"] ||
            r["source_title"] ||
            r["shot_number"] ||
            r["line_text"] ||
            r["direction"] ||
            r["description"] ||
            r["note"] ||
            refs.characters?.find((c) => c.id === r["character_id"])?.["name"] ||
            tx({ en: "Written record", ar: "سجل مكتوب" }),
        )
      }
      newLabel={{ en: "Add written record", ar: "إضافة سجل مكتوب" }}
      empty={{
        title: { en: "No records yet", ar: "لا سجلات بعد" },
        body: {
          en: "Write your own material. No AI output is generated.",
          ar: "اكتب محتواك بنفسك. لا يتم توليد نتائج بالذكاء الاصطناعي.",
        },
      }}
      {...extra}
    />
  );
  const sceneStamp = (r: AnyRow, refs: Partial<Record<TableName, AnyRow[]>>) => ({
    source_scene_version: refs.scenes?.find((s) => s.id === r["scene_id"])?.version ?? 0,
  });
  const drift = (r: AnyRow, refs: Partial<Record<TableName, AnyRow[]>>) =>
    Number(r["source_scene_version"]) !==
    Number(refs.scenes?.find((s) => s.id === r["scene_id"])?.version ?? 0) ? (
      <Badge variant="partial">{t("drift")}</Badge>
    ) : null;
  switch (pageId) {
    case "P02":
      return (
        <>
          {editor("briefs", { allowCreate: false, allowArchive: false })}
          <Button
            className="mt-4"
            disabled={!brief.data}
            onClick={async () => {
              try {
                const { error } = await supabase.rpc("fz_save_brief_revision", {
                  _project_id: projectId,
                });
                if (error) throw error;
                await qc.invalidateQueries();
                toast.success(t("saved"));
              } catch (e) {
                toast.error(errorMessage(e));
              }
            }}
          >
            {tx({ en: "Snapshot saved brief as a revision", ar: "حفظ نسخة من الموجز المحفوظ" })}
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx({
              en: "Save edits first. A revision snapshots the stored brief.",
              ar: "احفظ التعديلات أولًا. النسخة تسجّل الموجز المحفوظ.",
            })}
          </p>
        </>
      );
    case "P03":
      return (
        <div className="space-y-6">
          {editor("interpretations", {
            allowCreate: false,
            allowArchive: false,
            fields: fields.interpretations.filter((f) => f.key !== "direction"),
            titleOf: (r) =>
              tx(
                (
                  {
                    observational: { en: "Observational", ar: "رصدية" },
                    spatial_pressure: { en: "Spatial Pressure", ar: "ضغط المكان" },
                    selective_perspective: { en: "Selective Perspective", ar: "منظور انتقائي" },
                  } as const
                )[r["direction"] as "observational"] ?? {
                  en: String(r["direction"]),
                  ar: String(r["direction"]),
                },
              ),
          })}
          <h2>
            {tx({ en: "Creative Reference Engine — manual", ar: "محرك المراجع الإبداعية — يدوي" })}
          </h2>
          {editor("creative_references")}
        </div>
      );
    case "P04":
      return (
        <>
          {editor("treatments", {
            extraRefs: [{ table: "briefs" }],
            stamp: () => ({ source_brief_revision: revision }),
            badges: (r) =>
              Number(r["source_brief_revision"]) !== revision ? (
                <Badge variant="partial">{t("drift")}</Badge>
              ) : null,
          })}
          <div className="mt-5">
            <GatePanel projectId={projectId} only={["treatment"]} />
          </div>
        </>
      );
    case "P05":
    case "P10":
      return editor("scenes", {
        orderBy: "scene_number",
        rowActions: (r) => (
          <div className="flex flex-wrap gap-2">
            {["plan", "stills", "production"].map((seg) => (
              <Button key={seg} asChild variant="outline">
                <Link
                  to={`/projects/$id/scenes/$sid/${seg}` as "/projects/$id/scenes/$sid/plan"}
                  params={{ id: projectId, sid: r.id }}
                >
                  {tx(
                    seg === "plan"
                      ? { en: "Shot Lab", ar: "معمل اللقطات" }
                      : seg === "stills"
                        ? { en: "Storyboard", ar: "اللوحة المصورة" }
                        : { en: "Production", ar: "التصوير" },
                  )}
                </Link>
              </Button>
            ))}
          </div>
        ),
      });
    case "P06":
      return editor("characters", {
        lockable: true,
        lockRequires: ["name", "identity", "appearance", "regional_background", "rights_notes"],
      });
    case "P07":
      return editor("performance_plans", {
        createFields: ["scene_id", "character_id"],
        lockable: true,
        lockRequires: [
          "objective",
          "obstacle",
          "playable_tactic",
          "partner_cue",
          "listening_reaction",
          "physical_action",
          "beats",
        ],
        stamp: sceneStamp,
        badges: drift,
      });
    case "P08":
      return (
        <>
          {editor("locations", {
            lockable: true,
            lockRequires: [
              "name",
              "governorate",
              "district",
              "place",
              "period_year",
              "evidence_notes",
            ],
          })}
          <div className="mt-5">
            <GatePanel projectId={projectId} only={["world"]} />
          </div>
        </>
      );
    case "P09":
      return (
        <div className="space-y-6">
          {editor("voice_profiles", { createFields: ["character_id"] })}
          {editor("dialogue_lines", { createFields: ["scene_id"], orderBy: "sort_order" })}
        </div>
      );
    case "P11":
      return editor("shots", {
        filter: { scene_id: sceneId! },
        orderBy: "sort_order",
        requiredKeys: SHOT_REQUIRED,
        extraRefs: [{ table: "scenes" }],
        stamp: sceneStamp,
        badges: drift,
        rowActions: (r) => (
          <Button asChild variant="outline">
            <Link to="/projects/$id/shots/$shotid/retake" params={{ id: projectId, shotid: r.id }}>
              {tx({ en: "Retake notes", ar: "ملاحظات الإعادة" })}
            </Link>
          </Button>
        ),
      });
    case "P12":
      return <StillStudio projectId={projectId} sceneId={sceneId!} />;
    case "P14":
      return editor("shots", {
        filter: { id: shotId! },
        allowCreate: false,
        allowArchive: false,
        fields: fields.shots.filter((f) => f.key === "retake_notes"),
      });
    case "P15":
      return editor("continuity_notes");
    case "P19":
      return <GatePanel projectId={projectId} />;
    case "P20":
      return <WrittenExport projectId={projectId} />;
    case "P21":
      return <History projectId={projectId} />;
    case "P22":
      return editor("budget_lines");
    default:
      return (
        <RoadmapPanel
          requires={{
            en: "AI media generation and finishing remain unavailable. Step 15 supports manual storyboards only.",
            ar: "توليد الصور والفيديو والمونتاج غير متاح بعد. تدعم المرحلة 15 المراجع المصورة اليدوية فقط.",
          }}
          plan={[]}
        />
      );
  }
}
function History({ projectId }: { projectId: string }) {
  const { tx } = useI18n();
  const q = useQuery({
    queryKey: ["history", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("history")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <p role="alert">{errorMessage(q.error)}</p>;
  return (
    <div className="space-y-3">
      <p>
        {tx({
          en: "Latest 100 saved events. Snapshots are read-only.",
          ar: "أحدث 100 تغيير محفوظ. النسخ للقراءة فقط.",
        })}
      </p>
      {q.data?.map((r) => (
        <details key={r.id} className="rounded border border-border p-3">
          <summary>
            {r.table_name} · {r.action} · {r.created_at}
          </summary>
          <pre dir="auto" className="overflow-auto whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(r.snapshot, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}
async function qcRows(table: Exclude<TableName, "profiles" | "projects">, projectId: string) {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}
function WrittenExport({ projectId }: { projectId: string }) {
  const { tx } = useI18n();
  const tables: Exclude<TableName, "profiles" | "projects">[] = [
    "briefs",
    "brief_revisions",
    "interpretations",
    "creative_references",
    "treatments",
    "characters",
    "locations",
    "voice_profiles",
    "dialogue_lines",
    "performance_plans",
    "scenes",
    "shots",
    "continuity_notes",
    "budget_lines",
  ];
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const data = Object.fromEntries(
            await Promise.all(tables.map(async (table) => [table, await qcRows(table, projectId)])),
          );
          const url = URL.createObjectURL(
            new Blob(
              [
                JSON.stringify(
                  { project_id: projectId, material: "written development only", ...data },
                  null,
                  2,
                ),
              ],
              { type: "application/json" },
            ),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = `frame-zero-${projectId}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
          toast.error(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {tx({
        en: "Download written development package (JSON)",
        ar: "تنزيل حزمة التطوير المكتوبة (JSON)",
      })}
    </Button>
  );
}
import * as React from "react";
