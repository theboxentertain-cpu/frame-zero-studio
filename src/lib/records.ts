import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T]["Row"];
export type AnyRow = Record<string, unknown> & { id: string; version?: number };

// Generic access for the shared record editor. Row-level security on the
// server is the real boundary; this only loosens compile-time table typing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export class ConflictError extends Error {
  constructor() {
    super("version_conflict");
    this.name = "ConflictError";
  }
}

export function rowsQuery(
  table: TableName,
  projectId: string,
  filter: Record<string, string> = {},
  orderBy = "created_at",
) {
  return queryOptions({
    queryKey: [table, projectId, filter, orderBy],
    queryFn: async (): Promise<AnyRow[]> => {
      let q = db.from(table).select("*").eq("project_id", projectId);
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
      const { data, error } = await q.order(orderBy, { ascending: true });
      if (error) throw error;
      return data as AnyRow[];
    },
  });
}

export async function insertRow(table: TableName, values: Record<string, unknown>) {
  const { data, error } = await db.from(table).insert(values).select().single();
  if (error) throw error;
  return data as AnyRow;
}

/** Optimistic-lock update: succeeds only if the stored version still matches. */
export async function updateRow(
  table: TableName,
  id: string,
  version: number,
  patch: Record<string, unknown>,
) {
  const { data, error } = await db
    .from(table)
    .update(patch)
    .eq("id", id)
    .eq("version", version)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ConflictError();
  return data as AnyRow;
}

export async function deleteRow(table: TableName, id: string) {
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) throw error;
}

export function useInvalidateTable() {
  const qc = useQueryClient();
  return (table: TableName, projectId?: string) =>
    qc.invalidateQueries({ queryKey: projectId ? [table, projectId] : [table] });
}

export function useRowMutation(table: TableName, projectId: string) {
  const invalidate = useInvalidateTable();
  const qc = useQueryClient();
  const onDone = () => {
    invalidate(table, projectId);
    qc.invalidateQueries({ queryKey: ["gates", projectId] });
    qc.invalidateQueries({ queryKey: ["history", projectId] });
  };
  return {
    refresh: () => invalidate(table, projectId),
    create: useMutation({
      mutationFn: (v: Record<string, unknown>) => insertRow(table, { project_id: projectId, ...v }),
      onSuccess: onDone,
    }),
    update: useMutation({
      mutationFn: (a: { id: string; version: number; patch: Record<string, unknown> }) =>
        updateRow(table, a.id, a.version, a.patch),
      onSuccess: onDone,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteRow(table, id), onSuccess: onDone }),
  };
}

export function errorMessage(e: unknown): string {
  if (e instanceof ConflictError) return "version_conflict";
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: unknown }).message);
  return String(e);
}

// ---------- project-level queries ----------
export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const briefQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["briefs", projectId, "single"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefs")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export type GateRow = Database["public"]["Functions"]["fz_gate_status"]["Returns"][number];
export const gatesQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["gates", projectId],
    queryFn: async (): Promise<GateRow[]> => {
      const { data, error } = await supabase.rpc("fz_gate_status", { _project_id: projectId });
      if (error) throw error;
      return data ?? [];
    },
  });

/** Shot fields that must be written before a shot list can be approved (mirrors fz_gate_status). */
export const SHOT_REQUIRED = [
  "drama_function",
  "subject",
  "framing",
  "lens_rationale",
  "movement_trigger",
  "movement_end",
  "blocking",
  "duration_sec",
  "editing_reason",
  "continuity_constraints",
] as const;

export function missingFields(row: Record<string, unknown>, keys: readonly string[]): string[] {
  return keys.filter((k) => {
    const v = row[k];
    if (v === null || v === undefined) return true;
    if (typeof v === "number") return !Number.isFinite(v) || !(v > 0);
    if (typeof v === "string") {
      if (k === "duration_sec") return !Number.isFinite(Number(v)) || !(Number(v) > 0);
      return v.trim() === "";
    }
    return false;
  });
}
