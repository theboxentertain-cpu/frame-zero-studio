import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
// Opt-in, dedicated staging only. Never uses an admin/service key or existing projects.
const required = [
  "FZ_TEST_URL",
  "FZ_TEST_PUBLIC_KEY",
  "FZ_TEST_A_EMAIL",
  "FZ_TEST_A_PASSWORD",
  "FZ_TEST_B_EMAIL",
  "FZ_TEST_B_PASSWORD",
];
if (process.env.FZ_STAGING_VERIFIED !== "yes" || required.some((k) => !process.env[k]))
  throw new Error(
    "Configure a dedicated staging backend and both test accounts securely, then set FZ_STAGING_VERIFIED=yes.",
  );
const client = () =>
  createClient(process.env.FZ_TEST_URL, process.env.FZ_TEST_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const a = client(),
  b = client(),
  anon = client();
let pid;
const login = async (c, prefix) => {
  const { data, error } = await c.auth.signInWithPassword({
    email: process.env[`FZ_TEST_${prefix}_EMAIL`],
    password: process.env[`FZ_TEST_${prefix}_PASSWORD`],
  });
  assert.ifError(error);
  return data.user.id;
};
try {
  const aid = await login(a, "A"),
    bid = await login(b, "B");
  assert.notEqual(aid, bid);
  const { data: p, error } = await a
    .from("projects")
    .insert({
      title: `Recovery staging test ${crypto.randomUUID()}`,
      logline_ar: "واحد راجع بيته في شبرا",
      region: "القاهرة",
    })
    .select()
    .single();
  assert.ifError(error);
  pid = p.id;
  const { data: brief, error: be } = await a
    .from("briefs")
    .select("*")
    .eq("project_id", pid)
    .single();
  assert.ifError(be);
  const { error: se } = await a
    .from("briefs")
    .update({ source_facts: "مكتوب بالمصري", approved_decisions: "أداء طبيعي" })
    .eq("id", brief.id)
    .eq("version", brief.version);
  assert.ifError(se);
  const { error: re } = await a.rpc("fz_save_brief_revision", { _project_id: pid });
  assert.ifError(re);
  for (const table of ["projects", "briefs", "brief_revisions", "history"]) {
    const { data, error } = await b
      .from(table)
      .select("*")
      .eq(table === "projects" ? "id" : "project_id", pid);
    assert.ifError(error);
    assert.deepEqual(data, []);
  }
  const { data: changed, error: ue } = await b
    .from("projects")
    .update({ title: "forbidden" })
    .eq("id", pid)
    .select();
  assert.ifError(ue);
  assert.deepEqual(changed, []);
  const { data: deleted, error: de } = await b.from("projects").delete().eq("id", pid).select();
  assert.ifError(de);
  assert.deepEqual(deleted, []);
  const { error: forged } = await b
    .from("characters")
    .insert({ project_id: pid, name: "forbidden" });
  assert.ok(forged);
  const { error: rpcError } = await b.rpc("fz_save_brief_revision", { _project_id: pid });
  assert.ok(rpcError);
  const { data: anonymous, error: ae } = await anon.from("projects").select("*").eq("id", pid);
  assert.ok(ae || anonymous?.length === 0);
  await a.auth.signOut();
  await login(a, "A");
  const { data: reopened, error: oe } = await a
    .from("briefs")
    .select("*")
    .eq("project_id", pid)
    .single();
  assert.ifError(oe);
  assert.equal(reopened.source_facts, "مكتوب بالمصري");
  assert.equal(reopened.current_revision, 1);
  console.log(
    "PASS: live staging login, private project, Arabic persistence, revision, sign-out/reopen, cross-user read/update/delete/insert/RPC denial.",
  );
} finally {
  if (pid) {
    const { error: archiveError } = await a
      .from("projects")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", pid);
    assert.ifError(archiveError);
    const { error: deleteError } = await a.from("projects").delete().eq("id", pid);
    assert.ifError(deleteError);
  }
  await a.auth.signOut();
  await b.auth.signOut();
}
