import { supabase } from "@/integrations/supabase/client";

export type Shot = {
  id: string;
  scene_id: string;
  version: number;
  sort_order: number;
  shot_number: string;
  drama_function: string;
  framing: string;
  lens_rationale: string;
  blocking: string;
};
export type Frame = {
  id: string;
  project_id: string;
  scene_id: string;
  shot_id: string;
  version: number;
  source_shot_version: number;
  source_scene_version: number;
  dramatic_intent: string;
  composition: string;
  performance_anchor: string;
  lighting: string;
  palette: string;
  continuity_locks: string;
  director_notes: string;
  image_path: string | null;
  image_hash: string | null;
  rights_note: string;
  reviewed_at: string | null;
};
export type DirectionField = keyof Pick<
  Frame,
  | "dramatic_intent"
  | "composition"
  | "performance_anchor"
  | "lighting"
  | "palette"
  | "continuity_locks"
  | "director_notes"
>;
export const FIELDS: { name: DirectionField; en: string; ar: string }[] = [
  { name: "dramatic_intent", en: "Dramatic intention", ar: "الغاية الدرامية" },
  { name: "composition", en: "Composition & camera", ar: "التكوين والكاميرا" },
  { name: "performance_anchor", en: "Playable behavior", ar: "السلوك القابل للتمثيل" },
  { name: "lighting", en: "Motivated lighting", ar: "الإضاءة المبررة" },
  { name: "palette", en: "Color treatment", ar: "المعالجة اللونية" },
  { name: "continuity_locks", en: "Continuity requirements", ar: "شروط الاستمرارية" },
  { name: "director_notes", en: "Director notes", ar: "ملاحظات المخرج" },
];
type Err = { message: string };
type Result<T> = { data: T | null; error: Err | null };
// Added storyboard table/RPCs are in migration 0003-0005, not in generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = supabase as any;

function unwrap<T>(r: Result<T>): T {
  if (r.error) throw new Error(r.error.message);
  if (r.data === null) throw new Error("Empty database response");
  return r.data;
}

export async function fetchStoryboard(projectId: string, sceneId: string) {
  const [shotResult, sceneResult, frameResult] = await Promise.all([
    supabase
      .from("shots")
      .select(
        "id,scene_id,version,sort_order,shot_number,drama_function,framing,lens_rationale,blocking",
      )
      .eq("project_id", projectId)
      .eq("scene_id", sceneId)
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("scenes")
      .select("id,version")
      .eq("project_id", projectId)
      .eq("id", sceneId)
      .single(),
    api.from("storyboard_frames").select("*").eq("project_id", projectId).eq("scene_id", sceneId),
  ]);
  if (shotResult.error) throw shotResult.error;
  if (sceneResult.error) throw sceneResult.error;
  if (frameResult.error) throw frameResult.error;
  return {
    shots: (shotResult.data ?? []) as Shot[],
    sceneVersion: sceneResult.data!.version as number,
    frames: (frameResult.data ?? []) as Frame[],
  };
}
export function current(frame: Frame, shot: Shot, sceneVersion: number) {
  return frame.source_scene_version === sceneVersion && frame.source_shot_version === shot.version;
}
export async function prepareShot(shotId: string) {
  return unwrap<string>(await api.rpc("fz_prepare_storyboard", { _shot_id: shotId }));
}
export async function saveDirection(frame: Frame, patch: Partial<Pick<Frame, DirectionField>>) {
  return unwrap<number>(
    await api.rpc("fz_save_storyboard", {
      _frame_id: frame.id,
      _version: frame.version,
      _notes: patch,
    }),
  );
}
export async function reviewFrame(frame: Frame) {
  return unwrap<string>(
    await api.rpc("fz_review_storyboard", {
      _frame_id: frame.id,
      _version: frame.version,
    }),
  );
}
export async function privateSignedImage(path: string) {
  const { data, error } = await supabase.storage.from("project-files").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

/** Validate actual pixels; re-encode to WebP to remove EXIF and unstable file metadata. */
export async function sanitizeImage(file: File): Promise<{ data: Blob; sha256: string }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Use a JPEG, PNG or WebP image.");
  if (file.size < 128 || file.size > 10 * 1024 * 1024)
    throw new Error("Image must be between 128 bytes and 10 MB.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!(
    (file.type === "image/jpeg" && jpeg) ||
    (file.type === "image/png" && png) ||
    (file.type === "image/webp" && webp)
  ))
    throw new Error("Image data does not match its declared format.");
  const bitmap = await createImageBitmap(file);
  try {
    if (
      bitmap.width < 320 ||
      bitmap.height < 240 ||
      bitmap.width > 6000 ||
      bitmap.height > 6000 ||
      bitmap.width * bitmap.height > 20_000_000
    )
      throw new Error("Unsupported image dimensions.");
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processing unavailable.");
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image conversion failed"))),
        "image/webp",
        0.88,
      ),
    );
    if (blob.size > 8 * 1024 * 1024) throw new Error("Converted image is too large.");
    const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    const sha256 = Array.from(new Uint8Array(hash))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
    return { data: blob, sha256 };
  } finally {
    bitmap.close();
  }
}
export async function importReference(frame: Frame, file: File, rightsNote: string) {
  if (rightsNote.trim().length < 8) throw new Error("Describe the reference image rights.");
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error("Sign in required.");
  const sanitized = await sanitizeImage(file);
  const path =
    auth.data.user.id +
    "/" +
    frame.project_id +
    "/stills/" +
    frame.shot_id +
    "/" +
    crypto.randomUUID() +
    ".webp";
  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(path, sanitized.data, { contentType: "image/webp", upsert: false });
  if (uploadError) throw uploadError;
  try {
    return unwrap<number>(
      await api.rpc("fz_attach_storyboard", {
        _frame_id: frame.id,
        _version: frame.version,
        _path: path,
        _hash: sanitized.sha256,
        _rights_note: rightsNote.trim(),
      }),
    );
  } catch (err) {
    // Remove only the object just created; never touch an older approved asset.
    await supabase.storage.from("project-files").remove([path]);
    throw err;
  }
}
export function downloadStoryboardManifest(
  projectId: string,
  sceneId: string,
  frames: Frame[],
  shots: Shot[],
) {
  const material = shots.map((shot) => {
    const frame = frames.find((f) => f.shot_id === shot.id);
    return {
      shot_id: shot.id,
      shot_version: shot.version,
      framing: shot.framing,
      dramatic_function: shot.drama_function,
      direction: frame ? Object.fromEntries(FIELDS.map((k) => [k.name, frame[k.name]])) : null,
      reference_available: !!frame?.image_path,
      render_status: "not_generated",
      provider: "not_connected",
      generated_image_url: null,
    };
  });
  const blob = new Blob(
    [
      JSON.stringify(
        {
          kind: "frame_zero_storyboard_handoff",
          project_id: projectId,
          scene_id: sceneId,
          media_status: "manual_references_only",
          shots: material,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "frame-zero-storyboard-" + sceneId + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
