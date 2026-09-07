# Current State

## Executive Summary

**Status: 🟡 MVP core is materially implemented, but not release-ready without resolving documented gaps and test failures.** The repository contains a functional authenticated template → brief → AI generation → project → Fabric editor → PNG-export path, real company-logo upload, persistent projects, and broad backend/frontend test suites. The backend currently supports only the auto-selected quick path; multiple polished adjacent screens are static prototypes. This snapshot is the worktree rather than a release: three renderer files are modified and three template JSON files plus a template-generation skill are untracked.

**Evidence convention:** ✅ code-verified; 🟡 partial; ⚪ prototype/mock; ❌ documented requirement missing; 🔵 planned; ❓ unclear.

## Implemented Product Areas

### Authentication and profile access
**Status:** 🟡 Partially implemented

- Register, login, `/me`, JWT auth, bcrypt password hashing, an `AUTH_PROVIDER` switch (`jwt`/`supabase`), frontend token storage, and route middleware exist.
- Login rejects `is_verified=false`.
- **Gap:** registration creates `is_verified=false`, but no verification-token, email delivery, resend, or verify endpoint exists. Registration returns an access token and frontend proceeds to onboarding, but subsequent normal login cannot complete.

**Evidence:** `backend/app/routers/auth.py`, `backend/app/services/auth_service.py`, `frontend/src/app/{register,login}/page.tsx`, `frontend/src/middleware.ts`.

### Company profile and branding
**Status:** ✅ Implemented, with onboarding persistence gaps

- Profile CRUD persists business name, industry, brand colors/font, tagline, address, contact JSON, language preference, and tri-state logo changes.
- Real logo upload validates PNG/JPEG/WEBP bytes, max 2 MB, normalizes to PNG (max side 1024), stores a deterministic R2 key, and returns a cache-busting path.
- Settings uses the shared `LogoUploadField`; `/create` calls `refreshProfile()` at mount.
- Branded state determines the entire rendered profile: colors, fonts, logo, tagline, and footer contact. Address is mapped to footer `location` before resolving.

**Known gaps:** onboarding renders Kota, description, target audience, tone/language, and platform-preference controls that are not persisted to the `CompanyProfile` model. Settings’ description is also local-only.

**Evidence:** `backend/app/{models,routers,schemas,services}/company_profile*`, `backend/app/services/storage_service.py`, `frontend/src/components/ui/logo-upload-field.tsx`, `frontend/src/app/{onboarding,settings,create}/page.tsx`.

### Template library and rendering
**Status:** ✅ Implemented, active work in progress

- Seeded, element-based templates have metadata, `template_config`, active/premium flags, optional platform, and copy intent.
- The current worktree loads **10** seed JSON rows successfully (7 tracked and 3 untracked); all currently use `content_type=instagram_post`, omit `platform`, and none is a seeded `Carousel` template.
- Gallery list/detail APIs, industry/content-type frontend filtering, preview modal, generic unbranded browsing, and opt-in branded preview exist. The list API currently returns the full `template_config` for every row, not only lightweight metadata.
- `resolveTemplateConfig()` produces a resolved config used by CSS `TemplateRenderer` and Fabric `buildCanvasSpec`; tests cover resolver and renderer parity for covered element behavior.
- Canvas auto-fit/reflow protects top-level text against collisions; copy brief generation derives slot limits from template geometry.

**Known gaps:** `templates.platform` exists in the model but is not returned in list schemas/API, so goal/platform context is displayed but does not server-filter template choices. The content-type vocabulary is also inconsistent: seed rows use `instagram_post`, while UI/editor branches and documentation use `Single`/`Carousel`; no seeded Carousel currently exercises that path. Templates with `background.type=image` and `source=background` use `background_url` in the CSS renderer, but the project snapshot/`buildCanvasSpec` path currently carries only `thumbnail_url`; editor/export can therefore fall back to a color or omit the background image. The git worktree adds uncommitted rotate/skew propagation for image/footer rendering without dedicated regression tests, so full parity needs re-verification before release.

**Evidence:** `backend/app/models/template.py`, `backend/app/routers/templates.py`, `frontend/src/lib/template/resolve.ts`, `frontend/src/lib/editor/{canvas-spec,fit-text}.ts`, `frontend/src/components/{template,editor}/`, `backend/scripts/seed_template_data/README.md`.

### Quick content generation
**Status:** ✅ Implemented for the single quick path

- Create UI collects goal, platform, template, product/service, key message, optional notes/promo, language style, and image mode.
- `POST /generate/session` creates a one-hour session and starts a background generation task. Copy and optional generated image run concurrently; copy failure fails the session, image failure is tolerated.
- Completed quick sessions auto-select the first generated variant and create a Project; `/generate` polls and redirects to editor.
- Copy prompt is template-aware (`copy_intent`, present bindings, word/character limits, static template context).

