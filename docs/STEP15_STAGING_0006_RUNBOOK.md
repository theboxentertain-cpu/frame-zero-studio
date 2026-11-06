# MIZENZA Step 15 — staging 0006 verification

**Scope: dedicated Supabase staging only.** No changes to the Lovable production database and no AI image generation.

## Verified so far

- Project reference: `crvgvcokzryoxyvjkhxn` (staging only).
- Migrations `0000`–`0005` and the private `project-files` bucket were installed earlier.
- Step 15 P12 was merged into the latest MIZENZA `main` branch.
- Rollback-only verification of `0006`: GitHub Actions [run 42313218555](https://github.com/theboxentertain-cpu/frame-zero-studio/actions/runs/42313218555) succeeded.
- The preview confirmed earlier direct INSERT/DELETE permissions and old attachment/review RPCs. Migration `0006` removed direct writes, enforced current approved shot lists, and passed the assertions **inside a transaction that was rolled back**.
- **Migration `0006` is not installed until a separate manual Apply run succeeds.**
- The production backend is still missing the Step 15 schema. Never use this workflow against production.

## Review and apply 0006

1. Review the draft verification PR and confirm its CI tests are green.
2. Merge its **workflow and script** into `main` after review. This does not execute SQL by itself.
3. Open GitHub Actions → **MIZENZA Step 15 staging 0006 verification**.
4. Run a manual `preview` on `main`; it must pass and report rollback.
5. To install **on staging only**, run again with `mode=apply` and confirmation:
   `APPLY MIZENZA 0006 TO STAGING`.
6. Inspect the Actions logs for **COMMITTED to verified MIZENZA staging only**. Do not reapply the fresh-database installer `staging-schema.yml`.

The installer rejects connections unless the URL contains `postgres.crvgvcokzryoxyvjkhxn`, port `5432` and a Supabase Session Pooler hostname. Apply is not permitted from feature branches or from push events. The script checks RLS, table grants, the private bucket and the updated review/attachment functions before commit.

## Live two-user test

The manual **MIZENZA live staging security test** expects these GitHub Actions secrets:
- `FZ_TEST_PUBLIC_KEY` — publishable/anon **not** admin/service role.
- `FZ_TEST_A_EMAIL`, `FZ_TEST_A_PASSWORD` — first staging test user.
- `FZ_TEST_B_EMAIL`, `FZ_TEST_B_PASSWORD` — second staging test user.

The database installer also requires the already configured `STAGING_DATABASE_URL` secret. Do not share secrets in chat, PRs or logs.

After 0006 Apply succeeds, run the manual live-staging workflow with exact confirmation:
`RUN FRAME ZERO STAGING TEST`.

It executes the existing written-project isolation test and a new Step 15 private-reference test. The latter creates a disposable test film/shot/frame and test PNG, checks denied access for user B, verifies signing and approval revocation, then attempts cleanup. Check the logs for cleanup warnings.

## Limitations

This API test does **not** exercise the Android browser image canvas, real cinematic still rendering, actual provider costs, identity consistency or production authorization. A green test is not permission to enable generated-media gates or deploy production.
