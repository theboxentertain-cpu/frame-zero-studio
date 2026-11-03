import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CircleDashed, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n, type Bi } from "@/lib/i18n";
import { errorMessage, gatesQuery, type GateRow } from "@/lib/records";

export const GATE_LABEL: Record<GateRow["gate"], Bi> = {
  treatment: { en: "Treatment", ar: "المعالجة" },
  world: { en: "World", ar: "العالم" },
  shot_list: { en: "Shot list", ar: "قائمة اللقطات" },
  film_stills: { en: "Film stills", ar: "الصور الثابتة" },
  motion: { en: "Motion", ar: "الحركة" },
  final_cut: { en: "Final cut", ar: "النسخة النهائية" },
};

export const MISSING_LABEL: Record<string, Bi> = {
  brief_approved_decisions: { en: "Write approved decisions in the Creative Brief", ar: "اكتب القرارات المعتمدة في الموجز الإبداعي" },
  brief_revision_saved: { en: "Save at least one brief revision", ar: "احفظ نسخة واحدة على الأقل من الموجز" },
  film_treatment_in_review: { en: "A film-level treatment with summary, set to “In review”", ar: "معالجة على مستوى الفيلم بملخص وحالة «قيد المراجعة»" },
  locked_location: { en: "Lock at least one world bible", ar: "اقفل مرجع عالم واحدًا على الأقل" },
  locked_character: { en: "Lock at least one cast profile", ar: "اقفل ملف شخصية واحدًا على الأقل" },
  character_rights_unresolved: { en: "Resolve likeness permission on locked characters", ar: "احسم إذن الملامح للشخصيات المقفلة" },
  treatment_approved: { en: "Approve the treatment gate first", ar: "اعتمد بوابة المعالجة أولًا" },
  at_least_one_shot: { en: "Plan at least one shot", ar: "خطط لقطة واحدة على الأقل" },
  all_shot_fields_complete: { en: "Complete every required field on every shot", ar: "أكمل كل الحقول الإلزامية في كل لقطة" },
  generation_not_connected: {
    en: "Requires image/motion generation — not connected (roadmap step 15+)",
    ar: "يتطلب توليد الصور/الحركة — غير متصل (المرحلة 15+)",
  },
};

export function GatePanel({ projectId, only }: { projectId: string; only?: GateRow["gate"][] }) {
  const { tx } = useI18n();
  const { data, isLoading, error } = useQuery(gatesQuery(projectId));
  if (isLoading) return <div className="h-20 animate-pulse rounded-md bg-surface" />;
  if (error) return <p className="text-sm text-destructive">{errorMessage(error)}</p>;
  const rows = (data ?? []).filter((g) => !only || only.includes(g.gate));
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((g) => (
        <GateCard key={g.gate} g={g} projectId={projectId} label={tx(GATE_LABEL[g.gate])} />
      ))}
    </div>
  );
}

function GateCard({ g, projectId, label }: { g: GateRow; projectId: string; label: string }) {
  const { tx } = useI18n();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const operational = !g.missing.includes("generation_not_connected");
  const approve = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fz_approve_gate", { _project_id: projectId, _gate: g.gate, _note: note });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tx({ en: "Written approval recorded", ar: "تم تسجيل الاعتماد المكتوب" }));
      qc.invalidateQueries({ queryKey: ["gates", projectId] });
      qc.invalidateQueries({ queryKey: ["history", projectId] });
      setNote("");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fz_revoke_gate", { _project_id: projectId, _gate: g.gate });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gates", projectId] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const state = !operational ? "locked" : g.approved ? (g.stale ? "stale" : "approved") : g.ready ? "ready" : "blocked";

  return (
    <div className="shadow-frame rounded-md border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-xl">{label}</span>
        {state === "approved" && <Badge variant="live"><CheckCircle2 className="size-3" />{tx({ en: "Approved (written)", ar: "معتمد (مكتوب)" })}</Badge>}
        {state === "stale" && <Badge variant="partial"><AlertTriangle className="size-3" />{tx({ en: "Changed since approval", ar: "تغيّر بعد الاعتماد" })}</Badge>}
        {state === "ready" && <Badge variant="champagne">{tx({ en: "READY", ar: "جاهز" })}</Badge>}
        {state === "blocked" && <Badge variant="muted"><CircleDashed className="size-3" />{tx({ en: "Not ready", ar: "غير جاهز" })}</Badge>}
        {state === "locked" && <Badge variant="roadmap"><Lock className="size-3" />{tx({ en: "Roadmap", ar: "خارطة الطريق" })}</Badge>}
      </div>
      {g.missing.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {g.missing.map((m) => (
            <li key={m}>— {tx(MISSING_LABEL[m] ?? { en: m, ar: m })}</li>
          ))}
        </ul>
      )}
      {g.approved && g.approved_at && (
        <p className="mt-2 text-xs text-muted-foreground">{new Date(g.approved_at).toLocaleString()}</p>
      )}
      {operational && (
        <div className="mt-3 flex flex-col gap-2">
          {g.ready && (
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={tx({ en: "Approval note (optional)", ar: "ملاحظة الاعتماد (اختياري)" })}
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="frame" disabled={!g.ready || approve.isPending} onClick={() => approve.mutate()}>
              {g.approved ? tx({ en: "Re-approve", ar: "إعادة الاعتماد" }) : tx({ en: "Approve in writing", ar: "اعتماد كتابي" })}
            </Button>
            {g.approved && (
              <Button size="sm" variant="ghost" disabled={revoke.isPending} onClick={() => revoke.mutate()}>
                {tx({ en: "Revoke", ar: "سحب" })}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
