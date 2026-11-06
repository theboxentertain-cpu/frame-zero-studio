// MIZENZA Step 15 live staging integration test.
// Opt-in only. Two ordinary users, one disposable project, one synthetic PNG.
// Never supplies or reads service-role credentials.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const expectedUrl = "https://crvgvcokzryoxyvjkhxn.supabase.co";
const env = process.env;
const required = [
  "FZ_TEST_URL",
  "FZ_TEST_PUBLIC_KEY",
  "FZ_TEST_A_EMAIL",
  "FZ_TEST_A_PASSWORD",
  "FZ_TEST_B_EMAIL",
  "FZ_TEST_B_PASSWORD",
];
if (
  env.FZ_STAGING_VERIFIED !== "yes" ||
  env.FZ_TEST_URL !== expectedUrl ||
  required.some((name) => !env[name]) ||
  env.FZ_TEST_PUBLIC_KEY.startsWith("sb_secret_")
) {
  throw new Error("Dedicated staging URL, publishable key and two test users are required.");
}

const client = () =>
  createClient(expectedUrl, env.FZ_TEST_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const a = client();
const b = client();
let projectId = null;
let imagePath = null;

async function unwrap(result, description) {
  const { data, error } = await result;
  if (error) throw new Error(description + ": " + (error.code || error.status || "request failed"));
  return data;
}

async function login(c, who) {
  const data = await unwrap(
    c.auth.signInWithPassword({
      email: env["FZ_TEST_" + who + "_EMAIL"],
      password: env["FZ_TEST_" + who + "_PASSWORD"],
    }),
    "User " + who + " authentication",
  );
  assert.ok(data.user?.id, "Test user must have an authenticated identity");
  return data.user.id;
}

function pngChunk(tag, bytes) {
  const type = Buffer.from(tag, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  const source = Buffer.concat([type, bytes]);
  let crc = 0xffffffff;
  for (const byte of source) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, source, checksum]);
}

