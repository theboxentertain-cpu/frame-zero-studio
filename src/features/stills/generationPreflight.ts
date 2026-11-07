import type { Frame, Shot } from "./data";

/**
 * Provider-neutral, read-only preflight for Step 16.
 * This is NOT authorization to run a model or to open the film_stills gate.
 * Backend approvals and a real provider adapter are deliberately not connected.
 */
export const STILL_PREFLIGHT_SCHEMA = "mizenza.still_preflight.v1" as const;

const REQUIRED_DIRECTION_FIELDS = [
  "dramatic_intent",
  "composition",
  "performance_anchor",
  "lighting",
  "palette",
  "continuity_locks",
] as const;

export type StillPreflightBlocker =
  | "shot_list_not_approved"
  | "storyboard_not_prepared"
  | "shot_source_changed"
  | "required_direction_missing";

export type StillPreflightWarning =
  | "manual_reference_missing"
  | "manual_reference_unreviewed"
  | "reference_rights_unverified"
  | "reference_hash_invalid"
  | "identity_continuity_unverified"
  | "world_continuity_unverified";

type ShotPreflight = {
  shot_id: string;
  shot_number: string;
  source_scene_version: number;
  source_shot_version: number;
  direction_ready: boolean;
  missing_direction_fields: string[];
  blockers: StillPreflightBlocker[];
  warnings: StillPreflightWarning[];
  reference: {
    present: boolean;
    reviewed: boolean;
    rights_declared: boolean;
    rights_independently_verified: false;
    hash_declared: boolean;
  };
  continuity: {
    identity_verified: false;
    world_verified: false;
  };
  generation: {
    allowed: false;
    provider: "not_connected";
    result: "not_generated";
  };
};

export type StillPreflightReport = {
  schema: typeof STILL_PREFLIGHT_SCHEMA;
  project_id: string;
  scene_id: string;
  mode: "read_only_preflight";
  film_stills_gate: "locked";
  production_generation_allowed: false;
  provider: "not_connected";
  status: "not_generated";
  summary: {
    shots: number;
    direction_ready: number;
    manual_references_reviewed: number;
    shots_with_blockers: number;
  };
  shots: ShotPreflight[];
};

export function buildStillPreflightReport({
  projectId,
  sceneId,
  sceneVersion,
  shotListApproved,
  shots,
  frames,
}: {
  projectId: string;
  sceneId: string;
  sceneVersion: number;
  shotListApproved: boolean;
  shots: Shot[];
  frames: Frame[];
}): StillPreflightReport {
  const reports: ShotPreflight[] = shots.map((shot) => {
    const frame = frames.find(
      (candidate) =>
        candidate.project_id === projectId &&
        candidate.scene_id === sceneId &&
        candidate.shot_id === shot.id,
    );
    const sourceCurrent =
      !!frame &&
      frame.source_scene_version === sceneVersion &&
      frame.source_shot_version === shot.version;
    const missing = frame
      ? REQUIRED_DIRECTION_FIELDS.filter((field) => !frame[field].trim())
      : [...REQUIRED_DIRECTION_FIELDS];
    const blockers: StillPreflightBlocker[] = [];
    if (!shotListApproved) blockers.push("shot_list_not_approved");
    if (!frame) blockers.push("storyboard_not_prepared");
    if (frame && !sourceCurrent) blockers.push("shot_source_changed");
    if (missing.length > 0) blockers.push("required_direction_missing");

    const hasImage = !!frame?.image_path;
    const hashDeclared = !!frame?.image_hash && /^[0-9a-f]{64}$/.test(frame.image_hash);
    const rightsDeclared = !!frame && frame.rights_note.trim().length >= 8;
    const reviewed =
      hasImage &&
      hashDeclared &&
      rightsDeclared &&
      sourceCurrent &&
      shotListApproved &&
      !!frame?.reviewed_at;
    const warnings: StillPreflightWarning[] = [];
    if (!hasImage) {
      warnings.push("manual_reference_missing");
    } else {
      if (!hashDeclared) warnings.push("reference_hash_invalid");
      if (!rightsDeclared) warnings.push("reference_rights_unverified");
      if (!reviewed) warnings.push("manual_reference_unreviewed");
    }
    // Client-side checks cannot establish identity, likeness consent,
    // wardrobe/location locks, or provider-level continuity.
    warnings.push("identity_continuity_unverified", "world_continuity_unverified");

    return {
      shot_id: shot.id,
      shot_number: shot.shot_number,
      source_scene_version: sceneVersion,
      source_shot_version: shot.version,
      direction_ready: blockers.length === 0,
      missing_direction_fields: missing,
      blockers,
      warnings,
      reference: {
        present: hasImage,
        reviewed,
        rights_declared: rightsDeclared,
        rights_independently_verified: false,
        hash_declared: hashDeclared,
      },
      continuity: { identity_verified: false, world_verified: false },
      generation: { allowed: false, provider: "not_connected", result: "not_generated" },
    };
  });

  return {
    schema: STILL_PREFLIGHT_SCHEMA,
    project_id: projectId,
    scene_id: sceneId,
    mode: "read_only_preflight",
    film_stills_gate: "locked",
    production_generation_allowed: false,
    provider: "not_connected",
    status: "not_generated",
    summary: {
      shots: reports.length,
      direction_ready: reports.filter((r) => r.direction_ready).length,
      manual_references_reviewed: reports.filter((r) => r.reference.reviewed).length,
      shots_with_blockers: reports.filter((r) => r.blockers.length > 0).length,
    },
    shots: reports,
  };
}
