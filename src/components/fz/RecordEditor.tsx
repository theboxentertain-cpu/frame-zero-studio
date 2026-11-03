import { useQuery, useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Archive, ChevronDown, Lock, RotateCcw, Trash2, Unlock, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useI18n, type Bi } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import {
  ConflictError,
  errorMessage,
  missingFields,
  rowsQuery,
  useRowMutation,
  type AnyRow,
  type TableName,
} from "@/lib/records";
import { cn } from "@/lib/utils";
import { EmptyState, LoadingBlock } from "./PageHeader";

export type Option = { value: string; label: Bi };
export type FieldDef = {
  key: string;
  label: Bi;
  type?: "text" | "textarea" | "number" | "select" | "ref" | "boolean";
  options?: Option[];
  ref?: { table: TableName; labelOf: (r: AnyRow) => string; filter?: Record<string, string>; optional?: boolean };
  hint?: Bi;
  required?: boolean;
  wide?: boolean;
  /** Set when creating, then immutable (e.g. the scene or character a plan belongs to). */
  createOnly?: boolean;
};

export type Refs = Partial<Record<TableName, AnyRow[]>>;

type Props = {
  table: TableName;
  projectId: string;
  fields: FieldDef[];
  filter?: Record<string, string>;
  defaults?: Record<string, unknown>;
  orderBy?: string;
  titleOf: (row: AnyRow, refs: Refs) => string;
  createFields?: string[];
  allowCreate?: boolean;
  allowArchive?: boolean;
  lockable?: boolean;
  lockRequires?: string[];
  requiredKeys?: readonly string[];
  extraRefs?: { table: TableName; filter?: Record<string, string> }[];
  stamp?: (row: AnyRow, refs: Refs) => Record<string, unknown>;
  badges?: (row: AnyRow, refs: Refs) => ReactNode;
  rowActions?: (row: AnyRow) => ReactNode;
  newLabel: Bi;
  empty: { title: Bi; body: Bi };
};

