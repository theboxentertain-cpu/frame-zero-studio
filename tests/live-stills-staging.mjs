import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Dedicated MIZENZA staging only. Never use admin/service-role credentials.
// This test creates one disposable film and one 1x1 test image, then cleans up.
const URL = "https://crvgvcokzryoxyvjkhxn.supabase.co";
const vars = [
  "FZ_TEST_PUBLIC_KEY",
  "FZ_TEST_A_EMAIL",
  "FZ_TEST_A_PASSWORD",
  "FZ_TEST_B_EMAIL",
  "FZ_TEST_B_PASSWORD",
];
if (
  process.env.FZ_STAGING_VERIFIED !== "yes" ||
  process.env.FZ_TEST_URL !== URL ||
  vars.some((name) => !process.env[name])
) {
  throw new Error("Missing verified staging identity or two-user test credentials.");
}
const key = process.env.FZ_TEST_PUBLIC_KEY;
if (key.startsWith("sb_secret_")) {
  throw new Error("Never use a Supabase admin/secret key for RLS testing.");
}

const client = () =>
  createClient(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const a = client();
const b = client();
const anonymous = client();
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9BOxIAAAAASUVORK5CYII=",
  "base64",
);
const sha256 = createHash("sha256").update(png).digest("hex");

let projectId = null;
let imagePath = null;
async function signIn(clientInstance, who) {
  const { data, error } = await clientInstance.auth.signInWithPassword({
    email: process.env["FZ_TEST_" + who + "_EMAIL"],
    password: process.env["FZ_TEST_" + who + "_PASSWORD"],
  });
  assert.ifError(error);
  return data.user.id;
}
function ok(result, operation) {
  if (result.error) {
    throw new Error(operation + " failed: " + result.error.code);
  }
  return result.data;
}
async function blocked(operation, name) {
  const result = await operation();
  assert.ok(result.error, "Expected server-side denial: " + name);
}

