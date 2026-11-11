# Documentation Map

Use this index for discovery; the files in this folder summarize and link to source documents rather than replacing them.

## Repository Instructions

### `AGENTS.md`
**Purpose:** Mandatory contribution rules, monorepo layout, API envelopes/error codes, AI/storage rules, template integrity, renderer parity, and TDD/coverage policy.

**Use when:** Starting any implementation or review. It explicitly directs readers through the technical documentation sections before backend work.

### `README.md`
**Purpose:** Setup, local/Docker execution, migrations, seeding, commands, environment variables, and known credential hygiene issue.

**Use when:** Running the project or reconciling an existing database.

### `CLAUDE.md`
**Purpose:** Alias/reference to `AGENTS.md`.

### `.claude/commands/update-docs.md` and `.claude/commands/pre-push.md`
**Purpose:** Repository workflow instructions for documentation synchronization, compatibility checks, and pre-push validation.

**Use when:** Updating docs after implementation changes or preparing a branch for review. These are workflow guidance, not product requirements.

## Product Requirements

### `docs/PRD-AI-GT-v2-synced.md`
**Purpose:** MVP product scope and user journeys, stated as synchronized with implementation (dated 2026-07-16 in the document).

**Authoritative for:** Intended product behavior, target users, template/brand semantics, and stated gaps.

**Use when:** Discussing feature intent or UX. Validate its carousel and unified-flow claims against `CURRENT_STATE.md`: the current backend still gates `campaign_data`.

### `FlowGenerate.md`
**Purpose:** Detailed proposal for free Quick Generate versus premium Campaign, including seasonal-moment and narrative-arc concepts.

**Use when:** Evaluating future campaign/premium design. It contains placeholders/open decisions and is not an implementation contract; it conflicts with both the synced PRD and current backend in places.

### `frontend/brief.md`
**Purpose:** UI brief-page component specification.

**Use when:** Reviewing or evolving the Create brief UI. Treat as a historical design brief; inspect `frontend/src/app/create/page.tsx` for current behavior.

## Technical Architecture and Operations

### `docs/TECHNICAL_DOCUMENTATION.md`
**Purpose:** System architecture, stack, models, API endpoints, generation pipeline, storage, auth, frontend rendering, configuration, and tests.

**Authoritative for:** Detailed technical design and API/data contracts where code agrees.

**Use when:** Designing backend/frontend changes, integration behavior, scaling, or deployment. It states it reflects `dev`; still validate its campaign and “actual implementation” claims against code.

### `backend/scripts/seed_template_data/README.md`
**Domain:** Template authoring.

**Purpose:** Required `template_config` schema, authoring boundaries, element semantics, brand themes, AI copy bindings, geometry, and seed metadata.

**Use when:** Creating/changing a template JSON or discussing renderer compatibility. This is the authoritative template-authoring contract.

### `docs/render-template-logic.md`
**Domain:** Brand/template resolution.

**Purpose:** Older prototype working notes for runtime merging and fetch strategy.

**Use when:** Historical context only. It explicitly labels itself provisional and still describes obsolete `zones`/anchors and a pre-resolver model; use `AGENTS.md` §6 and current `frontend/src/lib/template/resolve.ts` instead.

### `docs/template_lab_spec.md`
**Domain:** Internal template operations.

**Purpose:** Proposed embedded admin Template Lab MVP and later WYSIWYG phase.

**Use when:** Planning internal authoring tooling. It is a future specification, not implemented functionality.

### `backend/alembic/versions/`
**Domain:** Data migrations.

**Purpose:** Executable schema history. The current chain reaches `0010_add_address_to_company_profiles.py`.

**Use when:** Reasoning about persisted fields, legacy databases, rollback, or migration safety. Compare with `backend/scripts/reconcile_schema.py` and `backend/scripts/reconcile_schema.sql`, which still target `0006`.

### `backend/scripts/seed_templates.py` and `backend/scripts/design_system.json`
**Domain:** Template data operations.

**Purpose:** Loads template JSON, expands optional design-system presets, preserves admin asset fields, and upserts seed rows.