export function RecordEditor(props: Props) {
  const { tx, t } = useI18n();
  const { table, projectId, filter = {}, orderBy = "created_at" } = props;
  const [showArchived, setShowArchived] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery(rowsQuery(table, projectId, filter, orderBy));

  const refSpecs = useMemo(() => {
    const specs: { table: TableName; filter?: Record<string, string> }[] = [];
    for (const f of props.fields) if (f.ref) specs.push({ table: f.ref.table, filter: f.ref.filter });
    for (const e of props.extraRefs ?? []) specs.push(e);
    return specs;
  }, [props.fields, props.extraRefs]);
  const refResults = useQueries({ queries: refSpecs.map((s) => rowsQuery(s.table, projectId, s.filter ?? {})) });
  const refs: Refs = {};
  refSpecs.forEach((s, i) => {
    refs[s.table] = [...(refs[s.table] ?? []), ...((refResults[i]?.data as AnyRow[]) ?? [])];
  });

  const mut = useRowMutation(table, projectId);
  const [createDraft, setCreateDraft] = useState<Record<string, string>>({});

  if (isLoading) return <LoadingBlock />;
  if (error) return <p className="px-4 text-sm text-destructive">{errorMessage(error)}</p>;

  const rows = (data ?? []).filter((r) => showArchived || !r.archived_at);
  const archivedCount = (data ?? []).filter((r) => r.archived_at).length;
  const createFields = (props.createFields ?? []).map((k) => props.fields.find((f) => f.key === k)!).filter(Boolean);
  const canCreate = createFields.every((f) => f.ref?.optional || !!createDraft[f.key]);

  const doCreate = async () => {
    try {
      const values: Record<string, unknown> = { ...props.defaults, ...filter };
      for (const f of createFields) if (createDraft[f.key]) values[f.key] = createDraft[f.key];
      const row = await mut.create.mutateAsync(values);
      setOpenId(row.id);
      setCreateDraft({});
    } catch (e) {
      toast.error(tx({ en: "Could not create", ar: "تعذّر الإنشاء" }), { description: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-3">
      {props.allowCreate !== false && (
        <div className="flex flex-wrap items-end gap-2">
          {createFields.map((f) => (
            <label key={f.key} className="min-w-48 flex-1 text-xs text-muted-foreground sm:flex-none">
              {tx(f.label)}
              <RefSelect
                field={f}
                refs={refs}
                value={createDraft[f.key] ?? ""}
                onChange={(v) => setCreateDraft((d) => ({ ...d, [f.key]: v }))}
              />
            </label>
          ))}
          <Button variant="frame" onClick={doCreate} disabled={!canCreate || mut.create.isPending}>
            <Plus /> {tx(props.newLabel)}
          </Button>
          {archivedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowArchived((s) => !s)}>
              {showArchived ? t("hideArchived") : `${t("showArchived")} (${archivedCount})`}
            </Button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title={tx(props.empty.title)} body={tx(props.empty.body)} />
      ) : (
        rows.map((row) => (
          <RecordCard
            key={row.id}
            row={row}
            refs={refs}
            open={openId === row.id}
            onToggle={() => setOpenId((o) => (o === row.id ? null : row.id))}
            mut={mut}
            {...props}
          />
        ))
      )}
    </div>
  );
}

function RefSelect({ field, refs, value, onChange, disabled }: { field: FieldDef; refs: Refs; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const { tx } = useI18n();
  const options = (refs[field.ref!.table] ?? []).filter((r) => !r.archived_at || r.id === value);
  return (
    <select
      className="mt-1 h-11 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground disabled:opacity-60"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{field.ref?.optional ? tx({ en: "— none —", ar: "— بدون —" }) : tx({ en: "Select…", ar: "اختر…" })}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {field.ref!.labelOf(o) || tx({ en: "(untitled)", ar: "(بدون عنوان)" })}
        </option>
      ))}
    </select>
  );
}

function toDraft(row: AnyRow, fields: FieldDef[]) {
  const d: Record<string, unknown> = {};
  for (const f of fields) {
    const v = row[f.key];
    d[f.key] = f.type === "boolean" ? !!v : v === null || v === undefined ? "" : String(v);
  }
  return d;
}

function RecordCard(
  props: Props & {
    row: AnyRow;
    refs: Refs;
    open: boolean;
    onToggle: () => void;
    mut: ReturnType<typeof useRowMutation>;
  },
) {
  const { row, fields, refs, mut } = props;
  const { tx, t } = useI18n();
  const { mode } = useSession();
  const [draft, setDraft] = useState(() => toDraft(row, fields));
  const [conflict, setConflict] = useState(false);
  const base = useMemo(() => toDraft(row, fields), [row, fields]);
  const dirty = fields.some((f) => draft[f.key] !== base[f.key]);

  // Adopt server changes when there is no local edit in progress.
  useEffect(() => {
    if (!dirty) setDraft(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.version]);

  const locked = !!(props.lockable && row.locked);
  const archived = !!row.archived_at;
  const missing = props.requiredKeys ? missingFields({ ...row, ...draftToPatch(draft, fields, true) }, props.requiredKeys) : [];
  const lockMissing = props.lockRequires ? missingFields(row, props.lockRequires) : [];

  const runUpdate = async (patch: Record<string, unknown>, okMsg?: string) => {
    try {
      await mut.update.mutateAsync({ id: row.id, version: row.version as number, patch });
      setConflict(false);
      if (okMsg) toast.success(okMsg);
    } catch (e) {
      if (e instanceof ConflictError) setConflict(true);
      else toast.error(t("errorGeneric"), { description: errorMessage(e) });
    }
  };

  const save = () => {
    const patch = draftToPatch(draft, fields, false, base);
    runUpdate({ ...patch, ...(props.stamp ? props.stamp({ ...row, ...patch }, refs) : {}) }, t("saved"));
  };

  const title = props.titleOf({ ...row, ...draftToPatch(draft, fields, true) }, refs) || tx({ en: "Untitled", ar: "بدون عنوان" });

  return (
    <article className={cn("shadow-frame rounded-md border bg-surface", archived ? "border-dashed opacity-70" : "border-border")}>
      <button
        type="button"
        onClick={props.onToggle}
        className="tap flex w-full items-center gap-3 px-4 py-3 text-start"
        aria-expanded={props.open}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg text-ivory">{title}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {"status" in row && typeof row.status === "string" && (
              <Badge variant={row.status === "review" ? "champagne" : "muted"}>{row.status === "review" ? t("review") : t("draft")}</Badge>
            )}
            {locked && <Badge variant="live"><Lock className="size-3" />{t("locked")}</Badge>}
            {archived && <Badge variant="roadmap">{t("archived")}</Badge>}
            {props.requiredKeys && (missing.length === 0 ? <Badge variant="live">{t("complete")}</Badge> : <Badge variant="partial">{t("missingFields")}: {missing.length}</Badge>)}
            {props.badges?.(row, refs)}
            {dirty && <Badge variant="partial">{t("unsaved")}</Badge>}
            <span className="font-mono text-[10px] text-muted-foreground">{t("version")}{String(row.version)}</span>
          </div>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", props.open && "rotate-180")} />
      </button>

      {props.open && (
        <div className="border-t border-border px-4 pt-4 pb-4">
          {conflict && (
            <div className="mb-4 flex flex-col gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm sm:flex-row sm:items-center">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              <span className="flex-1">{t("conflict")}</span>
              <Button size="sm" variant="outline" onClick={() => { setDraft(base); setConflict(false); }}>
                {t("loadLatest")}
              </Button>
            </div>
          )}
          {locked && (
            <p className="mb-3 text-xs text-muted-foreground">
              {tx({ en: "Locked in writing. Unlock to edit. Locking records a decision — it does not generate or freeze any image.", ar: "مقفل كتابيًا. ألغِ القفل للتعديل. القفل يسجل قرارًا — لا يولّد أو يثبّت أي صورة." })}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((f) => {
              const disabled = locked || archived || (f.createOnly && !!row[f.key]);
              const isMissing = props.requiredKeys?.includes(f.key) && missing.includes(f.key);
              return (
                <label key={f.key} className={cn("block text-sm", (f.wide || f.type === "textarea") && "md:col-span-2")}>
                  <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    {tx(f.label)}
                    {(f.required || props.requiredKeys?.includes(f.key)) && (
                      <span className={cn("text-[10px]", isMissing ? "text-warning" : "text-champagne/70")}>• {t("required")}</span>
                    )}
                  </span>
                  {f.hint && mode !== "director" && <span className="mt-0.5 block text-[11px] text-muted-foreground/80">{tx(f.hint)}</span>}
                  <div className="mt-1.5">
                    <FieldInput f={f} refs={refs} value={draft[f.key]} disabled={!!disabled} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={!dirty || locked || archived || mut.update.isPending}>
              {mut.update.isPending ? t("saving") : t("save")}
            </Button>
            {dirty && (
              <Button variant="ghost" onClick={() => setDraft(base)}>
                {t("cancel")}
              </Button>
            )}
            {props.lockable && !archived && (
              locked ? (
                <Button variant="outline" onClick={() => runUpdate({ locked: false, locked_at: null })}>
                  <Unlock /> {t("unlock")}
                </Button>
              ) : (
                <Button
                  variant="frame"
                  disabled={dirty || lockMissing.length > 0}
                  title={lockMissing.length ? t("missingFields") : undefined}
                  onClick={() => runUpdate({ locked: true, locked_at: new Date().toISOString() }, t("locked"))}
                >
                  <Lock /> {t("lock")}
                </Button>
              )
            )}
            {props.rowActions?.(row)}
            <div className="ms-auto flex gap-2">
              {props.allowArchive !== false &&
                (archived ? (
                  <>
                    <Button variant="ghost" onClick={() => runUpdate({ archived_at: null })}>
                      <RotateCcw /> {t("restore")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        if (!window.confirm(t("confirmDelete"))) return;
                        try {
                          await mut.remove.mutateAsync(row.id);
                        } catch (e) {
                          toast.error(errorMessage(e));
                        }
                      }}
                    >
                      <Trash2 /> {t("deleteForever")}
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" disabled={dirty} onClick={() => runUpdate({ archived_at: new Date().toISOString() })}>
                    <Archive /> {t("archive")}
                  </Button>
                ))}
            </div>
          </div>
          {props.lockable && !locked && lockMissing.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {tx({ en: "To lock, complete:", ar: "للقفل، أكمل:" })} {lockMissing.map((k) => tx(fields.find((f) => f.key === k)?.label ?? { en: k, ar: k })).join("، ")}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function draftToPatch(draft: Record<string, unknown>, fields: FieldDef[], all: boolean, base?: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const f of fields) {
    if (!all && base && draft[f.key] === base[f.key]) continue;
    const v = draft[f.key];
    if (f.type === "boolean") patch[f.key] = !!v;
    else if (f.type === "number") patch[f.key] = v === "" ? null : Number(v);
    else if (f.type === "ref") patch[f.key] = v === "" ? null : v;
    else patch[f.key] = v ?? "";
  }
  return patch;
}

function FieldInput({ f, refs, value, disabled, onChange }: { f: FieldDef; refs: Refs; value: unknown; disabled: boolean; onChange: (v: unknown) => void }) {
  const { tx } = useI18n();
  switch (f.type) {
    case "textarea":
      return <Textarea value={String(value ?? "")} disabled={disabled} onChange={(e) => onChange(e.target.value)} rows={3} />;
    case "number":
      return <Input type="number" inputMode="decimal" step="any" value={String(value ?? "")} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    case "boolean":
      return <Switch checked={!!value} disabled={disabled} onCheckedChange={(c) => onChange(c)} />;
    case "select":
      return (
        <select
          className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground disabled:opacity-60"
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {f.options!.map((o) => (
            <option key={o.value} value={o.value}>
              {tx(o.label)}
            </option>
          ))}
        </select>
      );
    case "ref":
      return <RefSelect field={f} refs={refs} value={String(value ?? "")} disabled={disabled} onChange={onChange} />;
    default:
      return <Input value={String(value ?? "")} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
}

export const STATUS_OPTIONS: Option[] = [
  { value: "draft", label: { en: "Draft", ar: "مسودة" } },
  { value: "review", label: { en: "In review", ar: "قيد المراجعة" } },
];
