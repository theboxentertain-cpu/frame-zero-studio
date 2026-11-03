import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

// Isolated PostgreSQL engine. Never connects to or migrates the deployed backend.
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
 CREATE SCHEMA storage; CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO authenticated; GRANT ALL ON storage.objects TO authenticated;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`);
for (const f of [
  "0000_frame_zero_foundation.sql",
  "0001_fix_gate_status_arrays.sql",
  "0002_recovery_security.sql",
])
  await db.exec(readFileSync(new URL("../drizzle/migrations/" + f, import.meta.url), "utf8"));
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
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
let pid, sceneId;
test("Arabic project journey, seeded brief/directions, revisions, optimistic updates and persisted mode", async () => {
  await asUser(a, async () => {
    pid = (
      await db.query(
        "INSERT INTO public.projects(title,logline_ar,region) VALUES ('فيلم كادر صفر','واحد راجع بيته في شبرا','القاهرة') RETURNING id",
      )
    ).rows[0].id;
    assert.equal(
      (await db.query("SELECT * FROM public.briefs WHERE project_id=$1", [pid])).rows.length,
      1,
    );
    assert.equal(
      (await db.query("SELECT * FROM public.interpretations WHERE project_id=$1", [pid])).rows
        .length,
      3,
    );
    await db.query(
      "UPDATE public.briefs SET source_facts='شبرا',approved_decisions='أداء طبيعي وكاميرا لها دافع' WHERE project_id=$1 AND version=1",
      [pid],
    );
    assert.equal(
      (await db.query("SELECT fz_save_brief_revision($1)", [pid])).rows[0].fz_save_brief_revision,
      1,
    );
    assert.equal(
      (await db.query("SELECT notes FROM public.brief_revisions WHERE project_id=$1", [pid])).rows
        .length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "UPDATE public.briefs SET notes='stale overwrite' WHERE project_id=$1 AND version=1 RETURNING id",
          [pid],
        )
      ).rows.length,
      0,
    );
    await db.query("UPDATE profiles SET mode='director',locale='ar' WHERE id=$1", [a]);
  });
  await asUser(a, async () => {
    assert.equal(
      (await db.query("SELECT title FROM projects WHERE id=$1", [pid])).rows[0].title,
      "فيلم كادر صفر",
    );
    assert.equal(
      (await db.query("SELECT mode FROM profiles WHERE id=$1", [a])).rows[0].mode,
      "director",
    );
  });
});
test("another user cannot read/update/delete private data, forge owners, link another project, or call private RPCs", async () => {
  await asUser(b, async () => {
    for (const table of ["projects", "briefs", "brief_revisions", "interpretations", "history"])
      assert.equal((await db.query(`SELECT * FROM ${table}`)).rows.length, 0);
    assert.equal(
      (await db.query("UPDATE projects SET title='stolen' WHERE id=$1 RETURNING id", [pid])).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("DELETE FROM projects WHERE id=$1 RETURNING id", [pid])).rows.length,
      0,
    );
    await assert.rejects(
      db.query("INSERT INTO projects(title,owner_id) VALUES ('forged',$1)", [a]),
    );
    await assert.rejects(
      db.query("INSERT INTO characters(project_id,name) VALUES ($1,'intruder')", [pid]),
    );
    for (const sql of [
      "SELECT fz_save_brief_revision($1)",
      "SELECT fz_gate_status($1)",
      "SELECT fz_approve_gate($1,'treatment')",
      "SELECT fz_duplicate_project($1)",
    ])
      await assert.rejects(db.query(sql, [pid]));
  });
});
test("snapshot metadata cannot be forged; nested foreign keys reject cross-project references", async () => {
  await asUser(a, async () => {
    await assert.rejects(
      db.query("UPDATE briefs SET current_revision=999 WHERE project_id=$1", [pid]),
    );
    await assert.rejects(
      db.query(
        "INSERT INTO brief_revisions(project_id,revision_no,source_facts,proposed_interpretation,approved_decisions,notes) VALUES ($1,999,'','','','')",
        [pid],
      ),
    );
    const other = (await db.query("INSERT INTO projects(title) VALUES ('Other') RETURNING id"))
      .rows[0].id;
    const char = (
      await db.query("INSERT INTO characters(project_id,name) VALUES ($1,'شخصية') RETURNING id", [
        other,
      ])
    ).rows[0].id;
    sceneId = (
      await db.query(
        "INSERT INTO scenes(project_id,title) VALUES ($1,'المشهد الأول') RETURNING id",
        [pid],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query(
        "INSERT INTO performance_plans(project_id,scene_id,character_id) VALUES ($1,$2,$3)",
        [pid, sceneId, char],
      ),
    );
  });
});
test("director gates block incomplete plans, stale treatment and stale scene sources; generation cannot be approved", async () => {
  await asUser(a, async () => {
    await assert.rejects(db.query("SELECT fz_approve_gate($1,'treatment')", [pid]));
    await db.query(
      "INSERT INTO treatments(project_id,title,summary,status,source_brief_revision) VALUES ($1,'فيلم','رصد طبيعي','review',1)",
      [pid],
    );
    await db.query("SELECT fz_approve_gate($1,'treatment')", [pid]);
    const shot = (
      await db.query("INSERT INTO shots(project_id,scene_id) VALUES ($1,$2) RETURNING id", [
        pid,
        sceneId,
      ])
    ).rows[0].id;
    await assert.rejects(db.query("SELECT fz_approve_gate($1,'shot_list')", [pid]));
    await db.query(
      "UPDATE shots SET drama_function='توتر',subject='شخص',framing='متوسطة',lens_rationale='مسافة طبيعية',movement_trigger='دخول',movement_end='وقوف',blocking='جنب الشباك',duration_sec=3,editing_reason='رد فعل',continuity_constraints='نظرة',source_scene_version=1 WHERE id=$1",
      [shot],
    );
    await db.query("SELECT fz_approve_gate($1,'shot_list')", [pid]);
    await db.query("UPDATE scenes SET synopsis='تغيير' WHERE id=$1", [sceneId]);
    await assert.rejects(db.query("SELECT fz_approve_gate($1,'shot_list')", [pid]));
    await db.query("UPDATE shots SET source_scene_version=2 WHERE id=$1", [shot]);
    await db.query("UPDATE briefs SET notes='new direction' WHERE project_id=$1", [pid]);
    await assert.rejects(db.query("SELECT fz_approve_gate($1,'shot_list')", [pid]));
    for (const gate of ["film_stills", "motion", "final_cut"])
      await assert.rejects(db.query("SELECT fz_approve_gate($1,$2)", [pid, gate]));
  });
});
test("anonymous visitors have no project privileges; projects must be archived before deletion", async () => {
  await db.exec("SET ROLE anon");
  try {
    await assert.rejects(db.query("SELECT * FROM projects"));
  } finally {
    await db.exec("RESET ROLE");
  }
  await asUser(a, async () => {
    assert.equal(
      (await db.query("DELETE FROM projects WHERE id=$1 RETURNING id", [pid])).rows.length,
      0,
    );
    await db.query("UPDATE projects SET status='archived' WHERE id=$1", [pid]);
  });
});
test("private storage policies deny cross-user access and foreign project uploads", async () => {
  await asUser(a, async () => {
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('project-files',$1)", [
      a + "/" + pid + "/notes.txt",
    ]);
  });
  await asUser(b, async () => {
    assert.equal((await db.query("SELECT * FROM storage.objects")).rows.length, 0);
    await assert.rejects(
      db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('project-files',$1)", [
        a + "/" + pid + "/intruder.txt",
      ]),
    );
    await assert.rejects(
      db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('project-files',$1)", [
        b + "/" + pid + "/intruder.txt",
      ]),
    );
  });
  await asUser(a, async () => {
    assert.equal((await db.query("SELECT * FROM storage.objects")).rows.length, 1);
  });
});
test.after(async () => {
  await db.close();
});
