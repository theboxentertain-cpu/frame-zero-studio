# Security findings

## Fixed in code / pending deployed verification

1. **High — private query cache survived identity changes.** SessionProvider now cancels/clears private queries when user identity changes, including sign-out and account switches. A stale startup getUser response cannot overwrite a newer auth event. Regression test covers A→B→signed-out. RLS remains the data boundary.
2. **High — stale drafts could overwrite newer records.** Generic editor now retains the version associated with the local draft. An incoming refetch does not silently advance that version. Conflicts refetch while retaining the draft; explicit “Load latest” adopts remote text/version. Test exercises version 1 draft versus remote version 2, then explicit recovery.
3. **Medium — revision forgery.** Previous grants allowed direct brief_revisions inserts and current_revision updates. Migration 0002 revokes these privileges, grants only editable brief columns and moves snapshot assignment into an ownership-checked security-definer RPC with a fixed search path and row lock. Isolated SQL tests deny direct metadata forgery. Migration is not applied remotely.
4. **Medium — stale approval dependency.** Shot approval previously accepted any treatment approval even after the brief/treatment changed. Recovery requires a current ready treatment approval, matching brief revisions and current active source scenes; invalid prerequisites mark old approvals stale. Generation gates remain non-operational. Tested in isolated PostgreSQL.
5. **Repository hygiene.** Removed tracked .env from the branch index and ignored private env variants; local configuration remains on disk. The original file contained backend identifiers/public browser configuration, not evidence of a leaked service-role secret. Historical commits are unchanged. .env.example contains placeholders only. Generated service-role module remains server-only and has no frontend import.
6. **Dependency advisories.** Updated Vite 8.1.5→8.3.5 and Zod 3→4.6.7, validated build/tests. Production audit has zero known findings at audit time.

## Open findings / release checks

- **High assurance gap: deployed Auth/RLS/storage unverified.** Network policy blocks backend requests. Local SQL tests cannot establish hosted policies, private bucket creation, current grants or cloud schema parity. Test two distinct staging accounts through PostgREST and GoTrue before release; opt-in script is supplied.
- **Medium: approval concurrency.** Gate prerequisites are checked in an RPC but do not serialize all concurrent project edits/approval operations. Current stale checks are not a full immutable approval snapshot. Do not treat written approval as irreversible authorization to run media generation or spend money.
- **Medium: written locks are UI decisions.** Characters/locations/performance locking blocks edits in the UI and requires fields there. SQL does not prohibit a project owner directly editing their own locked record. Locks are not cryptographic asset identity guarantees or a separate authorization role.
- **Medium: treatment structure.** Composite project foreign keys prevent cross-project linkage, but self/cyclic parents and level-specific parent requirements are not enforced. History preserves changes; validate full treatment trees before using them in generation.
- **Medium: development dependencies.** Full npm audit reports 18 moderate findings through minimatch (ESLint/typescript-eslint) and old esbuild (Drizzle's deprecated esm-loader). No high/critical or production findings remain. Avoid internet exposure of development servers. Upgrading these transitive majors or Drizzle's prerelease toolchain requires separate compatibility work; do not force overrides or run automatic schema push against production. Audit JSON can be reproduced with `npm audit --json`.
- **Session model:** browser localStorage/brokered tokens, bearer requests and client-only route gate. Routes are usability protection; RLS must enforce privacy. Direct API writes need a user bearer token rather than ambient cookies, reducing traditional cookie-CSRF exposure. XSS can steal browser tokens: no HTML injection was found in recovered editors, but CSP, OAuth redirect allowlists, email recovery, token refresh and actual deployment headers remain staging review items.
- **Rights:** metadata and manual written approvals do not verify legal consent; no provider generation, real-person image locking, voice cloning or billing has been introduced.

## Safe database review

Keep existing data and revisions. Review `drizzle/migrations/0002_recovery_security.sql`, test on a staging copy and apply through the deployment's reviewed migration runner. It alters functions/grants only; it does not drop tables, delete projects or rewrite snapshots. Do not run `drizzle-kit push`: the committed generated schema file is empty. The migration journal contains the new entry; no production migration was executed.

## Live staging check

Set `FZ_TEST_URL`, `FZ_TEST_PUBLIC_KEY`, `FZ_TEST_A_EMAIL`, `FZ_TEST_A_PASSWORD`, `FZ_TEST_B_EMAIL`, `FZ_TEST_B_PASSWORD` securely and set `FZ_STAGING_VERIFIED=yes` only for a dedicated staging environment with 0002 applied. Run `node tests/live-staging.mjs`. The script creates its own unique project, tests private persistence and cross-user denial, and archives/deletes only that project. It never provisions users or uses an admin key. This check has not been run in this workspace.
