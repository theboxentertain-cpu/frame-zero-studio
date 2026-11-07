<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- MIZENZA:SHARED-AGENT-POLICY:BEGIN -->
# MIZENZA — shared instructions for Codex, Lovable and ChatGPT

**Scope:** Only repository `theboxentertain-cpu/frame-zero-studio`, linked Lovable project `fa8d6711-b5ee-47ca-9c57-c9da7f86d0c3`. **Do not** edit SLAMS, ROUGHINK or any other Lovable project.

1. **Current brand:** MIZENZA / ميزنزا, endorsed "mrahmostudios presents". "FRAME ZERO / كادر صفر" is the historical development name only. Preserve four worlds CREATE, CAST & WORLD, DIRECT, FINISH, stable P00–P23, bilingual AR RTL / EN LTR, and the shared Director creative identity.
2. **Canonical product milestones:** Step 15 = Cinematic Still Studio; Step 16 = Video Generation Engine. PR #8's "Step 16A" refers to a **read-only still-preflight engineering subtask inside Step 15**, not a replacement of the product roadmap. Do not accidentally renumber Steps 17–24.
3. **Real implementation:** P12 manual licensed references, direction records and source/version preflight are present in code. **No image, video, voice, film-still approval or final-cut generation is connected.** The preflight must always report `production_generation_allowed=false` until a separately approved, server-side implementation exists.
4. **Verified blocking mismatch (7 Nov 2026):** Lovable's cloud PostgreSQL has the projects table but lacks `public.storyboard_frames`, `fz_prepare_storyboard`, `fz_attach_storyboard`, `fz_review_storyboard`. The **dedicated staging** environment has migrated through 0005; 0006 was only previewed/rolled back. Never treat source SQL or a green fixture CI run as deployed schema or live RLS proof.
5. **Security gates:** Do not run production SQL, `drizzle-kit push`, auto-deploy, publish, connect a paid AI provider, use service-role secrets in browsers, alter identity/privacy data, or unlock `film_stills`/`motion`/`final_cut` as part of ordinary docs/UI changes. A separate review and test plan is required. Staging migration 0006 and two-user Auth/RLS/private storage verification are tracked in issue #7.
6. **Sync discipline:** `main` is the GitHub/Lovable common source-of-truth; fetch and compare commit SHAs before doing work. A Codex checkout is **not assumed synchronized** simply because GitHub and Lovable match. Do not overwrite uncommitted changes. Never force-push or rewrite existing commits. Prefer feature branches, explicit PRs, and passing `npm run check`, `npm run test:browser`, and dependency audit before merge.
7. **Reporting:** Specify what was directly tested and where. Source tests use mocks/PGlite and browser fixtures, not live backend proof. State true errors and incomplete work explicitly. Read [README](README.md), [Step 15 runbook](docs/STEP15_STAGING_0006_RUNBOOK.md), [security findings](docs/SECURITY_FINDINGS.md), and [release gate](https://github.com/theboxentertain-cpu/frame-zero-studio/issues/7) before continuing implementation.

**Operating posture:** Freeze new feature development until Codex state and the live schema/security discrepancy have been reconciled. Documentation and read-only checks are safe.
<!-- MIZENZA:SHARED-AGENT-POLICY:END -->
