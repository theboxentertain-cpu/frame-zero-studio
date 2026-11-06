# MIZENZA Step 15 — Android image-import QA

**Scope:** P12 manual reference imports. This is not an AI still generator, and it is not production approval.

## Automated browser coverage

`tests/browser/still-sanitizer.spec.ts` runs against the actual Vite-served
`sanitizeImage` function at the Playwright default 390 × 844 viewport:

1. Generate 640 × 360 PNG, JPEG, and WebP images in Chromium.
2. Run the app's metadata-stripping canvas conversion, decode the result, verify the 640 × 360 pixels, **WebP MIME**, nonempty/limited size, and recompute SHA-256.
3. Reject a PNG mislabeled JPEG, an unsupported GIF, a 300 × 220 image, and a browser that silently returns a PNG blob for a WebP conversion request.
4. Check that the screen has no horizontal overflow.

**Run:** `npm run test:browser`. These tests do not need Supabase credentials.

## Still required before launch

- Execute a manual rollback-only preview of staging migration `0006` on `main`.
- Only after review, execute the separate `apply` action against the
  dedicated staging project and run the two-account Auth/RLS/private-Storage test.
- Manually exercise image file selection, on-device camera-roll permissions,
  rights attestation, upload, preview after refresh, and image error recovery
  on a real Android device. The fixture test cannot establish those.
- Test storage permission isolation and lifecycle using **real** signed URLs.
  A signed URL is a bearer capability; anyone who obtains a valid URL may access
  the asset until expiration, even though a second user cannot mint it.
- Review orphan upload cleanup, secure provider-side content verification,
  pricing, and generation identity consistency before any production migration.

The browser hashes the bytes it uploads, but the backend presently validates
the submitted SHA-256 format rather than independently rehashing stored bytes.
The `film_stills`, `motion`, and `final_cut` generation gates must remain locked.
MIZENZA still has **no connected AI image/video provider**.
