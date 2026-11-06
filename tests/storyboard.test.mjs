import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// Isolated PostgreSQL. Does not connect to the deployed backend.
const db = new PGlite();
await db.exec(
  [
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;",
    "CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');",
    "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
    "GRANT USAGE ON SCHEMA auth TO authenticated,anon;",
    "GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;",
    "CREATE SCHEMA storage;",
    "CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);",
    "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;",
    "GRANT USAGE ON SCHEMA storage TO authenticated;",
    "GRANT ALL ON storage.objects TO authenticated;",
    "CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;",
  ].join("\n"),
);
for (const f of [
  "0000_frame_zero_foundation.sql",
  "0001_fix_gate_status_arrays.sql",
  "0002_recovery_security.sql",
  "0003_step15_storyboard.sql",
  "0004_step15_review.sql",
  "0005_step15_versioned_writes.sql",
  "0006_step15_approval_integrity.sql",
]) {
  await db.exec(readFileSync(new URL("../drizzle/migrations/" + f, import.meta.url), "utf8"));
}
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
await db.query("INSERT INTO auth.users(id,email) VALUES ($1,$2),($3,$4)", [
  a,
  "a@example.test",
  b,
  "b@example.test",
]);
async function asUser(id, fn) {
  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}
let project, shot, frame;
test("Prepare only an approved, current shot plan", async () => {
  await asUser(a, async () => {
    project = (await db.query("INSERT INTO projects(title) VALUES ('فيلم') RETURNING id")).rows[0]
      .id;
    await db.query("UPDATE briefs SET approved_decisions='Observational' WHERE project_id=$1", [
      project,
    ]);
    await db.query("SELECT fz_save_brief_revision($1)", [project]);
    await db.query(
      "INSERT INTO treatments(project_id,title,summary,status,source_brief_revision) VALUES ($1,'Film','Naturalism','review',1)",
      [project],
    );
    await db.query("SELECT fz_approve_gate($1,'treatment')", [project]);
    const scene = (
      await db.query(
        "INSERT INTO scenes(project_id,title) VALUES ($1,'المشهد الأول') RETURNING id",
        [project],
      )
    ).rows[0].id;
    const sql = [
      "INSERT INTO shots(project_id,scene_id,source_scene_version,drama_function,subject,",
      "framing,lens_rationale,movement_trigger,movement_end,blocking,duration_sec,editing_reason,continuity_constraints)",
      "VALUES ($1,$2,1,'دافع','أم','متوسطة','50mm','static','static','عند الباب',8,'معلومة','المفاتيح') RETURNING id",
    ].join(" ");
    shot = (await db.query(sql, [project, scene])).rows[0].id;
    await assert.rejects(db.query("SELECT fz_prepare_storyboard($1)", [shot]));
    await db.query("SELECT fz_approve_gate($1,'shot_list')", [project]);
    // An authenticated owner cannot insert records without the preparation RPC.
    await assert.rejects(
      db.query(
        "INSERT INTO storyboard_frames(project_id,scene_id,shot_id,source_scene_version,source_shot_version) VALUES ($1,$2,$3,1,1)",
        [project, scene, shot],
      ),
    );
    frame = (await db.query("SELECT fz_prepare_storyboard($1) id", [shot])).rows[0].id;
    const rec = (await db.query("SELECT * FROM storyboard_frames WHERE id=$1", [frame])).rows[0];
    assert.equal(rec.reviewed_at, null);
    assert.equal(rec.project_id, project);
    assert.equal(rec.dramatic_intent, "دافع");
    // Deletion must use controlled server operations rather than direct table grants.
    await assert.rejects(db.query("DELETE FROM storyboard_frames WHERE id=$1", [frame]));
  });
});
test("Only the owner can see frames or request review", async () => {
  await asUser(b, async () => {
    assert.equal((await db.query("SELECT * FROM storyboard_frames")).rows.length, 0);
    await assert.rejects(db.query("SELECT fz_prepare_storyboard($1)", [shot]));
    await assert.rejects(db.query("SELECT fz_review_storyboard($1,1)", [frame]));
    await assert.rejects(
      db.query("UPDATE storyboard_frames SET composition='stolen' WHERE id=$1", [frame]),
    );
  });
});
test("Stale versions, imported image provenance and source drift", async () => {
  await asUser(a, async () => {
    const notes = {
      dramatic_intent: "سلوك الأم أثناء الانتظار",
      composition: "Fixed medium at doorway",
      performance_anchor: "Listen for footsteps",
      lighting: "Window in morning",
      palette: "Restrained neutrals",
      continuity_locks: "Keys stay on table",
    };
    const v = (
      await db.query("SELECT fz_save_storyboard($1,1,$2) version", [frame, JSON.stringify(notes)])
    ).rows[0].version;
    assert.equal(v, 2);
    await assert.rejects(
      db.query("SELECT fz_save_storyboard($1,1,$2)", [frame, JSON.stringify(notes)]),
    );
    await assert.rejects(
      db.query("UPDATE storyboard_frames SET reviewed_at=now() WHERE id=$1", [frame]),
    );
    await assert.rejects(db.query("SELECT fz_review_storyboard($1,$2)", [frame, v]));
    const path = a + "/" + project + "/stills/" + shot + "/sample.webp";
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('project-files',$1)", [
      path,
    ]);
    const after = (
      await db.query("SELECT fz_attach_storyboard($1,$2,$3,$4,$5) v", [
        frame,
        v,
        path,
        "a".repeat(64),
        "Original image I own and can use",
      ])
    ).rows[0].v;
    assert.equal(after, 3);
    await db.query("SELECT fz_review_storyboard($1,$2)", [frame, after]);
    const row = (await db.query("SELECT * FROM storyboard_frames WHERE id=$1", [frame])).rows[0];
    assert.ok(row.reviewed_at);
    await assert.rejects(
      db.query("UPDATE storyboard_frames SET image_path='forged' WHERE id=$1", [frame]),
    );
    // Revoked approval must block a fresh manual reference and review.
    await db.query("SELECT fz_revoke_gate($1,'shot_list')", [project]);
    await assert.rejects(db.query("SELECT fz_review_storyboard($1,$2)", [frame, row.version]));
    await assert.rejects(
      db.query("SELECT fz_attach_storyboard($1,$2,$3,$4,$5)", [
        frame,
        row.version,
        path,
        "a".repeat(64),
        "Original image I own and can use",
      ]),
    );
    await db.query("UPDATE shots SET blocking='moved' WHERE id=$1", [shot]);
    await assert.rejects(db.query("SELECT fz_review_storyboard($1,$2)", [frame, row.version + 1]));
  });
});
test.after(async () => await db.close());
