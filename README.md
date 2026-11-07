# MIZENZA / ميزنزا

**mrahmostudios presents** · *From one thought to the final cut.*

MIZENZA is a bilingual Arabic-first / English filmmaking workspace. The Lovable project is still internally labelled **Frame Zero Studio** because this is its original project identifier; it is **not** a different app. The former product name FRAME ZERO / كادر صفر is deprecated. The approved four worlds are **CREATE, CAST & WORLD, DIRECT, FINISH**. The eight-school SLAMS acting app and ROUGHINK screenwriting app are separate projects; do not edit them here.

## Authoritative working state — audited 7 November 2026

- Connected Lovable project: [MIZENZA editor](https://lovable.dev/projects/fa8d6711-b5ee-47ca-9c57-c9da7f86d0c3).
- Git repository: [theboxentertain-cpu/frame-zero-studio](https://github.com/theboxentertain-cpu/frame-zero-studio); **`main` is the shared source of truth**. GitHub commits merged to `main` have been observed synchronizing to Lovable. Do not rewrite pushed Git history.
- After merged [PR #8](https://github.com/theboxentertain-cpu/frame-zero-studio/pull/8), the latest audited application source is commit `028913a63ae9a1e3f84bf263d78c7455193f408c`. This is a **historical audit anchor**, not a permanently fixed HEAD; always inspect current `main` and Lovable's latest SHA.
- The Lovable project was reported ready and **unpublished**. A ready scaffold or preview is not proof of production readiness.
- Latest observed full PR CI [run #42318923730](https://github.com/theboxentertain-cpu/frame-zero-studio/actions/runs/42318923730) passed `npm run check`, `npm run test:browser`, and `npm audit --omit=dev --audit-level=high`. Unit, PGlite and browser fixtures are **not live two-user Supabase tests**.

### Implemented vs blocked

| Area | Evidence / limitation |
| --- | --- |
| Four-world navigation, bilingual RTL/LTR and P00–P23 routes | Implemented in source; UI/browser fixtures checked. |
| Written filmmaking tools, revisions and six approval gates | Implemented/partially implemented according to each route. Generation gates remain locked. |
| P12 manual storyboard (Step 15) | Source integrated in PR #3 with image imports, private-reference code and provenance fields; browser/file tests passed. It is **not yet operational on the Lovable production backend** because that database is missing the `storyboard_frames` table and related RPCs. |
| Shot preflight (PR #8) | Read-only checks for approval, source drift, direction completeness and reference metadata; original PR called this "Step 16A" but it is a **Step 15 technical support task, not a canonical renumbering**. It does not generate images. |
| Real AI image, motion, audio or edited video output | **Not connected**. Do not advertise, charge for, or approve generated media. |
| Production database / RLS | Lovable database is enabled, with core projects and RLS, but the Step 15 schema is missing. Staging-only SQL migrations are **not production migrations**. |
| Staging release security | 0006 rollback-only preview passed; staging 0006 apply and two-account Auth/RLS/private Storage tests are still pending. See [issue #7](https://github.com/theboxentertain-cpu/frame-zero-studio/issues/7). |
| Real Android acceptance | Pending device-level import, reload, permissions, failed-upload and bilingual layout checks. |
| Codex local/cloud workspace | **Not verified** from this repository or Lovable. A shared GitHub repository does not prove that a separate Codex checkout is current, clean or able to run. |

## Canonical product roadmap (do not renumber)

The approved 24-step product progression is preserved in the [Lovable project knowledge](https://lovable.dev/projects/fa8d6711-b5ee-47ca-9c57-c9da7f86d0c3) and original [historical brief](docs/LEGACY_FRAME_ZERO_INITIAL_BRIEF.md). In particular:

- **Step 15 — Cinematic Still Studio**: manual shot references and preflight are in source; live migration/security/device verification is pending; AI still generation is not connected.
- **Step 16 — Video Generation Engine**: future milestone; **not implemented**.
- Steps 17–24 cover Film Memory, retakes, editing, final-cut quality, proof film, releases, beta/launch, and long-form assembly. No completed-media claims without real media and human review.
- Prior development PR labels `Step 16A` and `Step 16B` refer to **engineering preparations around still-generation**, not approval to change the locked 24-step product roadmap.

## Stop conditions

**Do not initiate a production migration, enable film-stills/motion/final-cut approval, call an AI provider, deploy, or claim a finished app** until the live backend issues have been separately reviewed and closed. Review [Step 15 staging runbook](docs/STEP15_STAGING_0006_RUNBOOK.md), [release gate #7](https://github.com/theboxentertain-cpu/frame-zero-studio/issues/7), and [security findings](docs/SECURITY_FINDINGS.md).

The dedicated staging Supabase project is different from Lovable production. Migration 0006 was **previewed and rolled back** in staging, not applied. Never run `drizzle-kit push`: `drizzle/schema.ts` is an empty stub. Review forward-only SQL explicitly for the target environment. Do not copy staging credentials or service-role keys into code.

## Local / Codex verification

Use Node 24 with the tested npm lockfile:

```sh
git remote -v
git branch --show-current
git status --short
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
npm ci
npm run check
npx playwright install chromium
npm run test:browser
npm audit --omit=dev --audit-level=high
```

On the intended `main` checkout, `HEAD` should equal `origin/main` and `git status --short` should show no changes. If that is not true, **inspect and preserve work rather than resetting or force-pushing**. Environment configuration needs `.env.example`'s public variables; never put credentials in chat or public commits.

## References

- [Legacy initial brief — archived, not authoritative](docs/LEGACY_FRAME_ZERO_INITIAL_BRIEF.md)
- [Step 15 integration report](docs/STEP15_MIZENZA_INTEGRATION.md)
- [Step 15 staged migration/security workflow](docs/STEP15_STAGING_0006_RUNBOOK.md)
- [Read-only still preflight contract (legacy Step 16A PR title)](docs/STEP16_STILL_PREFLIGHT.md)
- [Recovery audit (historical)](docs/RECOVERY_AUDIT.md)
- [Security findings](docs/SECURITY_FINDINGS.md)
