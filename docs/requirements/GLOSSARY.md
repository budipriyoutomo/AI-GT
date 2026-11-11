# Glossary

## AI-GT

**Meaning:** The product name: AI Content Generator Tools, a marketing-visual generator for Indonesian small and medium businesses.

**Used in:** All product domains.

**Source:** `README.md`, `docs/PRD-AI-GT-v2-synced.md`.

## UKM / SMB

**Meaning:** Indonesian small and medium business; the primary customer segment. SMB is the English equivalent used in product documentation.

**Used in:** Target-user and positioning discussions.

**Source:** `docs/PRD-AI-GT-v2-synced.md`.

## Company Profile

**Meaning:** One business-brand record per user: business identity, brand assets, contact data, and language preference used to personalize new content.

**Used in:** Onboarding, Settings, template rendering, generation.

**Technical representation:** `company_profiles`; `CompanyProfile`; `CompanyProfileData`.

**Source:** `docs/TECHNICAL_DOCUMENTATION.md` §5.

## Brand Applied / Branded

**Meaning:** The user’s choice to render a template with their complete company profile rather than the generic default profile. It includes colors, font, logo, tagline, and footer contact together.

**Used in:** Template preview, Create, editor, export.

**Technical representation:** `final_config.brand_applied`; `resolveTemplateConfig(... branded)`.

**Source:** `AGENTS.md` §6; `docs/PRD-AI-GT-v2-synced.md` §4.2.

## Template Integrity

**Meaning:** The rule that template geometry, background, and authored visual identity are protected from AI and backend mutation. AI fills designated content slots only.

**Used in:** Template creation, generation, rendering, editor constraints.

**Technical representation:** immutable `template_config`; compiled copy brief.

**Source:** `AGENTS.md` §6; `backend/scripts/seed_template_data/README.md`.

## Template Config

**Meaning:** Normalized JSON definition of a reusable visual template: canvas, palette, fonts, brand-theme rules, and ordered elements.

**Used in:** Template seeding, gallery preview, Fabric editor, project final config.

**Technical representation:** `templates.template_config`; seed JSON files under `backend/scripts/seed_template_data/`.

**Source:** `backend/scripts/seed_template_data/README.md`.

## Thumbnail URL / Background URL

**Meaning:** Two separate template asset roles. `thumbnail_url` is the gallery/foreground image; `background_url` is the full-bleed background image. They are not interchangeable.

**Used in:** Template gallery, preview, editor, export, and template seeding.

**Technical representation:** `Template.thumbnail_url`, `Template.background_url`; `template_config.background.source`.

**Source:** `backend/scripts/seed_template_data/README.md`; `backend/scripts/seed_templates.py`.

## Copy Intent

**Meaning:** A template’s communication purpose—`promotion`, `story`, or `brand`—which controls AI writing guidance and default slot length limits. It is distinct from visual theme.

**Used in:** Template authoring and copy-prompt compilation.

**Technical representation:** `templates.copy_intent`.

**Source:** `backend/scripts/seed_template_data/README.md` §7.

## Role and Bind

**Meaning:** `role` is a freely named visual/text role (for example, eyebrow or caption); `bind` is a fixed AI-fill slot: `headline`, `body`, or `cta`. They are independent.

**Used in:** Text elements in template configuration.

**Technical representation:** `template_config.elements[].role` / `.bind`.

**Source:** `backend/scripts/seed_template_data/README.md` §4.

## Brand Theme

**Meaning:** Per-template declaration of which visual color/font roles may adapt to a company brand. `tint` adapts selected accents; `derive` derives a controlled palette from one brand color.

**Used in:** Branded template previews and export parity.

**Technical representation:** `template_config.brand_theme`.

**Source:** `backend/scripts/seed_template_data/README.md` §5.

## Content Type

**Meaning:** The format/aspect category assigned to a template, currently represented inconsistently as values such as `instagram_post` and UI labels such as `Single` or `Carousel`.

**Used in:** Template metadata, Create flow, carousel branching, and editor behavior.

**Technical representation:** `Template.content_type`; frontend `TemplateListItem.content_type` and `ProjectCopy.content_type`.

**Source:** `backend/app/models/template.py`; `frontend/src/app/create/page.tsx`; `backend/scripts/seed_template_data/*.json`.

## Goal and Platform

**Meaning:** Required direction selected before a quick generation. Goals are awareness, engagement, conversion, launch, or promo; platforms are Instagram Feed/Story, Facebook, or TikTok.

**Used in:** Create funnel and AI copy context.

**Technical representation:** `GenerateSession.goal`, `.platform`.

**Source:** `docs/PRD-AI-GT-v2-synced.md` §4.4; `backend/app/schemas/generate.py`.

## Language Style

**Meaning:** Requested copy tone: `formal`, `casual`, `persuasive`, `fun_playful`, or `inspiratif`.

**Used in:** Brief completion and AI copy/typography generation.

**Technical representation:** `GenerateSession.language_style`.

**Source:** `docs/PRD-AI-GT-v2-synced.md` §4.3.

## Thematic Image

