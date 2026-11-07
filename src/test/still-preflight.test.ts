import { describe, expect, it } from "vitest";
import { buildStillPreflightReport } from "@/features/stills/generationPreflight";
import type { Frame, Shot } from "@/features/stills/data";

const projectId = "project-1";
const sceneId = "scene-1";
const shot: Shot = {
  id: "shot-1",
  scene_id: sceneId,
  version: 4,
  sort_order: 1,
  shot_number: "001",
  drama_function: "Listen before responding",
  framing: "Medium close-up",
  lens_rationale: "Hold attention on the actor",
  blocking: "At the doorway",
};
const frame: Frame = {
  id: "frame-1",
  project_id: projectId,
  scene_id: sceneId,
  shot_id: shot.id,
  version: 3,
  source_scene_version: 2,
  source_shot_version: 4,
  dramatic_intent: "Withhold the answer",
  composition: "Medium close-up with negative space",
  performance_anchor: "Wait for the other character to finish",
  lighting: "Motivated window daylight",
  palette: "Muted greens and neutral skin tones",
  continuity_locks: "Keys on table, hand position constant",
  director_notes: "Keep the take restrained",
  image_path: "owner/project-1/stills/shot-1/example.webp",
  image_hash: "a".repeat(64),
  rights_note: "Created and owned by the actor",
  reviewed_at: "2026-11-06T00:00:00Z",
};
const sample = (overrides: Partial<Parameters<typeof buildStillPreflightReport>[0]> = {}) =>
  buildStillPreflightReport({
    projectId,
    sceneId,
    sceneVersion: 2,
    shotListApproved: true,
    shotListApprovalAt: "2026-11-05T00:00:00Z",
    shots: [shot],
    frames: [frame],
    ...overrides,
  });

function firstShot(report: ReturnType<typeof buildStillPreflightReport>) {
  const entry = report.shots[0];
  if (!entry) throw new Error("Expected a shot preflight result");
  return entry;
}

describe("MIZENZA Step 16 read-only still preflight", () => {
  it("never authorizes generation even when manual reference checks are satisfied", () => {
    const report = sample();
    expect(report.schema).toBe("mizenza.still_preflight.v1");
    expect(report.production_generation_allowed).toBe(false);
    expect(report.film_stills_gate).toBe("locked");
    expect(report.status).toBe("not_generated");
    expect(report.summary).toEqual({
      shots: 1,
      direction_ready: 1,
      manual_references_reviewed: 1,
      shots_with_blockers: 0,
    });
    expect(firstShot(report).generation).toEqual({
      allowed: false,
      provider: "not_connected",
      result: "not_generated",
    });
    expect(firstShot(report).reference.rights_independently_verified).toBe(false);
    expect(firstShot(report).continuity).toEqual({
      identity_verified: false,
      world_verified: false,
    });
  });

  it("blocks direction readiness when the shot-list approval is missing", () => {
    const report = sample({ shotListApproved: false });
    expect(report.summary.direction_ready).toBe(0);
    expect(firstShot(report).blockers).toContain("shot_list_not_approved");
    expect(firstShot(report).reference.reviewed).toBe(false);
  });

  it("requires a new manual review after shot-list revocation and reapproval", () => {
    const report = sample({ shotListApprovalAt: "2026-11-07T00:00:00Z" });
    expect(report.summary.manual_references_reviewed).toBe(0);
    expect(firstShot(report).reference.reviewed).toBe(false);
    expect(firstShot(report).warnings).toContain("manual_reference_unreviewed");
    expect(firstShot(report).generation.allowed).toBe(false);
  });

  it("does not trust reviewed_at if the active approval has no timestamp", () => {
    const report = sample({ shotListApprovalAt: null });
    expect(firstShot(report).reference.reviewed).toBe(false);
  });

  it("rejects a changed shot or scene source despite an old review", () => {
    const report = sample({ sceneVersion: 5 });
    expect(firstShot(report).blockers).toContain("shot_source_changed");
    expect(firstShot(report).reference.reviewed).toBe(false);
  });

  it("blocks missing direction fields", () => {
    const report = sample({
      frames: [{ ...frame, palette: "  ", dramatic_intent: "" }],
    });
    expect(firstShot(report).missing_direction_fields).toEqual(["dramatic_intent", "palette"]);
    expect(firstShot(report).blockers).toContain("required_direction_missing");
  });

  it("distinguishes optional manual reference absence from direction readiness", () => {
    const report = sample({
      frames: [{ ...frame, image_path: null, image_hash: null, reviewed_at: null }],
    });
    expect(report.summary.direction_ready).toBe(1);
    expect(report.summary.manual_references_reviewed).toBe(0);
    expect(firstShot(report).warnings).toContain("manual_reference_missing");
    expect(firstShot(report).generation.allowed).toBe(false);
  });

  it("does not treat a broken hash or missing rights declaration as a reviewed image", () => {
    const report = sample({
      frames: [{ ...frame, image_hash: "wrong", rights_note: " " }],
    });
    expect(firstShot(report).reference.reviewed).toBe(false);
    expect(firstShot(report).warnings).toContain("reference_hash_invalid");
    expect(firstShot(report).warnings).toContain("reference_rights_unverified");
  });

  it("ignores frames belonging to another project and never infers consent", () => {
    const report = sample({ frames: [{ ...frame, project_id: "other-project" }] });
    expect(firstShot(report).blockers).toContain("storyboard_not_prepared");
    expect(firstShot(report).reference.present).toBe(false);
    expect(firstShot(report).reference.rights_independently_verified).toBe(false);
  });

  it("produces deterministic no-media output for an empty scene", () => {
    const report = sample({ shots: [], frames: [] });
    expect(report.summary.shots).toBe(0);
    expect(report.shots).toEqual([]);
    expect(JSON.stringify(report)).not.toContain("https://");
  });
});
