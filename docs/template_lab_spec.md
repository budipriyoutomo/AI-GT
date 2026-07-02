# Template Lab — Spec (MVP v1)

## 1. Context & Purpose

Creating new templates (`template_config` JSON) currently requires manual JSON file editing in
`backend/scripts/seed_template_data/`, with no instant preview — making design iteration slow and often
misaligned with the visual reference (see `TEMPLATE_AUTHORING.md` for the JSON structure rules that apply).

**Template Lab** is an internal tool (used by Irfan only, not AI-GT end-users) to speed up this loop:
upload a reference image or start blank → edit JSON with realtime live preview → seed to database. This is
**NOT** a separate application — it's built as an embedded menu within the existing AI-GT app, gated behind
an environment flag, so it reuses the exact same renderer running in production (zero drift risk).

**Roadmap note:** Template Lab is the foundation for a planned WYSIWYG canvas editor feature (user-facing,
future AI-GT feature). This MVP scope is JSON editor + live preview only — an interactive canvas
(manual drag/resize/rotate) is intentionally **out of scope** for now; that's Phase 2.

---

## 2. Architecture — Key Decisions

- **Embedded in the AI-GT monorepo**, not a separate repo, not a git submodule. The renderer is reused
  directly from the same source used by the production frontend — there's no second renderer to keep
  manually in sync.
- **Access control: environment flag only.** The route doesn't render / returns 404 unless a specific env
  flag is active (e.g. `ENABLE_TEMPLATE_LAB=true`). No role/permission system needed — single-admin use case.
- **Technical prerequisite:** check whether the renderer (the component that reads `template_config` and
  turns it into visuals) is already cleanly isolated from other UI components. If not, extract it into a
  reusable module first — this is a prerequisite, not optional.

---

## 3. MVP Flow

```
[Sidebar menu "Template Lab" — hidden unless env flag is active]
        |
        v
[Choose starting point: "Start from Image" or "Start Blank"]
        |
        v
[From image: upload → AI (vision) generates a draft template_config JSON]
[Blank: start from an empty/minimal skeleton template_config]
        |
        v
[Main screen: JSON editor (left) + Live Preview (right), realtime update]
[Preset picker available for common text effects: curved/skewed/rotated/glossy etc.,
 referencing `text_styles` in design_system.json — user picks a preset by name,
 no need to write raw rotate/skew numbers manually]
        |
        v
[Fill metadata form: name, industry, theme, content_type, is_premium]
[content_type determines canvas aspect ratio — see §5]
        |
        v
[Validation: preset names are valid (exist in design_system.json), required fields
 filled, at least 1 element with bind:"headline" exists (per TEMPLATE_AUTHORING.md §4 & §9)]
        |
        v
["Seed to DB" button — only enabled if validation passes]
        |
        v
[Seeding process (file-first, see §6): write JSON file to seed_template_data/,
 then run the same seed function used by the current CLI command]
        |
        v
[Template is immediately LIVE — appears in the main AI-GT template list]
```

---

## 4. Draft Handling

- Drafts **never enter the main `templates` table**. While editing in Template Lab (before clicking
  "Seed to DB"), state is stored separately — not part of production data.
- **Storage: a separate DB table** (`template_drafts`), not localStorage. Reason: localStorage is tied to a
  single browser/device — risk of data loss when switching devices/clearing cache, disproportionate to the
  effort saved. A separate table also preserves the principle "drafts are structurally separate from live
  data" — not just distinguished by a flag/filter, so a draft can never leak into the main template list due
  to a missed filter somewhere.
  - Minimum columns: `id`, `template_config` (JSONB), metadata fields (§5), `created_at`, `updated_at`.
- Drafts are **only visible/accessible from within Template Lab** (a "My Drafts" tab or similar) — never
  mixed into or filtered from the main template list, because they structurally live in a different table.
- Once "Seed to DB" is clicked, there's no "half-live" state — the seed process (§6) reads from
  `template_drafts`, inserts into `templates` (live), and writes the JSON file to `seed_template_data/`. The
  related draft can be deleted from `template_drafts` after a successful seed (optional, keeps the drafts
  table lean).
- Implication: Template Lab MVP needs **List + Resume draft** capability, even though editing an
  already-live template is explicitly out of scope for this MVP (see §7).

---

## 5. Metadata & Aspect Ratio

The metadata form is filled separately from the JSON editor (not derived from the JSON), fields per
`TEMPLATE_AUTHORING.md` §7:

| Field | Value source |
|---|---|
| `name` | Manual input |
| `industry` | Manual input / dropdown |
| `theme` | Manual input / dropdown |
| `content_type` | Dropdown — MVP only has `instagram_post` active (locked to aspect 4:5) |
| `is_premium` | Toggle |

Note: `thumbnail_url` and `background_url` are **intentionally left empty** at this stage — uploaded by the
admin per-row after the template goes live (existing behavior, see TEMPLATE_AUTHORING.md §7).

**Aspect ratio is determined by `content_type`, not manually chosen.** MVP only exposes one option
(`instagram_post` → `canvas.aspect: "4:5"`), but the mapping implementation should be generic
(`content_type → canvas config`) so adding other platforms later (IG story, etc.) is just adding a mapping
entry, not a refactor.

---

## 6. Seeding — File-First

To stay consistent with the existing source of truth (the `seed_template_data/` folder, which is
git-committed and reproducible), the "Seed to DB" action does **not** insert directly into the DB from the
UI. The flow is:

1. Write a new JSON file to `backend/scripts/seed_template_data/` (exact same format as
   `TEMPLATE_AUTHORING.md` — including optional `_meta`, DB row fields, `template_config`).
2. Trigger the same seed function currently invoked via the CLI command (reuse, not reimplement),
   including the preset resolution process from `design_system.json` (`design_system.py`).
3. This seed function is what inserts into the DB — not a separate insert path.

Effect: no manual seeder command needs to be run, but there's still a single source of truth (the JSON
file), and it still goes through the existing preset-resolution pipeline — no new logic needs to be built
to resolve presets in this path.

---

## 7. Explicitly Out of Scope for MVP (Phase 2+)

To avoid over-building, the following is **intentionally not built** in this MVP:

- Interactive canvas: drag position, resize, manual rotate via mouse
- Editing already-live templates (MVP is create-new only)
- Separate publish/unpublish toggle (not relevant — see §4, seeding = immediately live)
- Multiple aspect ratios / multiple active content_types (only `instagram_post` for now)
- Role/permission system (env flag is sufficient for MVP)
- Full admin panel (template management UI beyond Template Lab)

---

## 8. References

- `TEMPLATE_AUTHORING.md` — rules for `template_config` structure, elements, `role` vs `bind`,
  `brand_theme`, Tier 1 design-system presets
- `design_system.json` — preset library (palette, background, brand_theme, text_styles) referenced by
  templates by name