try {
  const userA = await signIn(a, "A");
  const userB = await signIn(b, "B");
  assert.notEqual(userA, userB);

  const project = ok(
    await a
      .from("projects")
      .insert({
        title: "MIZENZA stills staging test " + randomUUID(),
        logline_ar: "مصر — اختبار مشهد قصير",
        region: "Cairo",
      })
      .select("id")
      .single(),
    "Create film",
  );
  projectId = project.id;

  const seededBrief = ok(
    await a.from("briefs").select("id,version").eq("project_id", projectId).single(),
    "Read seeded brief",
  );
  ok(
    await a
      .from("briefs")
      .update({ approved_decisions: "Naturalistic drama" })
      .eq("id", seededBrief.id)
      .eq("version", seededBrief.version),
    "Update brief",
  );
  ok(await a.rpc("fz_save_brief_revision", { _project_id: projectId }), "Save brief revision");
  ok(
    await a.from("treatments").insert({
      project_id: projectId,
      title: "Staging treatment",
      summary: "The character notices a change in the room.",
      status: "review",
      level: "film",
      source_brief_revision: 1,
    }),
    "Create treatment",
  );
  ok(
    await a.rpc("fz_approve_gate", {
      _project_id: projectId,
      _gate: "treatment",
    }),
    "Approve treatment",
  );

  const scene = ok(
    await a
      .from("scenes")
      .insert({ project_id: projectId, title: "المشهد الأول" })
      .select("id,version")
      .single(),
    "Create scene",
  );
  const shot = ok(
    await a
      .from("shots")
      .insert({
        project_id: projectId,
        scene_id: scene.id,
        source_scene_version: scene.version,
        shot_number: "001",
        drama_function: "Reveal that the character is listening",
        subject: "Original fictional character",
        framing: "Medium shot",
        lens_rationale: "Neutral perspective",
        movement_trigger: "Stillness",
        movement_end: "No movement",
        blocking: "Character near a window",
        duration_sec: 8,
        editing_reason: "Cut on a change in attention",
        continuity_constraints: "Same key on table",
      })
      .select("id")
      .single(),
    "Create shot",
  );

  await blocked(
    () =>
      a.from("storyboard_frames").insert({
        project_id: projectId,
        scene_id: scene.id,
        shot_id: shot.id,
        source_scene_version: scene.version,
        source_shot_version: 1,
      }),
    "Owner cannot bypass storyboard preparation RPC",
  );
  ok(
    await a.rpc("fz_approve_gate", {
      _project_id: projectId,
      _gate: "shot_list",
    }),
    "Approve shot list",
  );
  const frameId = ok(
    await a.rpc("fz_prepare_storyboard", { _shot_id: shot.id }),
    "Prepare approved storyboard",
  );
  const frame = ok(
    await a.from("storyboard_frames").select("*").eq("id", frameId).single(),
    "Read storyboard",
  );

  const deniedRead = ok(
    await b.from("storyboard_frames").select("*").eq("id", frameId),
    "Check user B visibility",
  );
  assert.deepEqual(deniedRead, []);
  await blocked(
    () => b.rpc("fz_review_storyboard", { _frame_id: frameId, _version: frame.version }),
    "User B cannot review",
  );

  const nextVersion = ok(
    await a.rpc("fz_save_storyboard", {
      _frame_id: frameId,
      _version: frame.version,
      _notes: {
        dramatic_intent: "Watch for a reaction",
        composition: "Medium at the window",
        performance_anchor: "Listen before turning",
        lighting: "Window daylight",
        palette: "Restrained neutrals",
        continuity_locks: "Key remains on the table",
        director_notes: "Hold the silence",
      },
    }),
    "Save director's notes",
  );
  assert.equal(nextVersion, frame.version + 1);

  imagePath = [userA, projectId, "stills", shot.id, randomUUID() + ".png"].join("/");
  ok(
    await a.storage
      .from("project-files")
      .upload(imagePath, png, { contentType: "image/png", upsert: false }),
    "Private image upload",
  );
  const signed = ok(
    await a.storage.from("project-files").createSignedUrl(imagePath, 60),
    "Owner image sign",
  );
  assert.ok(signed.signedUrl);

  await blocked(
    () => b.storage.from("project-files").createSignedUrl(imagePath, 60),
    "User B cannot create signed URL",
  );
  await blocked(
    () => anonymous.storage.from("project-files").download(imagePath),
    "Anonymous cannot download",
  );
  await blocked(
    () => b.storage.from("project-files").download(imagePath),
    "User B cannot download",
  );

  const attachedVersion = ok(
    await a.rpc("fz_attach_storyboard", {
      _frame_id: frameId,
      _version: nextVersion,
      _path: imagePath,
      _hash: sha256,
      _rights_note: "Original automated test image, owned by staging test",
    }),
    "Attach licensed manual reference",
  );
  assert.equal(attachedVersion, nextVersion + 1);
  ok(
    await a.rpc("fz_review_storyboard", {
      _frame_id: frameId,
      _version: attachedVersion,
    }),
    "Review frame",
  );
  const reviewed = ok(
    await a.from("storyboard_frames").select("*").eq("id", frameId).single(),
    "Read reviewed frame",
  );
  assert.ok(reviewed.reviewed_at);

  await blocked(
    () => a.from("storyboard_frames").delete().eq("id", frameId),
    "Direct owner delete must be rejected",
  );
  ok(
    await a.rpc("fz_revoke_gate", { _project_id: projectId, _gate: "shot_list" }),
    "Revoke shot-list approval",
  );
  await blocked(
    () =>
      a.rpc("fz_review_storyboard", {
        _frame_id: frameId,
        _version: reviewed.version,
      }),
    "Revoked approval must block frame review",
  );
  await blocked(
    () =>
      a.rpc("fz_attach_storyboard", {
        _frame_id: frameId,
        _version: reviewed.version,
        _path: imagePath,
        _hash: sha256,
        _rights_note: "Original automated test image, owned by staging test",
      }),
    "Revoked approval must block reference attach",
  );

  const gates = ok(
    await a.rpc("fz_gate_status", { _project_id: projectId }),
    "Check remaining gates",
  );
  for (const name of ["film_stills", "motion", "final_cut"]) {
    assert.equal(gates.find((g) => g.gate === name)?.approved, false);
  }

  console.log(
    "PASS: two-user staging Auth, shot approvals, manual reference upload, " +
      "owner-only signed images, review integrity, revoked-gate denial, " +
      "and all generated-media gates locked.",
  );
} finally {
  if (imagePath) {
    const result = await a.storage.from("project-files").remove([imagePath]);
    if (result.error) console.error("CLEANUP WARNING: image could not be removed.");
  }
  if (projectId) {
    const archive = await a
      .from("projects")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", projectId);
    if (archive.error) console.error("CLEANUP WARNING: project archive failed.");
    const deleted = await a.from("projects").delete().eq("id", projectId);
    if (deleted.error) console.error("CLEANUP WARNING: project deletion failed.");
  }
  await a.auth.signOut();
  await b.auth.signOut();
}