**Evidence:** `frontend/src/app/{create,generate}/page.tsx`, `backend/app/{schemas,routers,services}/generate*`, `backend/app/services/{ai_service.py,providers/copy_prompt.py}`.

### Editor, projects, export, and history
**Status:** ✅ Implemented for core project lifecycle

- Project list/get/update/delete, canvas thumbnail upload, and export upload APIs exist.
- Editor supports copy edits, typography controls, image regeneration, autosave, branded/unbranded resolved render, Fabric PNG export, project rename, and local file download.
- Dashboard/history consume project APIs and allow project deletion.

**Caveats:** carousel export uses browser-side repeated downloads; export upload failure is silently tolerated after a successful local download. The editor’s “upload thematic image” is a client `FileReader` data URL, not a backend/R2 upload flow.

**Evidence:** `backend/app/routers/projects.py`, `backend/app/services/project_service.py`, `frontend/src/app/{editor,dashboard,history}/page.tsx`, `frontend/src/hooks/useAutoSave.ts`.

### Storage, jobs, and AI providers
**Status:** ✅ Implemented with reliability/test concerns

- R2 operations cover temp thematic images, permanent thematic images, thumbnails, exports, and logos.
- FastAPI lifespan runs APScheduler cleanup every 30 minutes based on expired sessions.
- Copy provider selection supports Anthropic and DeepSeek; image provider selection supports Replicate. Models are read from settings/environment.

**Evidence:** `backend/app/main.py`, `backend/app/services/{ai_service,storage_service,cleanup_service}.py`, `backend/app/services/providers/`.

## Partially Implemented Areas

### Carousel and Campaign
**Status:** 🟡 UI/spec present; end-to-end generation unavailable

`/create` exposes carousel slide count/story-flow controls and sends non-null `campaign_data`. `generate_service.create_session()` unconditionally rejects any non-null `campaign_data` with `403 FEATURE_REQUIRES_PREMIUM`. There is no entitlement/billing backend to permit it. The separate `/campaign` page is a UI route that leads users to templates, not a persisted campaign subsystem.

**Conflict:** the synced PRD describes carousel story flow as MVP behavior, but the technical document and service code classify `campaign_data` as gated premium. Treat it as unavailable.

### User-supplied thematic image
**Status:** 🟡 UI-only selection

Create accepts a file in local state but does not upload or include it in the generate payload. The backend schema has no upload field/endpoint for this workflow and stores only `image_source`. Editor upload similarly produces a client data URL. Therefore the documented `image_source=upload` experience is not durable server-side content generation.

### Image suggestions and regeneration
**Status:** 🟡 Implemented endpoints/UI path, not fully hardened

Endpoints generate prompt suggestions and a single AI image; project image regeneration uploads permanent imagery. Validate error handling and provider tests before relying on it, because Replicate provider tests currently issue real requests (see Test State).

## Required but Missing

### Email verification delivery and completion
**Status:** ❌ Required but not implemented

The PRD user journey requires registration → email verification → login, and the backend enforces verification at login. No corresponding endpoint, email provider, token model, resend flow, or verification UI was found.

### Template platform filtering
**Status:** ❌ Required/declared gap

The model contains `Template.platform`, but list output does not expose it. Gallery filtering by platform is absent/no-op despite goal/platform being required in the create funnel.

## Planned / Future Scope

- **Template Lab:** embedded, flag-gated internal JSON/live-preview authoring tool; Template Lab MVP and WYSIWYG Phase 2 are specification-only (`docs/template_lab_spec.md`).
- **Premium Campaign:** multi-content narrative arc, seasonal moments, scheduling, A/B variants, and entitlement logic are proposed in `FlowGenerate.md`, not available.
- **AI background generation:** roadmap only; `is_premium` exists but no implementation.
- **Social publishing, external marketing integrations, analytics, and multi-platform generation:** out of current MVP scope per PRD.

## UI/UX State

- The core onboarding, create, gallery, generation progress, editor, dashboard/history, and settings flows are implemented as rich client UI.
- Core Create layout differs from `frontend/brief.md` (the document’s “no scroll” requirement is not current behavior; both form/preview use bounded scrolling).
- `/campaign`, `/schedule`, `/billing`, `/payment`, and `/subscription` have polished static/presentation interactions but no matching backend resources or integrations. Settings also contains hardcoded plan/quota/notification data and a nonfunctional password-change/delete-account UI.
- Responsive/accessibility quality is not established by repository evidence; no end-to-end or visual accessibility suite was found.

