# MIZENZA — Production Schema Reconciliation (REVIEW ONLY)

**Date:** 7 November 2026. **Status:** Not authorized for production deployment; no production SQL write performed.

## Exact verified facts

The connected Lovable project `fa8d6711-b5ee-47ca-9c57-c9da7f86d0c3` uses a Supabase cloud database. Read-only metadata inspection established:

- `public.projects`, `public.briefs`, `public.brief_revisions`, `public.scenes`, `public.shots`, and other foundation tables exist with RLS enabled.
- `public.storyboard_frames` and the `fz_prepare_storyboard`, `fz_attach_storyboard`, `fz_review_storyboard` RPCs are absent. P12 therefore **cannot** be certified operational against Lovable's database.
- `fz_save_brief_revision(uuid,text)` exists but is **SECURITY INVOKER**. The reviewed recovery SQL in `0002` expects **SECURITY DEFINER** with explicit ownership checks and row locking.
- Actual table ACLs for `briefs` and `brief_revisions` include `authenticated=arwdDxtm/postgres` (broad table privileges including INSERT, UPDATE, DELETE and TRUNCATE). Direct `briefs.current_revision` UPDATE privilege is present. This differs from the reviewed `0002` intention.
- Private bucket `project-files` exists and is not public. This does not prove object RLS works against two real users.
- `0006` was tested on **separate staging** in rollback-only preview. No successful staging `0006` apply or live two-account Auth/RLS test was observed at the audit checkpoint.
- Further production inspection was prevented by the Lovable free-plan database action quota. Do not infer uninspected function bodies, user counts, data cleanliness, or installed migration history.

**Security qualification:** Broad database role grants are a serious least-privilege failure. They do not alone prove a browser/API exploit; policies and API surface must be tested separately. The privileges must still be corrected before release.

## Proposed forward-only sequence

The canonical files are:

1. `0000` + `0001`: apparently represented in production foundation, but **do not replay** without exact schema/version reconciliation.
2. `0002_recovery_security.sql`: expected revision-snapshot and gate hardening, NOT yet verified as applied. Review existing definitions, dependencies and data before scheduling.
3. `0003_step15_storyboard.sql`: missing storyboard table and row policies.
4. `0004_step15_review.sql`: controlled prepare, attach and review functions.
5. `0005_step15_versioned_writes.sql`: optimistic versioned edits and link integrity.
6. `0006_step15_approval_integrity.sql`: revokes direct storyboard writes and requires current approval; dedicated staging preview passed, apply outstanding.
7. `0007_revision_acl_hardening.sql`: NEW candidate. After 0002, strips authenticated direct write privileges on immutable revision rows and protects brief snapshot metadata, preserving allowed editing and server-controlled revision capture.

**No migration is presumed idempotent on a drifted production schema.** The `0007` candidate has an explicit requirement that the `fz_save_brief_revision(uuid,text)` RPC is SECURITY DEFINER: it will abort otherwise. Never bypass that guard.

## Required controlled preparation (no production change)

- [ ] Capture a protected, point-in-time **schema and data backup** from the real target using a proper administrative workflow, and verify an independent restoration on a nonproduction clone. Do not copy personal film contents into public CI logs or repositories.
- [ ] Confirm current database project identity, full schema, indexes, triggers, RLS, grants, RPC definitions, migration records, and object-storage settings. Use [read-only baseline SQL](sql/mizenza_schema_baseline_readonly.sql). Additional Lovable inspector queries are rate-limited; retry only when quota permits.
- [ ] Reconcile stored records against constraints that would be added by `0002–0007`; preserve every project, revision, cast, scene, shot and linked asset.
- [ ] First apply `0006` and validate the existing dedicated staging environment after explicit authorization, then validate `0007` there; separate staging is NOT a clone of Lovable production.
- [ ] Restore a production-like clone and apply the **exact proposed** SQL in a transaction, taking note of lock timeouts, function replacement, potential dependent RPCs and data conflicts. Test rollback and restore.
- [ ] Run two **non-service-role** test identities through real auth, queries and object storage. Assert direct revision forgery fails, private data is isolated, stale approvals reject writes, signed URLs cannot be minted for another user, and generation gates remain locked.
- [ ] Run P00–P12 in EN and AR on a real Android device including permissions, image import failures, reload and edit conflicts.
- [ ] Obtain a **separate explicit production-apply authorization** with backup/rollback operator, approved migration hashes, observability and a verified maintenance window. A PR merge or passing CI is **never approval** to apply production SQL.

## Offline evidence and limitations

`tests/revision-acl.test.mjs` simulates the observed broad authenticated grants in isolated PGlite. It then applies `0007` and verifies that normal brief edits and the owner-scoped revision RPC continue working while direct INSERT/UPDATE/DELETE/TRUNCATE and counter forgery are denied. This is **not** a production test.

`npm run check` and `npm run test:browser` must pass on the feature PR. Existing browser tests use mocked transport, not the production backend. The migration file is not dispatched to a server by a GitHub merge.

## Stop / rollback triggers

Abort and roll back any nonproduction rehearsal if identity differs from the explicitly chosen project, prerequisites are missing, lock timeout or data constraint failure occurs, RLS owner-isolation fails, source revision capture breaks, or a generated-media gate becomes available. Preserve logs without leaking connection strings or private user content.

**Related blockers:** [#10 production schema/ACL](https://github.com/theboxentertain-cpu/frame-zero-studio/issues/10), [#7 staging and Android signoff](https://github.com/theboxentertain-cpu/frame-zero-studio/issues/7).