**Meaning:** Optional foreground image associated with a generated visual; it does not replace a template background.

**Used in:** AI generation, editor, storage lifecycle.

**Technical representation:** `GenerateVariant.thematic_image_url`, `Project.final_config.thematic_image_url`.

**Source:** `AGENTS.md` §§5, 7.

## AI Copy Provider / AI Image Provider

**Meaning:** Separate external services used for text/typography and optional imagery. Copy is the primary output; image generation is best-effort.

**Used in:** Generation, image suggestions, and editor image regeneration.

**Technical representation:** provider protocols under `backend/app/services/providers/`; selected by `AI_COPY_PROVIDER` and `AI_IMAGE_PROVIDER`.

**Source:** `AGENTS.md` §5; `docs/TECHNICAL_DOCUMENTATION.md` §9.

## Cloudflare R2

**Meaning:** S3-compatible object storage used for temporary and permanent generated assets, logos, thumbnails, and exports.

**Used in:** Logo upload, image lifecycle, autosave, and export.

**Technical representation:** `backend/app/services/storage_service.py`; root-relative persisted paths.

**Source:** `AGENTS.md` §7; `docs/TECHNICAL_DOCUMENTATION.md` §10.

## Template Seed

**Meaning:** The process that reads committed template JSON, expands optional design-system presets, and synchronizes template rows in PostgreSQL.

**Used in:** Template authoring and deployments.

**Technical representation:** `backend/scripts/seed_templates.py`, `backend/scripts/seed_template_data/`, `backend/scripts/design_system.json`.

**Source:** `README.md`; `backend/scripts/seed_template_data/README.md`.

## Generate Session Status

**Meaning:** `processing` means background generation is running; `completed` means output is available; `failed` means copy generation failed. Expiry is a separate one-hour business rule.

**Used in:** Polling, retry/error UX, project creation, and temp-asset cleanup.

**Technical representation:** `GenerateSession.status`, `expires_at`.

**Source:** `docs/TECHNICAL_DOCUMENTATION.md` §8; `backend/app/services/generate_service.py`.

## Draft / Exported Project

**Meaning:** UI labels for a project before and after a successful export. A project can be edited and autosaved before export.

**Used in:** Dashboard, history, editor.

**Technical representation:** `Project.is_exported`, `thumbnail_url`, `exported_image_url`.

**Source:** `frontend/src/app/{dashboard,history,editor}/page.tsx`.

## Generate Session

**Meaning:** Persisted, time-limited request lifecycle for producing AI content. It progresses from `processing` to `completed` or `failed`.

**Used in:** Generation polling, cleanup, variant/project creation.

**Technical representation:** `generate_sessions`; default TTL one hour.

**Source:** `docs/TECHNICAL_DOCUMENTATION.md` §§5, 8.

## Generate Variant

**Meaning:** A generated copy/typography/image candidate within a session. The current quick path auto-selects its first variant.

**Used in:** Generation output and project creation.

**Technical representation:** `generate_variants`.

**Source:** `backend/app/services/generate_service.py`.

## Project / Final Config

**Meaning:** The saved editable marketing asset created from a selected/auto-selected variant. `final_config` combines copy, typography, template configuration, image state, and brand intent.

**Used in:** Editor, autosave, history, PNG export.

**Technical representation:** `projects.final_config`.

**Source:** `docs/TECHNICAL_DOCUMENTATION.md` §5.

## Quick Generate

**Meaning:** Current supported single-content generation path. It uses `campaign_data = null`, auto-selects the first result, and creates a Project.

**Used in:** Main Create → Generate journey.

**Technical representation:** `generate_service._auto_select_first_variant()`.

**Source:** `backend/app/services/generate_service.py`.

## Campaign

**Meaning:** Proposed premium multi-content/narrative workflow with campaign data, seasonal context, and potentially multiple variants.

**Used in:** Future premium-product planning; Create’s carousel UI currently overlaps with it.

**Technical representation:** non-null `campaign_data`; currently rejected with `FEATURE_REQUIRES_PREMIUM`.

**Source:** `FlowGenerate.md`; `backend/app/services/generate_service.py`.

## Carousel Story Flow

**Meaning:** A planned/partially surfaced sequence structure for carousel slides, such as problem-solution, feature highlights, or step-by-step.

**Used in:** Create UI and planned campaign behavior.

**Technical representation:** frontend `CarouselSettings`; non-null `campaign_data`.

**Source:** `docs/PRD-AI-GT-v2-synced.md`; `frontend/src/app/create/page.tsx`.

## Footer Contact / Location

**Meaning:** Template footer values sourced from business contact fields. Address maps only to the `location` slot at render time.

**Used in:** Template preview and exported canvas.

**Technical representation:** `buildFooterContact()`; `CompanyProfile.contact` and `.address`.

**Source:** `AGENTS.md` §6.

## Template Lab

**Meaning:** Proposed internal, environment-flag-gated tool for drafting template JSON with a live production-renderer preview and file-first seeding.

**Used in:** Internal template operations; not customer-facing and not implemented.

**Source:** `docs/template_lab_spec.md`.