// Synthetic 320x240 PNG made locally; no person, image provider, or licensed media.
function syntheticPng() {
  const width = 320, height = 240, stride = 1 + width * 3;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * stride + 1 + 3 * x;
      pixels[index] = Math.floor(x * 175 / width);
      pixels[index + 1] = Math.floor(y * 156 / height);
      pixels[index + 2] = 76;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

let testError = null;
try {
  const ownerId = await login(a, "A");
  const otherId = await login(b, "B");
  assert.notEqual(ownerId, otherId);

  const project = await unwrap(
    a.from("projects").insert({
      title: "MIZENZA stills staging QA " + randomUUID(),
      logline_ar: "أم تنتظر على الباب",
      region: "القاهرة",
    }).select().single(),
    "Create test project",
  );
  projectId = project.id;

  const brief = await unwrap(
    a.from("briefs").select("id,version").eq("project_id", projectId).single(),
    "Fetch seeded brief",
  );
  await unwrap(
    a.from("briefs").update({
      source_facts: "أم تنتظر أمام الباب في الصباح",
      approved_decisions: "ملاحظة هادئة ومستمرة",
    }).eq("id", brief.id).eq("version", brief.version),
    "Update creative brief",
  );
  await unwrap(a.rpc("fz_save_brief_revision", { _project_id: projectId }), "Save brief revision");

  await unwrap(
    a.from("treatments").insert({
      project_id: projectId, title: "الفيلم", summary: "فيلم قصير عن الانتظار",
      level: "film", status: "review", source_brief_revision: 1,
    }),
    "Create film treatment",
  );
  await unwrap(
    a.rpc("fz_approve_gate", { _project_id: projectId, _gate: "treatment" }),
    "Approve film treatment",
  );
  const scene = await unwrap(
    a.from("scenes").insert({
      project_id: projectId, title: "المشهد الأول", scene_number: 1,
      synopsis: "تنتظر الأم وصول ابنها",
    }).select("id,version").single(),
    "Create test scene",
  );
  const shot = await unwrap(
    a.from("shots").insert({
      project_id: projectId, scene_id: scene.id, shot_number: "01",
      source_scene_version: scene.version,
      drama_function: "توقع وصول الابن",
      subject: "الأم", framing: "متوسطة", lens_rationale: "50mm للشعور الطبيعي",
      movement_trigger: "static", movement_end: "static", blocking: "الأم عند الباب",
      duration_sec: 8, editing_reason: "إحساس بالانتظار",
      continuity_constraints: "المفاتيح على الطاولة",
    }).select("id,version").single(),
    "Create test shot",
  );
  await unwrap(
    a.rpc("fz_approve_gate", { _project_id: projectId, _gate: "shot_list" }),
    "Approve shot list",
  );

  const unauthorizedInsert = await a.from("storyboard_frames").insert({
    project_id: projectId, scene_id: scene.id, shot_id: shot.id,
    source_scene_version: scene.version, source_shot_version: shot.version,
  });
  assert.ok(unauthorizedInsert.error, "Direct owner INSERT must be blocked");

  const frameId = await unwrap(
    a.rpc("fz_prepare_storyboard", { _shot_id: shot.id }),
    "Prepare storyboard from approved shot",
  );
  let frame = await unwrap(
    a.from("storyboard_frames").select("*").eq("id", frameId).single(),
    "Load owner frame",
  );
  const bRows = await unwrap(
    b.from("storyboard_frames").select("id").eq("project_id", projectId),
    "User B isolation read",
  );
  assert.deepEqual(bRows, []);
  const reviewByB = await b.rpc("fz_review_storyboard", {
    _frame_id: frameId, _version: frame.version,
  });
  assert.ok(reviewByB.error, "User B must not review user A frame");
  const deleteByA = await a.from("storyboard_frames").delete().eq("id", frameId).select();
  assert.ok(deleteByA.error, "Owner cannot bypass review via direct DELETE");

  await unwrap(
    a.rpc("fz_save_storyboard", {
      _frame_id: frameId, _version: frame.version,
      _notes: {
        dramatic_intent: "الأم تستمع ولا تتكلم",
        composition: "لقطة ثابتة ومتوسطة عند الباب",
        performance_anchor: "استمع للخطوات أولاً",
        lighting: "ضوء الصباح الطبيعي",
        palette: "ألوان محايدة",
        continuity_locks: "المفاتيح على الطاولة",
        director_notes: "لا تعتمد على البكاء",
      },
    }),
    "Save director notes",
  );
  frame = await unwrap(
    a.from("storyboard_frames").select("*").eq("id", frameId).single(),
    "Load updated frame",
  );

  const bytes = syntheticPng();
  imagePath = ownerId + "/" + projectId + "/stills/" + shot.id + "/" + randomUUID() + ".png";
  await unwrap(
    a.storage.from("project-files").upload(imagePath, bytes, {
      contentType: "image/png", upsert: false,
    }),
    "Upload synthetic test image to private bucket",
  );
  const signedA = await a.storage.from("project-files").createSignedUrl(imagePath, 60);
  assert.ifError(signedA.error);
  assert.ok(signedA.data?.signedUrl);
  const signedB = await b.storage.from("project-files").createSignedUrl(imagePath, 60);
  assert.ok(signedB.error || !signedB.data?.signedUrl, "User B cannot create signed URL");

  const downloaded = await unwrap(
    a.storage.from("project-files").download(imagePath),
    "Download owner private image",
  );
  assert.equal(
    createHash("sha256").update(Buffer.from(await downloaded.arrayBuffer())).digest("hex"),
    createHash("sha256").update(bytes).digest("hex"),
    "Storage content must retain byte integrity",
  );
  const downloadB = await b.storage.from("project-files").download(imagePath);
  assert.ok(downloadB.error || !downloadB.data, "User B cannot download image");

  const rightsNote = "Synthetic original test image with no third-party rights";
  const checksum = createHash("sha256").update(bytes).digest("hex");
  await unwrap(
    a.rpc("fz_attach_storyboard", {
      _frame_id: frameId, _version: frame.version,
      _path: imagePath, _hash: checksum, _rights_note: rightsNote,
    }),
    "Attach private reference",
  );
  frame = await unwrap(
    a.from("storyboard_frames").select("version").eq("id", frameId).single(),
    "Fetch latest frame version",
  );
  await unwrap(
    a.rpc("fz_review_storyboard", { _frame_id: frameId, _version: frame.version }),
    "Director review of manual reference",
  );

  const gates = await unwrap(
    a.rpc("fz_gate_status", { _project_id: projectId }),
    "Inspect generation approval gates",
  );
  for (const gate of ["film_stills", "motion", "final_cut"]) {
    const state = gates.find((x) => x.gate === gate);
    assert.ok(state && !state.approved && !state.ready, gate + " must stay locked");
  }

  await unwrap(
    a.rpc("fz_revoke_gate", { _project_id: projectId, _gate: "shot_list" }),
    "Revoke shot list approval",
  );
  frame = await unwrap(
    a.from("storyboard_frames").select("version").eq("id", frameId).single(),
    "Load current version after revocation",
  );
  const retryReview = await a.rpc("fz_review_storyboard", {
    _frame_id: frameId, _version: frame.version,
  });
  assert.ok(retryReview.error, "Revocation must block new review");
  const retryAttach = await a.rpc("fz_attach_storyboard", {
    _frame_id: frameId, _version: frame.version,
    _path: imagePath, _hash: checksum, _rights_note: rightsNote,
  });
  assert.ok(retryAttach.error, "Revocation must block new attachment");

  console.log("PASS: two-user isolation, private PNG upload/download and signed URL, director review, locked generation gates, revoked approval.");
} catch (error) {
  testError = error;
} finally {
  if (imagePath) {
    const { error } = await a.storage.from("project-files").remove([imagePath]);
    if (error) console.error("WARNING: Could not remove synthetic staging reference.");
  }
  if (projectId) {
    const { error: archiveError } = await a.from("projects").update({
      status: "archived", archived_at: new Date().toISOString(),
    }).eq("id", projectId);
    if (archiveError) console.error("WARNING: Could not archive disposable staging project.");
    const { error: removeError } = await a.from("projects").delete().eq("id", projectId);
    if (removeError) console.error("WARNING: Could not remove disposable staging project.");
  }
  await a.auth.signOut();
  await b.auth.signOut();
}
if (testError) throw testError;
