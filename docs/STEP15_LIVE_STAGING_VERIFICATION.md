# MIZENZA Step 15 — live staging verification

This project has two different databases. Do not confuse them:

- **Dedicated test/staging**: `https://crvgvcokzryoxyvjkhxn.supabase.co`, migrations 0000–0005 previously installed.
- **Lovable's existing backend**: production-like app backend, not yet upgraded to 0002 or 0003–0006. **Never use these staging workflows against it.**

## Step A: forward-only 0006 staging migration

Workflow: `.github/workflows/step15-staging-0006.yml`.

- Trusted `main` pushes of this workflow/script perform an **automatic preview** (transaction and ROLLBACK). It cannot commit changes.
- The manual `workflow_dispatch` defaults to `preview`; it also rolls back.
- To actually commit to **staging only**, select `apply` and type exactly `APPLY MIZENZA STAGING 0006`.
- Only the Supabase Session Pooler with database login `postgres.crvgvcokzryoxyvjkhxn` and port 5432 is accepted.
- Uses repository secret `STAGING_DATABASE_URL`. The value is never printed.
- Verifies storyboard RLS, private bucket, removal of direct INSERT/DELETE grants and gate-aware review RPCs.
- A second run after successful apply reports "already applied" and performs no write.

**Never rerun the old schema installation workflow for migration 0006.** It is for a fresh schema only.

## Step B: live two-user private storyboard test

Workflow: `.github/workflows/step15-live-images.yml`, manual only.

Requires five existing GitHub Secrets:
`FZ_TEST_PUBLIC_KEY`, `FZ_TEST_A_EMAIL`,
`FZ_TEST_A_PASSWORD`, `FZ_TEST_B_EMAIL`,
`FZ_TEST_B_PASSWORD`. Both users must exist in the **staging** Supabase project and be confirmed.
No service-role key is needed or permitted.

Use branch `main` and enter exactly `RUN MIZENZA STAGING IMAGES`.

The workflow creates a disposable film project and locally generated **synthetic** PNG, then verifies:

- Project/brief/treatment/scene/shot creation and explicit shot-list approval.
- Direct storyboard INSERT and DELETE are denied, while RPC preparation works.
- Account B cannot read or review Account A's private storyboard.
- Account A uploads and downloads private Storage bytes and signs a short-lived URL.
- Account B cannot mint a signed URL or download Account A's private object.
- Director notes, image attribution and human review work.
- Manual references cannot unlock `film_stills`, `motion`, or `final_cut`.
- Revoking shot-list approval blocks further attachment and review.
- Cleanup attempts remove the synthetic image and disposable project in a `finally` block.

## Required before product release

These tests are **not** a provider generation benchmark, real camera/face consistency review,
Android device acceptance test, nor a production migration. Do not treat a green staging CI
run as approval to ship. Review production schema and secrets independently.

Known limitations: the database currently checks the *format* of the client-provided SHA-256
image digest but does not independently recompute it from stored bytes. Human rights
attestations are unverified. Signed URLs are bearer links and can be accessed by someone
given the link before expiry; B's inability to mint one is the tested control.