**Use when:** Discussing seeding, reproducibility, template data ownership, or preset expansion. Its non-destructive upsert behavior conflicts with the README/Makefile description of a reset.

## Feature-Specific Documentation

### `docs/render-template-logic.md`
**Domain:** Template rendering and profile merge.

**Purpose:** Historical working notes for a former zones/anchors merge model and profile fetch strategy.

**Use when:** Understanding historical rationale only. Do not use it as the current renderer contract; consult `AGENTS.md`, `frontend/src/lib/template/resolve.ts`, and `CURRENT_STATE.md`.

### `docs/fix-template-in-create-page.md`
**Domain:** Create/template preview UX.

**Purpose:** Handoff describing `brandPreview` URL state and replacing static Create preview with the shared renderer.

**Use when:** Reviewing that transition or its open question about carrying brand state beyond Create. The core change appears implemented.

### `.agents/skills/template-generator/SKILL.md`
**Domain:** AI-assisted template authoring.

**Purpose:** Local agent skill for extracting reference images into template JSON and validating brand/parity constraints.

**Use when:** Generating templates with the agent. It is currently untracked and contains examples/requirements that conflict with the authoritative seed README (for example, `bind` naming and mandatory body/CTA/footer assumptions); confirm before relying on it.

## Handoff / Development Context

These describe work at a point in time, not durable requirements. Use them to reconstruct why code changed; compare with source and commit history.

- `docs/handoff-improvements/upload-company-logo.md` — detailed plan for real logo upload. **Likely implemented/stale:** endpoint, normalization, shared UI component, and tests now exist.
- `docs/handoff-improvements/merge-in-create.md` — profile refresh on `/create`. **Likely implemented/stale:** `refreshProfile()` is called at create mount.
- `docs/handoff-improvements/handoff8a.md` — single resolver/two renderers and persisted `brand_applied`. **Likely implemented/stale:** resolver and parity tests exist; current worktree has renderer edits.
- `docs/handoff-improvements/settings-logo-upload-non-functional.md` — investigation of prior mock logo UI. **Stale:** live logo-upload code now exists.
- `docs/fix-template-in-create-page.md` — plan to carry gallery brand-preview state into Create. **Likely implemented/stale:** `brandPreview` URL state and live selected-template rendering exist.

Handoffs should primarily inform `CURRENT_STATE.md` and `DECISIONS.md`; they are not permanent product requirements unless confirmed elsewhere.

## Generated Context Layer

- `docs/requirements/PRODUCT_CONTEXT.md` — product in 5–10 minutes.
- `docs/requirements/CURRENT_STATE.md` — implementation evidence, gaps, test state, conflicts.
- `docs/requirements/DECISIONS.md` — durable decisions versus inferences.
- `docs/requirements/GLOSSARY.md` — domain vocabulary.
- `docs/requirements/SCOPE_MATRIX.md` — prevents mixing Quick Generate, Campaign, and Template Lab scopes.

## Source-of-Truth Hierarchy

**Explicit:** `AGENTS.md` makes itself mandatory, identifies `docs/TECHNICAL_DOCUMENTATION.md` as the reference sequence for technical work, and makes the seed README mandatory for template JSON.

**Inferred for product discussions:**

1. Current implementation and tests establish what exists today.
2. `AGENTS.md` governs non-negotiable engineering/template constraints.
3. The synced PRD governs intended MVP behavior, unless implementation proves a gap.
4. Technical documentation governs detailed architecture/API behavior where code agrees.
5. Feature specs and handoffs supply scoped or historical context; they cannot silently override the above.

No repository document defines a fuller formal precedence hierarchy. Conflicts are recorded in `CURRENT_STATE.md` and `DECISIONS.md`.

## Documentation Not Found

No dedicated authentication, email-verification, payment, notification, security, integration, ADR, or migration-design document was found beyond the general PRD/technical docs, handoffs, executable migrations, and source code. Treat those domains as code/doc gaps rather than assuming undocumented requirements.
