# AI-GT MVP Recommendation

## Recommended MVP

### Core Product Definition

AI-GT should focus on one clear job:

> **Help Indonesian small businesses turn a simple marketing intention into one editable, branded social-media marketing visual.**

For the MVP, one generation should produce:

**1 generation = 1 editable marketing visual**

The generated result should combine:

- A professionally designed template
- AI-generated marketing copy
  - Headline
  - Body
  - CTA
- The user's brand identity
  - Logo
  - Brand colors
  - Font
  - Tagline
  - Contact information
- An optional AI-generated thematic image
- An editable project that can be exported as PNG

### Core MVP User Flow

```text
Register / Login
    ↓
Set Up Business Profile
    ↓
Create
    ↓
Choose Marketing Goal
    ↓
(Platform: dikunci Instagram Feed 4:5 — P1-4c)
    ↓
Choose Template
    ↓
Enter Short Marketing Brief
    ↓
Generate
    ↓
Edit Result
    ↓
Export PNG
```

### Core User Problem

The MVP should solve this problem:

> "I know what I want to promote, but I don't know how to turn it into a professional-looking social-media post."

Examples:

- Promote a product
- Announce a discount
- Launch a new product
- Share business information
- Promote an event
- Create a seasonal greeting
- Build brand awareness

### MVP Product Boundary

For the MVP, AI-GT should **not** try to become:

- A full social-media management platform
- A social scheduling platform
- A campaign-management suite
- A full Canva replacement
- A general-purpose AI image generator
- A marketing analytics platform

The priority should be making the **single-content generation workflow** fast, reliable, and useful enough that users repeatedly return when they need something to post.

---

## Feature Scope — What to Keep and What to Remove