## Backend and Data State

Key persisted entities: `User`, `CompanyProfile`, `Template`, `GenerateSession`, `GenerateVariant`, and `Project`; all use UUIDs. The Alembic chain is `0001` through `0010`. Older databases may have migration drift, but the documented `make reconcile` implementation still stamps `0006` and omits later `projects.thumbnail_url`, `background_url`, `copy_intent`, and `address` work; it must not be assumed safe for a current database until reviewed.

Sessions expire after one hour. Generated AI images start in temp storage, then move to permanent storage during auto-selection. Projects hold a `final_config` snapshot of copy/typography/template configuration plus `brand_applied`; profile brand data stays live at rendering time rather than being snapshotted. The repository documentation/Makefile describe template seeding as a table reset, while `backend/scripts/seed_templates.py` implements an upsert that preserves unrelated rows and admin-uploaded assets; this behavior requires confirmation.

## Integrations

| Integration | Status | Notes |
|---|---|---|
| PostgreSQL/Alembic | ✅ | async SQLAlchemy; historical migration-revision drift documented. |
| Anthropic / DeepSeek copy | ✅ | configurable provider/model; mocked tests mostly present. |
| Replicate images | 🟡 | integration coded, but test isolation is broken. |
| Cloudflare R2/CDN | 🟡 | storage implementation exists; current seed rows also contain external image URLs, and production CORS/CDN behavior is not repository-verifiable. |
| JWT / Supabase auth | 🟡 | provider abstraction exists; Supabase path not end-to-end verified here. |
| Email | ❌ | no delivery/verification integration found. |
| Payments/subscriptions/social APIs | ❌ | UI/proposal only. |

## Test State

- **Frontend:** `cd frontend && npm test` passed: **22 files, 204 tests**. `npx tsc --noEmit -p tsconfig.json` and `npm run build` passed. The build warns that the `middleware` convention is deprecated in favor of `proxy`.
- **Frontend lint:** `npm run lint` failed with **10 errors and 9 warnings**, including React Compiler/purity rules in existing app/hooks/components. This is a quality-gate issue, not a failing product test.
- **Backend:** `cd backend && aigt/bin/pytest -q` collected 221 tests; **213 passed, 8 failed**.
  - One timeout test gets a `CopyError` instead of expected `CopyTimeoutError`, because the handler does not catch the observed `asyncio.TimeoutError` path.
  - Seven Replicate tests patch the module-level `replicate.async_run`, but provider code uses a client instance; tests make real unauthenticated HTTP calls and fail with 401. This is test-isolation debt, not evidence that production credentials are valid.
- The coverage run reported **80% overall**; several route/service modules are below the project’s stated per-layer thresholds. Test files exist for most backend modules and frontend template/editor helpers, but no end-to-end browser tests were found. The quality gates therefore cannot be claimed as met.

## Known Technical Debt / Risks

- Backend test failures violate the repository’s no-failing-tests quality gate.
- `ai_service._call_copy_provider_raw()` calls vendor SDKs directly rather than provider protocol classes; model remains env-configured but this is a second integration path for copy requests such as image suggestions.
- The template list returning full JSON configs, external seed image URLs, and missing `background_url` propagation into editor/export create payload, latency, CORS, and parity risks as the template library scales.
- `backend/scripts/reconcile_schema.py`/`reconcile_schema.sql` still target Alembic `0006` although the current head is `0010`; an existing database can be marked current while later columns are missing.
- UI route middleware only tests cookie presence; token validity and profile/onboarding state are validated later by API calls.
- The frontend stores an access token in localStorage and mirrors it into a cookie, which has XSS/session-security implications; no CSRF/XSS strategy is documented.
- `backend/.env.example` reportedly contains credential-like R2 values (`README.md`); treat rotation/placeholders as a security task.
- `npm run lint` currently fails on React Compiler/purity rules across multiple existing files.

## Open Questions

1. Is carousel intended as an MVP capability or a blocked premium campaign feature? Align PRD, UI, and backend.
2. What is the intended entitlement/billing model, and should UI routes remain visible before it exists?
3. What is the desired file-upload contract for user thematic images?
4. Should old projects continue to live-resolve all company profile fields after rebranding, or should brand data be snapshotted?
5. Which document should replace the obsolete `render-template-logic.md` working notes?
6. Should `make seed` be destructive (as README/Makefile say) or non-destructive upsert (as the script does)?
7. How should legacy databases be reconciled to Alembic `0010`, and should `background_url` be included in project snapshots/CanvasSpec inputs?
8. Are the three untracked template JSON files and the untracked template-generator skill intended for the product branch?
