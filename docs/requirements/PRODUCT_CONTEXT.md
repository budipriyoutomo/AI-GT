# AI-GT Product Context

## Product Summary

**AI-GT (AI Content Generator Tools)** is a desktop-first web SaaS for Indonesian SMB/UKM owners, small marketing teams, and individual creators. It turns a business profile, a marketing goal, a platform, a template, and a short brief into an editable marketing visual and PNG export. It aims to remove the cost and design-skill barrier of producing on-brand social content.

**Maturity:** MVP in active development. The core single-content workflow is implemented; several adjacent product surfaces and some documented carousel/premium behavior are incomplete or inconsistent with the backend.

## Users / Actors

- **Business owner / marketing staff / creator:** creates and edits company profile, browses templates, generates content, edits projects, exports PNGs.
- **Template author/admin (internal):** authors versioned JSON template definitions and seeds them into the database. A proposed Template Lab would support this workflow.
- **AI copy provider:** Anthropic or DeepSeek; produces copy and typography suggestions.
- **AI image provider:** Replicate; optionally produces thematic imagery. Its failure must not fail copy generation.
- **Cloudflare R2/CDN:** persists template, generated-image, logo, thumbnail, and export assets.

## Core Product Domains

- **Identity and onboarding:** local JWT or Supabase-selected authentication; business profile is required before generation. Email verification is intended but not completed.
- **Company brand profile:** business identity, logo, colors, font, tagline, address, and social/contact details. Branded rendering is opt-in before generation.
- **Template library:** element-based, seeded visual templates. Templates lock their layout/background/design system while exposing copy, logo, footer, and image slots.
- **Content generation:** goal + platform, brief, language style, optional AI image; a background task calls AI and creates a project automatically for the supported quick path.
- **Editor and project library:** Fabric.js canvas editing, autosaved project configuration/thumbnails, local PNG download and backend export upload.
- **Asset lifecycle:** temporary AI images are moved to permanent storage when selected; scheduled cleanup removes expired temporary images.

## Important User Journeys

1. **Sign-up and setup:** register → onboarding → create company profile (including optional logo and brand data) → dashboard. The intended email-verification step has no complete delivery/verification flow.
2. **Generate one visual:** `/create` → select required goal and platform → browse/preview a template → fill brief and language style → optionally request thematic AI image → poll generation → auto-created project → editor → download/export PNG.
3. **Brand-aware template choice:** gallery starts unbranded with generic profile data → user may enable “Preview dengan brand color” → selection carries a boolean intent to `/create` and final project → CSS preview and Fabric editor resolve the same branded/unbranded configuration.
4. **Maintain brand:** Settings/onboarding upload a normalized logo, then save profile; `/create` refreshes profile data on mount so new work uses current branding.

## Product Boundaries

AI-GT owns templates, profiles, sessions, projects, the browser editor, and asset orchestration. It does not currently own social publishing, scheduling, analytics, payment processing, email delivery/verification, or a production subscription entitlement system. It depends on PostgreSQL, AI providers, Cloudflare R2/CDN, and optionally Supabase authentication.

## Technical Orientation

A Next.js 16/React 19 frontend talks to a FastAPI/async SQLAlchemy backend. AI calls are centralized in `backend/app/services/ai_service.py`; R2 access is centralized in `storage_service.py`. The frontend has two renderers—CSS preview and Fabric canvas—and both are intended to consume `resolveTemplateConfig()` so preview and exported PNG agree. Current worktree changes extend rotate/skew rendering, while `background_url` propagation into editor/export remains a parity caveat. See `docs/TECHNICAL_DOCUMENTATION.md` for detailed architecture, subject to the conflicts in `CURRENT_STATE.md`.

## Important Constraints

- **Template integrity:** AI and backend cannot mutate a template’s layout, background, or authored color scheme.
- **Brand parity:** the single frontend resolver determines colors, font precedence, logo, tagline, and footer contact for both renderers.
- **AI resilience:** copy is required; thematic images are optional and run in parallel with copy.
- **Stateless backend:** persisted database records, not process memory, hold generation state.
- **Asset paths:** database assets are normally root-relative R2 paths resolved to CDN URLs at render time; logos add a cache-busting query string.
- **Engineering policy:** TDD and response-envelope/error-code conventions are mandatory (`AGENTS.md`).

## Product Evolution

The repository has moved from a proposed split of **Quick Generate** versus premium **Campaign** to a currently supported quick, single-project flow. The synced PRD describes a unified four-step flow and carousel story engine, while the active backend still rejects non-null `campaign_data` as premium. Do not assume carousel/campaign behavior from UI alone.

## Current Focus

Recent commits and handoffs focus on template-renderer parity, brand resolution through editor/export, company logo upload, footer contact/address mapping, copy-fitting constraints, and new template authoring. The current worktree is unclean: renderer files and three template JSON files are uncommitted/untracked; verify before treating this snapshot as a released state.

## Key Risks / Unknowns

- Carousel UI submits data the backend rejects.
- Email verification is enforced at login but lacks a verification/delivery endpoint.
- Image-upload selection in the create flow is not transferred to backend storage.
- Billing, payment, scheduling, and campaign screens are largely presentation prototypes.
- Migration reconciliation and template-seed behavior conflict with their operational documentation.
- Backend tests and frontend lint are currently failing; see `CURRENT_STATE.md`.

## Where to Read Next

- Product scope: `docs/PRD-AI-GT-v2-synced.md`
- Architecture/API/data model: `docs/TECHNICAL_DOCUMENTATION.md`
- Mandatory rules: `AGENTS.md`
- Template authoring: `backend/scripts/seed_template_data/README.md`
- Internal authoring proposal: `docs/template_lab_spec.md`
- Implementation status and conflicts: `docs/requirements/CURRENT_STATE.md`
- Scope comparison: `docs/requirements/SCOPE_MATRIX.md`
