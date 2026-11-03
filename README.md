# Frame Zero Studio

CREATE A NEW PROJECT NAMED "FRAME ZERO" (كادر صفر) under mrahmostudios. It must be completely separate from SLAMS. Build a REAL mobile-first bilingual filmmaker web application, not a landing page or static mockup. This is a cloud-port of an EXISTING locally-built product through Step 14. Existing local source is FastAPI/SQLite, to be ported into Lovable's React/TypeScript and managed PostgreSQL/Supabase architecture. Do not claim that this source is imported (it is not attached due to environment upload limitation); preserve this exact domain contract and report features truthfully.

VISION: Premium AI filmmaking product "From one thought to the final cut." Egyptian-Arabic flagship, globally extensible. Strong creative philosophy: story before spectacle; psychologically credible playable acting; motivated camera; restrained color; deliberate cutting; human director control. Four MAIN WORLDS ONLY:
1 CREATE / ابتكر
2 CAST & WORLD / الشخصيات والعالم
3 DIRECT / أخرج
4 FINISH / أنهِ الفيلم.
Other utilities are secondary (Project Library, Account, Versions, Budget). Modes STORYTELLER/FILMMAKER/DIRECTOR, selectable and saved. Native Arabic RTL, English LTR, localized labels, accessible 44px touch targets, Android-first bottom tabs, desktop sidebar; typography editorial and cinematic; colors charcoal #0C0E11 / #121519 / #191D22, champagne #D8B37B, ivory #F2F0EB. Avoid generic colorful dashboard, fake AI footage, or placeholder controls disguised as functional.

REQUIRED EXISTING DOMAIN SCOPE (completed locally but NEEDS CLOUD PORT and live security verification):
P00 Project Library, P01 New Film, P02 Creative Brief /projects/:id/brief, P03 Directing Interpretations /projects/:id/interpretations, P04 Director's Treatment /projects/:id/treatment, P05 Story Map /projects/:id/story,
P06 Casting Room /projects/:id/cast, P07 Living Actors /projects/:id/performances, P08 World & Region /projects/:id/locations, P09 Dialect & Voice /projects/:id/language,
P10 Scene Navigator /projects/:id/scenes, P11 Shot Lab /projects/:id/scenes/:sid/plan, P12 Visual Storyboard /projects/:id/scenes/:sid/stills, P13 Production Floor /projects/:id/scenes/:sid/production,
P14 Retake Room /projects/:id/shots/:shotid/retake, P15 Film Memory /projects/:id/continuity,
P16 Picture Edit /projects/:id/edit, P17 Sound Studio /projects/:id/sound, P18 Color Studio /projects/:id/grade, P19 Final Cut Guardian /projects/:id/quality, P20 Final Export /projects/:id/export,
P21 Version History /projects/:id/versions, P22 Budget /projects/:id/budget, P23 Account & Rights /account.
Preserve stable IDs. Real content and purposeful empty states, distinguish implemented tools from roadmap stages (steps 15+ are NOT operational). Director's Treatment and shot list approval are written-only.

USER JOURNEY to make actually work:
Authenticated user creates private film with title, Arabic/English logline or pitch, region, requested duration 30s/3min/15min/60min DEVELOPMENT ONLY. Project persists, can be reopened after sign-out. Creative Brief has explicit source facts separated from proposed interpretation and approved creative decisions. Save rich notes and versioned revisions. Film analysis and AI features are NOT connected yet; provide honest manual / deterministic planning affordances, not fake AI results.
Director Interpretation: manual selection of three cinematographic directions (Observational, Spatial Pressure, Selective Perspective), with editable objectives/obstacles/stakes and draft status. Creative Reference Engine: record director/film/acting/color/music reference notes then convert selected attributes to original, non-infringing artistic constraints.
P04 Film/Sequence/Scene treatments: editable nested scene records, acting/camera/sound/location/continuity intentions, draft/review, source-revision tracking. P06 fictional cast profiles: character identity, individually specified appearance, regional background kept SEPARATE from facial attributes, rights/likeness permission metadata and editable lock state; don't imply actual image locking. P08 World Bibles: governorate, district, place, year, architecture, interiors, props, sound, evidence notes, written lock. P09 Arabic Dialogue/Voice: character-specific dialect and pronunciation, editable dialogue, tactic/pause/overlap/code-switching, source and voice permission notes; no speech generation. P07 Living Actors: one character+scene linked plan with character objective, obstacle, playable tactic, partner cue, listening/reaction, physical action, beats, source-version and written plan lock. P10/P11 shot plans tied to scenes: each shot with drama function, subject, framing, lens rationale, movement trigger/end, blocking, duration, editing reason, continuity constraints; no approval without required fields.
Treat all suggestions as proposals only, never invented facts. Six approval gates (treatment, world, shot_list, film_stills, motion, final_cut) with only READY if prerequisites exist; no false completed approvals for stills/motion/film.
Operations: save, edit, archive/restore, optimistic version locks, history, duplicate where possible, solid errors and loading, full Arabic RTL.

HARD TECH / SECURITY:
Use actual managed Lovable backend / Supabase for Auth, PostgreSQL, private object storage and row-level security. Default project/private data owner-only: cross-user SELECT/UPDATE/DELETE denied. Avoid service secrets on client. Validate ownership on nested records and source-version drift. Auth and data privacy/rights pages. Test with two users, CSRF/session according to stack, prevent stale concurrent writes. If cloud database cannot be provisioned, transparently report blocker and do not pretend persistence. Do not generate any film, copy film/celebrity likeness, or bill users.

BUILD PRIORITY IN THIS INITIAL TURN:
A) Actual authentication + secure database + polished functional project library and New Film/Creative Brief.
B) All 24 routes + 4 major worlds + responsive EN/AR RTL navigation with correctly scoped project context.
C) Implement as many P03/P04/P06/P07/P08/P09/P10/P11 persisted editors as practical, but report exactly what's built versus scaffold; if credits insufficient, prioritize a genuine secure foundation over fake feature coverage.
D) Provide explicit status summary, test evidence, blocking issues, URLs, future migration path. Do not falsely claim importing FastAPI ZIP, pass/green on unexecuted security tests, or connected generation providers.
Please BEGIN THE BUILD rather than discussing it.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fa8d6711-b5ee-47ca-9c57-c9da7f86d0c3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
