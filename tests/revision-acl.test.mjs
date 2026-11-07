import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

// Isolated PostgreSQL, no credentials, network or deployed database writes.
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
 CREATE SCHEMA storage; CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO authenticated; GRANT ALL ON storage.objects TO authenticated;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`);

function migration(name) {
  return readFileSync(new URL("../drizzle/migrations/" + name, import.meta.url), "utf8");
}

for (const file of [
  "0000_frame_zero_foundation.sql",
  "0001_fix_gate_status_arrays.sql",
  "0002_recovery_security.sql",
]) {
  await db.exec(migration(file));
}

// Simulate the broad role grants actually observed through Lovable metadata.
// No live database is used.
await db.exec(`
  GRANT ALL PRIVILEGES ON TABLE public.briefs, public.brief_revisions TO authenticated;
`);

async function hasTablePrivilege(table, action) {
  const sql = `SELECT has_table_privilege(
    'authenticated', 'public.${table}', $1) AS allowed`;
  const result = await db.query(sql, [action]);
  return result.rows[0].allowed;
}

async function hasBriefUpdate(column) {
  const sql = `SELECT has_column_privilege(
    'authenticated', 'public.briefs', $1, 'UPDATE') AS allowed`;
  const result = await db.query(sql, [column]);
  return result.rows[0].allowed;
}

assert.equal(await hasTablePrivilege("brief_revisions", "TRUNCATE"), true);

await db.exec(migration("0007_revision_acl_hardening.sql"));

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
await db.query(
  `INSERT INTO auth.users(id,email) VALUES
   ($1,'a@example.test'),($2,'b@example.test')`,
  [A, B],
);

async function asUser(id, fn) {
  await db.exec("SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}

test("migration revokes the simulated overgrants", async () => {
  for (const p of ["INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
    assert.equal(await hasTablePrivilege("brief_revisions", p), false, p);
  }
  for (const p of ["INSERT", "DELETE", "TRUNCATE"]) {
    assert.equal(await hasTablePrivilege("briefs", p), false, p);
  }
  assert.equal(await hasBriefUpdate("current_revision"), false);
  assert.equal(await hasBriefUpdate("notes"), true);
});

test("owner can edit the brief and save a controlled immutable revision", async () => {
  await asUser(A, async () => {
    const result = await db.query(`
      INSERT INTO public.projects(title)
      VALUES ('MIZENZA ACL regression') RETURNING id
    `);
    const project = result.rows[0].id;
    await db.query(
      `UPDATE public.briefs
       SET notes='Versioned artist notes',
           approved_decisions='Director approved observation'
       WHERE project_id=$1`,
      [project],
    );
    const snapshot = await db.query("SELECT fz_save_brief_revision($1) AS version", [project]);
    assert.equal(snapshot.rows[0].version, 1);
    const revision = await db.query(
      "SELECT revision_no,notes FROM public.brief_revisions WHERE project_id=$1",
      [project],
    );
    assert.equal(revision.rows[0].revision_no, 1);
    assert.equal(revision.rows[0].notes, "Versioned artist notes");

    const illegal = [
      "UPDATE public.briefs SET current_revision=99 WHERE project_id=$1",
      "DELETE FROM public.briefs WHERE project_id=$1",
      "DELETE FROM public.brief_revisions WHERE project_id=$1",
      "UPDATE public.brief_revisions SET revision_no=99 WHERE project_id=$1",
      `INSERT INTO public.brief_revisions
       (project_id,revision_no,source_facts,proposed_interpretation,approved_decisions,notes)
       VALUES ($1,99,'','','','')`,
    ];
    for (const sql of illegal) {
      await assert.rejects(db.query(sql, [project]));
    }
    await assert.rejects(db.query("TRUNCATE TABLE public.brief_revisions"));
  });
});

test("another authenticated account cannot read the owner's brief", async () => {
  await asUser(B, async () => {
    const briefs = await db.query("SELECT * FROM public.briefs");
    const revisions = await db.query("SELECT * FROM public.brief_revisions");
    assert.equal(briefs.rows.length, 0);
    assert.equal(revisions.rows.length, 0);
  });
});

test.after(async () => db.close());
