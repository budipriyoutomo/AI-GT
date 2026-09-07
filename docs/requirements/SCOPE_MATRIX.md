# Scope Matrix

This matrix is necessary because the repository contains materially different and conflicting scopes: current Quick Generate, proposed/gated Campaign, and proposed Template Lab phases. A later document does not automatically replace an earlier one.

| Capability | Current Quick Generate | Campaign / premium proposal | Template Lab MVP / Phase 2 | Current implementation evidence |
|---|---|---|---|---|
| Goal + platform | Required input | Campaign context | Not applicable | Implemented in `CreateSessionRequest` and `/create`. |
| Template selection | One template per content | Template anchors a campaign/series | Authoring new templates | Implemented gallery/detail; no server platform filter. Current seed inventory is 10 `instagram_post` rows; no seeded Carousel row. |
| Single content generation | Introduced and supported | May be one unit in a series | Not applicable | Implemented; quick session auto-creates a project. |
| Variants | First generated variant auto-selected | Multi-content and A/B variants proposed | Not applicable | Quick behavior implemented; selection endpoint remains but campaign is gated. |
| Carousel/story flow | UI exposes it | Core premium series concept | Not applicable | **Blocked:** UI sends `campaign_data`; backend returns 403. |
| Seasonal moments / narrative arc / calendar | Not in supported path | Proposed | Not applicable | Not implemented as persisted backend domain. |
| AI copy / optional AI image | Supported; image failure tolerated | Intended to extend | Vision draft proposed for template creation | Copy/image provider path implemented. |
| User-uploaded thematic image | Declared option | Declared option | Reference-image upload for authoring | **Partial:** UI file selection only; no create-flow storage/upload contract. |
| Company profile branding | Supported, opt-in by `brand_applied` | Expected to remain | Preview test surface | Implemented shared resolver and live profile rendering. |
| Projects/editor/export PNG | Supported | Intended per content | Not applicable | Implemented core editor/project/export APIs. |
| Billing / entitlements | Not implemented | Needed to unlock premium | Not applicable | Screens exist, no backend entitlement/payment system. |
| Internal template JSON editing | Manual committed JSON | Unchanged | MVP proposed; WYSIWYG is Phase 2 | Not implemented; file-first seed workflow exists. |

## Explicit Scope Conflicts

1. **PRD vs backend:** `docs/PRD-AI-GT-v2-synced.md` treats carousel story flow as current MVP, but `backend/app/services/generate_service.py` rejects all non-null `campaign_data` as premium.
2. **Flow document vs PRD:** `FlowGenerate.md` preserves a distinct Quick Generate/Campaign product split and has placeholder/open decisions; the synced PRD says the flow was unified. Code currently behaves closer to the split for backend gating.
3. **Template Lab terminology:** `docs/template_lab_spec.md` calls its JSON/live-preview tool “MVP v1,” but this is the Template Lab’s proposed internal MVP, not AI-GT’s customer MVP.
4. **Worktree status:** three template JSON files are untracked, so the 10-row inventory includes files that are not part of the committed branch yet.

Consult `CURRENT_STATE.md` before describing campaign, carousel, billing, or Template Lab as available.