| Feature | Decision | Recommendation |
|---|---|---|
| Company / Brand Profile | ✅ Keep | Core differentiator. Keep business name, logo, colors, fonts, tagline, and relevant contact information. |
| Onboarding | ✅ Keep, simplify | Keep only fields that are actually persisted or actively used by generation/rendering. Remove unused questions. **Selesai 2026-09-11 (P2-1):** Kota, Deskripsi, Gaya bahasa, Target audiens, dan switch platform dihapus; "Bahasa konten" disambungkan ke `language_preference`. |
| Template Gallery | ✅ Keep | Core part of the product. Templates protect visual quality and reduce design effort. |
| Brand Preview on Templates | ✅ Keep | Helps users understand how a design will look with their own branding before generation. |
| Goal Selection | ✅ Keep | Useful context for AI generation and easier for users than writing detailed prompts. |
| Platform Selection | ✅ Keep, fix | Keep it, but make it affect template recommendations/filtering and output behavior. **Diputuskan 2026-10-21 (P1-4c):** dikunci ke **Instagram Feed (4:5)** untuk MVP — langkah pilih platform dihapus, backend hanya menerima `instagram_feed`. Platform lain dibuka lagi bersama template & canvas per rasio (P1-4b). |
| Quick Generate | ✅ Keep — Core MVP | This should be the main product experience: one brief → one editable branded marketing visual. |
| Short Marketing Brief | ✅ Keep | Keep product/service, key message, promo details, notes, and language style. Avoid making the form too complex. |
| AI Copy Generation | ✅ Keep | Core generated output. Copy is more important than optional image generation. |
| AI Image Generation | ✅ Keep, secondary | Useful enhancement, but should remain optional and should not block generation when it fails. |
| User Image Upload in Create | ✅ Keep | **Dikoreksi 2026-09-11:** sudah lengkap end-to-end — `POST /api/v1/generate/upload-image` → R2 `uploads/{user_id}/{uuid}.png`, ada test `test_content_image_upload.py` & `test_uploaded_image_flow.py`. |
| Editor | ✅ Keep | Users need a lightweight way to adjust generated copy, typography, image, and final composition. |
| Autosave | ✅ Keep | Important for protecting user work and supporting repeat usage. |
| Project History / Library | ✅ Keep | Users need to reopen, edit, rename, delete, and reuse previous work. **Rename ditambahkan 2026-09-11 (P2-4).** |
| PNG Export / Download | ✅ Keep | This is the completion point of the current MVP workflow. |
| Settings / Brand Management | ✅ Keep | Needed for users to update company information and branding. |
| Email Verification | ✅ Dibereskan | **2026-09-11 (B-1a):** syarat verifikasi dicabut untuk MVP — `register_user()` set `is_verified=True`, gate `AUTH_EMAIL_NOT_VERIFIED` dihapus dari `login_user()`, register mengembalikan token (auto-login). Verifikasi email penuh ditunda (B-1b). |
| Carousel Story Flow | ❌ Remove from MVP | UI exists but the backend currently rejects the flow. Do not expose a feature that is not end-to-end usable. **Selesai 2026-09-11 (P1-2a):** dihapus dari Create; sisa cabang di editor/prompt backend menunggu P1-2b. |
| Campaign | ❌ Hide for now | Premium/campaign behavior is not fully implemented and the product requirements conflict with current backend behavior. **Selesai 2026-09-11 (P1-1a):** item nav + badge HOT dihapus, `/campaign` redirect ke `/create`. |
| Schedule | ❌ Hide | No real scheduling backend exists. It also expands AI-GT into a broader social-management product too early. **Selesai 2026-09-11 (P1-3):** route `/schedule` dihapus. |
| Billing | ✅ Keep | **Dikoreksi 2026-09-11:** entitlement sudah nyata — `assert_generate_quota()` melempar 429 `RATE_LIMIT_EXCEEDED` saat kuota habis. Menyembunyikan UI-nya membuat user Starter buntu di generate ke-21 tanpa jalan upgrade. |
| Payment | ✅ Keep | **Dikoreksi 2026-09-11:** transfer manual sudah berjalan — order + upload bukti transfer + aktivasi. Bukan payment gateway otomatis, tapi end-to-end dan dipakai. |
| Subscription | ✅ Keep | **Dikoreksi 2026-09-11:** bukan lagi presentasional — katalog paket di `billing_plans.py`, kuota ditegakkan di backend. |
| Hardcoded Plan / Quota UI | ✅ Keep | **Dikoreksi 2026-09-11:** kuota yang ditampilkan berasal dari `compute_usage()`, bukan angka hardcoded. |
| Notification Settings | ❌ Hide | Hide unless notifications actually exist and have a meaningful user-facing use case. **Selesai 2026-09-11 (P2-2):** section Notifikasi dihapus dari Settings. |
| Password Change UI | ✅ Keep | **Dikoreksi 2026-09-11:** sudah fungsional — `POST /api/v1/auth/change-password` terhubung ke UI Settings. |
| Delete Account UI | ✅ Keep | **Dikoreksi 2026-09-11:** `DELETE /api/v1/auth/me` menghapus Project, Variant, Session, CompanyProfile, Subscription, PaymentOrder, User secara FK-safe; file R2 milik user ikut dibersihkan (P2-5, `storage_service.delete_user_files()`). |
| Template Lab | 🔵 Future internal tool | Keep as a future internal operations tool, not as part of the customer MVP. **Selesai 2026-10-22 (A-6):** dibangun sebagai bagian Admin Panel (`/admin/templates`), bukan fitur user. |
| Social Publishing | ❌ Do not add to MVP | Let users download the visual first. Publishing integrations can be evaluated after the core generation workflow is validated. |
| Analytics | ❌ Do not add to MVP | Does not improve the current core job enough to justify the added product and engineering complexity. |

---

## Recommended MVP Navigation

```text
Dashboard

Create
├── Goal (platform: Instagram Feed)
├── Choose Template
├── Marketing Brief
└── Generate

Editor
├── Edit Copy
├── Edit Typography
├── Edit / Generate Image
└── Export

Projects
└── Previous Content

Brand / Settings
├── Business Information
├── Logo
├── Colors & Font
├── Tagline
└── Contact Information

Account
```

### Hide from MVP Navigation

```text
Campaign
Carousel
Schedule
Non-functional notifications
```

> **Dikoreksi 2026-09-11.** Billing, Payment, Subscription, kuota/plan UI, ubah password, dan hapus akun
> **dikeluarkan dari daftar ini** — keenamnya sudah fungsional. Khusus Billing: kuota sudah ditegakkan di
> backend, jadi menyembunyikan UI-nya justru membuat user buntu tanpa jalan upgrade.
> Rincian: lihat `docs/MVP_AUDIT_TODO.md` §1.2.

---

## MVP Success Criteria

Before expanding AI-GT into campaigns, scheduling, or a broader marketing platform, the MVP should prove that users can repeatedly do this:

> **Set up their brand once → describe what they want to promote → generate a good-looking branded visual → make small edits → export it.**

The key product question is not how many features AI-GT has.

It is:

> **Can AI-GT make producing one useful social-media marketing visual significantly easier than using a generic design tool and AI assistant separately?**

If the answer becomes yes, then Campaign, premium workflows, scheduling, and other extensions have a much stronger foundation.
