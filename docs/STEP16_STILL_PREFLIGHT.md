# MIZENZA Step 16A — Cinematic still preflight contract

Status: **source-only draft for review; no production deploy, SQL, media generation or provider charges**.

## Implemented
- Pure, deterministic `buildStillPreflightReport` for a scene and its current shot list.
- Explicit blocker codes when shot-list approval is withdrawn, a frame is absent, the scene/shot version changes or required directing fields are empty.
- Independent reference metadata: image attached, SHA-256 claim present, user rights **declared** (never treated as independently licensed), manual review current.
- Identity, cast likeness and world continuity are **unverified** in this module. The contract must not claim consistent faces or environments without verifiable locked assets.
- `film_stills` remains locked, `generation.allowed=false`, `provider=not_connected`, `status=not_generated` for every shot and the whole scene.
- P12 shows the number of current direction-complete shots, and the JSON handoff includes the `preflight` object without exposing private signed URLs.
- Eight offline tests enforce negative cases, drift and the false-claims boundary.

## What the preflight does NOT establish
- Production authorization, signed release of likeness, permitted likeness rights, or verified provenance of manual references.
- Locked cast, wardrobe, geographical identity, dialect, lighting continuity across shots, or multi-shot face consistency.
- Backend generation security, provider credentials, production pricing, quotas, prompt safety, model outputs or final approval.

The warning `manual_reference_missing` is **not** a direction blocker: future still generators may support text-only concepts, but production generation is always prohibited here. Passing direction checks means only that a written shot instruction is present and current.

## Step 16B requirements before any generator integration
1. Review the full Step 15 live staging report and record two-user private-storage/RLS pass, migration 0006, Android import QA.
2. Establish per-project cast and world **lock IDs** and provenance, with explicit permission status; no face-identity claims from descriptions alone.
3. Choose provider(s) against verified current contracts, image ownership, safety, cost and documented character-continuity support.
4. Implement a **server-side** provider adapter with a billing limit, idempotency key, audit history, shot/source-version checks and separate staging configuration.
5. Store image outputs privately under owner/project/shot with server-validated byte signatures, hashes and media metadata. Do not expose provider secrets in the browser.
6. Use controlled comparisons with original test subjects and independent human review. Cross-shot consistency must be measured, not asserted.
7. Keep storyboard **manual references** separate from AI-generated image records. The `film_stills` approval gate cannot be unlocked by client-side preflight, by reference upload, or by a provider's success response.

## Release boundary
No provider call, SQL migration, production deployment or gate unlock is included. Step 16A is preparatory engineering; Step 16B is blocked by live staging sign-off and provider feasibility.
