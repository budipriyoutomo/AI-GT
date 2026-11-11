# AI-GT — Audit MVP Recommendation & To-Do List

Audit kode aktual (branch `dev`) terhadap `AI-GT_MVP_Recommendation.md`.
Awalnya hanya temuan + daftar tugas untuk dipilih; sejak itu sebagian sudah dikerjakan.
Status per temuan ditandai di §1.3 (✅ Ditutup / ⏳ Terbuka), status tugas di Bagian 2 & 3.

> **Status per 2026-10-22:** semua Blocker, Prioritas 1 (P1-4 → P1-4c), Prioritas 2, dan Prioritas 3 selesai.
> Admin Panel: semua selesai (A-6 selesai 2026-10-22).

---

## Bagian 1 — Hasil Audit

### 1.1 Sudah Sesuai Rekomendasi (tidak perlu dikerjakan)

| Fitur (rekomendasi) | Status aktual | Bukti |
|---|---|---|
| Company / Brand Profile | ✅ Lengkap — model, CRUD, upload logo | [company_profile.py](backend/app/models/company_profile.py), [company_profile.py](backend/app/routers/company_profile.py) |
| Template Gallery | ✅ Lengkap — 7 template ter-seed | [templates.py](backend/app/routers/templates.py), [seed_template_data/](backend/scripts/seed_template_data/) |
| Brand Preview on Templates | ✅ Ada toggle + resolver tunggal | [resolve.ts](frontend/src/lib/template/resolve.ts) |
| Goal Selection | ✅ 5 goal, dikirim ke prompt AI | [create/page.tsx](frontend/src/app/create/page.tsx) |
| Quick Generate = 1 hasil editable | ✅ Auto-select varian → Project langsung | [generate_service.py:404-408](backend/app/services/generate_service.py#L404-L408) |
| Short Marketing Brief | ✅ product, key_message, promo, notes, language_style | [generate.py](backend/app/schemas/generate.py) |
| AI Copy Generation | ✅ Lewat `ai_service.py`, model dari env | [ai_service.py](backend/app/services/ai_service.py) |
| AI Image opsional, tidak menggagalkan session | ✅ Hanya `CopyError` yang men-set status `failed` | [generate_service.py:375-381](backend/app/services/generate_service.py#L375-L381) |
| Editor | ✅ Fabric canvas, edit copy/typo/image | [editor/page.tsx](frontend/src/app/editor/page.tsx) |
| Autosave | ✅ `useAutoSave` + Ctrl+S + auto-thumbnail | [editor/page.tsx:328](frontend/src/app/editor/page.tsx#L328) |
| Project History | ✅ List, buka, hapus, export | [history/page.tsx](frontend/src/app/history/page.tsx) |
| PNG Export | ✅ Download + simpan ke R2 `permanent/exported/` | [editor/page.tsx:370-423](frontend/src/app/editor/page.tsx#L370-L423) |
| Settings / Brand Management | ✅ Lengkap | [settings/page.tsx](frontend/src/app/settings/page.tsx) |

### 1.2 Klaim di Rekomendasi yang Sudah Usang (dokumen perlu dikoreksi)

Empat poin di `AI-GT_MVP_Recommendation.md` sudah tidak akurat terhadap kode sekarang:

| Klaim dokumen | Fakta di kode |
|---|---|
| "User Image Upload — ⚠️ flow belum lengkap, sembunyikan" | **Sudah lengkap end-to-end.** Endpoint `POST /api/v1/generate/upload-image` → R2 `uploads/{user_id}/{uuid}.png` → `uploaded_image_url` ikut saat create session. Ada test: `test_content_image_upload.py`, `test_uploaded_image_flow.py`. Lihat [generate.py:24-33](backend/app/routers/generate.py#L24-L33) |
| "Password Change UI — ❌ sembunyikan, belum fungsional" | **Sudah fungsional.** `POST /api/v1/auth/change-password` terhubung ke UI Settings. Lihat [auth.py:54](backend/app/routers/auth.py#L54), [auth.tsx:166](frontend/src/lib/auth.tsx#L166) |
| "Delete Account UI — ❌ sembunyikan, lifecycle belum jelas" | **Sebagian fungsional.** `DELETE /api/v1/auth/me` menghapus Project, Variant, Session, CompanyProfile, Subscription, PaymentOrder, User secara FK-safe. ~~Yang kurang: file di R2 tidak ikut dihapus.~~ ✅ Sudah dibereskan di P2-5. Lihat [auth_service.py:91-116](backend/app/services/auth_service.py#L91-L116) |
| "Subscription/Billing — layar presentasional, entitlement belum nyata" | **Entitlement sudah nyata.** `assert_generate_quota()` melempar `429 RATE_LIMIT_EXCEEDED` saat kuota habis; katalog paket di `billing_plans.py`; order + upload bukti transfer + aktivasi jalan. Lihat [billing_service.py:60-73](backend/app/services/billing_service.py#L60-L73) |

> ⚠️ **Konsekuensi penting:** rekomendasi "sembunyikan Billing/Subscription/Payment" **bertabrakan** dengan kuota yang sudah ditegakkan di backend. Kalau UI billing disembunyikan tapi `assert_generate_quota` tetap aktif, user Starter kena 429 di generate ke-21 **tanpa ada jalan upgrade**. Harus dipilih salah satu (lihat To-Do **B-2**). ✅ Diputuskan: **B-2a** (billing tetap tampil).

### 1.3 Belum Sesuai — Temuan Nyata

#### 🔴 P0 — Blocker

**T-1. Verifikasi email buntu total. Registrasi baru tidak bisa login.** — ✅ **Ditutup oleh B-1a** (temuan di bawah adalah kondisi saat audit)

- `register_user()` selalu set `is_verified=False` — [auth_service.py:41](backend/app/services/auth_service.py#L41)
- `login_user()` menolak user yang `is_verified=False` dengan `AUTH_EMAIL_NOT_VERIFIED` — [auth_service.py:70-71](backend/app/services/auth_service.py#L70-L71)
- **Tidak ada satu pun kode yang men-set `is_verified=True`.** Tidak ada endpoint verify, tidak ada token verifikasi, tidak ada SMTP/SendGrid/Resend/Mailgun di seluruh `backend/`.
- Frontend `register()` men-set state user tapi **tidak menerima token** — UI terlihat "masuk", tapi semua panggilan API berikutnya 401. [auth.tsx:108-122](frontend/src/lib/auth.tsx#L108-L122)

Artinya: user baru hanya bisa dipakai kalau kolom `is_verified` diubah manual lewat SQL.

#### 🟠 P1 — Fitur dipajang tapi tidak jalan

**T-2. Carousel — UI aktif, backend menolak, dan tidak ada template-nya.** — ✅ **Ditutup oleh P1-2a** (UI Create bersih; sisa cabang carousel di editor/prompt menunggu P1-2b)

- Create page mengirim `campaign_data` saat template ber-`content_type: "Carousel"` — [create/page.tsx:338-345](frontend/src/app/create/page.tsx#L338-L345)
- Backend menolak semua `campaign_data != null` dengan `403 FEATURE_REQUIRES_PREMIUM` — [generate_service.py:50-56](backend/app/services/generate_service.py#L50-L56)
- Tapi **tidak ada satu pun template carousel di seed** — ke-7 JSON semuanya `"content_type": "instagram_post"`. Jadi jalur ini secara praktis mati, tapi kodenya tersebar di `types/project.ts`, `create/page.tsx`, `editor/page.tsx`, `copy_prompt.py`, `anthropic_copy.py`, `deepseek_copy.py`.
- Filter format "Single/Carousel" di galeri sudah disembunyikan sebagian — [templates/page.tsx:225](frontend/src/app/templates/page.tsx#L225) — tapi masih ada di picker Create ([create/page.tsx:69](frontend/src/app/create/page.tsx#L69)).

**T-3. Campaign — nav ditandai "HOT", tapi hasilnya identik Quick Generate.** — ✅ **Ditutup oleh P1-1a** (`/campaign` → redirect `/create`)

- Halaman 536 baris mengumpulkan momen (Ramadan, Lebaran, …), narrative arc beats, dan jumlah konten.
- `handleContinue()` **membuang semua itu** dan hanya push `goal` + `platform` ke `/templates` — [campaign/page.tsx:111-116](frontend/src/app/campaign/page.tsx#L111-L116)
- Nav-nya justru item paling menonjol di sidebar (gradient + badge "HOT" + shimmer) — [sidebar.tsx:113-210](frontend/src/components/shell/sidebar.tsx#L113-L210)

**T-4. Schedule — 100% data dummy hardcoded.** — ✅ **Ditutup oleh P1-3** (route dihapus)

- Array `SCHEDULED` 9 item statis, tanggal 2026, tidak ada model/tabel/endpoint apapun — [schedule/page.tsx:26-36](frontend/src/app/schedule/page.tsx#L26-L36)
- Tidak ada di sidebar nav, **tapi route `/schedule` tetap hidup** dan bisa diakses langsung lewat URL.

**T-5. Platform selection tidak mempengaruhi apa-apa selain prompt.** — ✅ **Ditutup oleh P1-4c** (dikunci ke Instagram Feed)

- Di galeri template hanya ditampilkan sebagai badge konteks, **tidak memfilter** — [templates/page.tsx:206-211](frontend/src/app/templates/page.tsx#L206-L211)
- Tidak ada perbedaan rasio/ukuran output antar platform. Semua template `instagram_post`.
- Rekomendasi meminta ini "Keep, **fix**" — belum di-fix.

#### 🟡 P2 — UI yang menipu (tampil tapi tidak menyimpan)

**T-6. Onboarding: 4 field tidak pernah tersimpan.** — ✅ **Ditutup oleh P2-1**

Di [onboarding/page.tsx](frontend/src/app/onboarding/page.tsx):

| Field | Baris | Masalah |
|---|---|---|
| Kota | 89 | `defaultValue="Bandung"`, tanpa state, tanpa kolom DB |
| Target audiens | 191 | `Select` tanpa `value`/`onChange`, tanpa kolom DB |
| Gaya bahasa (tone) | 190 | Punya state `tone`, tapi `company_profiles` tidak punya kolom tone |
| Platform switches (IG/WA/TikTok/FB) | 196-199 | `defaultChecked` saja, tidak pernah dikirim |

Kolom yang benar-benar ada: `business_name`, `industry`, `logo_url`, `brand_colors`, `brand_font`, `tagline`, `address`, `contact`, `language_preference` — [company_profile.py:18-26](backend/app/models/company_profile.py#L18-L26)

**T-7. Notification Settings — Switch tanpa state, tanpa persist.** — ✅ **Ditutup oleh P2-2**

3 toggle (`Generate selesai`, `Jadwal tayang`, `Tips & pembaruan`) hanya `defaultChecked`, tidak ada handler, tidak ada penyimpanan. Satu di antaranya ("Jadwal tayang") mengacu ke fitur Schedule yang sendirinya dummy — [settings/page.tsx:388-404](frontend/src/app/settings/page.tsx#L388-L404)

**T-8. Badge "12" di nav Riwayat hardcoded.** — ✅ **Ditutup oleh P2-3**

`badge: "12"` literal di konstanta NAV, tidak pernah diambil dari jumlah project asli — [sidebar.tsx:21](frontend/src/components/shell/sidebar.tsx#L21)

**T-9. History tidak punya aksi Rename.** — ✅ **Ditutup oleh P2-4**

Rekomendasi menyebut "reopen, edit, **rename**, delete". API-nya sudah ada (`PATCH /api/v1/projects/{id}` — [projects.py:37](backend/app/routers/projects.py#L37)) tapi UI History hanya punya buka + hapus.

**T-10. Delete account tidak membersihkan file R2.** — ✅ **Ditutup oleh P2-5**

Baris DB terhapus, tapi `permanent/thematic-images/{user_id}/`, `permanent/exported/{user_id}/`, `permanent/logos/{user_id}/`, `permanent/uploads/{user_id}/`, `permanent/payment-proofs/{user_id}/` tetap tertinggal di bucket.

#### 🔵 Catatan

**T-11. Template Lab belum ada.** — ✅ **Ditutup oleh A-6** Hanya spesifikasi di [docs/template_lab_spec.md](docs/template_lab_spec.md), belum ada implementasi. Rekomendasi sudah benar menaruhnya sebagai "future internal tool" — dan ini cocok dijadikan bagian dari Admin Panel (lihat A-6).

**T-12. Pesan Contact masuk ke DB tapi tidak bisa dibaca siapapun.** — ✅ **Ditutup oleh A-7** Model `contact_message` ada, `POST /api/v1/contact` ada, **tidak ada GET sama sekali**. Pesan user masuk ke lubang hitam sampai ada admin panel (lihat A-7).

---

## Bagian 2 — To-Do List (Produk / MVP)

> Setiap item wajib mengikuti TDD (`AGENTS.md` §3): tulis test failing dulu, baru implementasi.

### 🔴 Blocker — harus dipilih sebelum rilis

- [x] **B-1. Putuskan nasib email verification** — dipilih **B-1a**. ✅ Selesai.
  - [x] **B-1a. Jalur cepat:** hapus gate `is_verified` di `login_user()` + set `is_verified=True` saat register + register mengembalikan token (auto-login). *Est: S*
  - [ ] **B-1b. Jalur lengkap:** tabel/kolom token verifikasi + endpoint `POST /auth/verify-email` + `POST /auth/resend-verification` + provider email (Resend/SMTP) + halaman `/verify-email` di frontend. *Est: L*
- [x] **B-2. Putuskan nasib Billing/Subscription** — dipilih **B-2a**. ✅ Selesai.
  - [x] **B-2a. Tetap tampil** (rekomendasi kontra doc, karena kuota sudah ditegakkan) — biarkan apa adanya, cukup rapikan copywriting. *Est: XS*
  - [ ] **B-2b. Sembunyikan** — **wajib** sekalian menonaktifkan `assert_generate_quota()` atau set `generate_limit: -1` untuk plan starter, supaya user tidak buntu di generate ke-21. *Est: S*

### 🟠 Prioritas 1 — Fitur yang menipu user

- [x] **P1-1. Campaign** — dipilih **P1-1a**. ✅ Selesai.
  - [x] **P1-1a. Sembunyikan:** hapus item nav Campaign + `CampaignNavItem` (hapus badge "HOT"), buat `/campaign` redirect ke `/create`. *Est: S*
  - [ ] **P1-1b. Selesaikan:** kirim momen/arc/jumlah konten ke backend, longgarkan gating `campaign_data` untuk plan Pro/Business, generate N konten sekaligus. *Est: XL*
- [x] **P1-2. Carousel** — dipilih **P1-2a**. ✅ Selesai.
  - [x] **P1-2a. Bersihkan dari MVP:** hapus `PICKER_FORMATS` carousel di Create, blok state `isCarousel`, hapus Section D "Pengaturan Carousel". Sisakan tipe & prompt backend (tidak mengganggu). *Est: M*
  - [ ] **P1-2b. Hapus total:** termasuk `CarouselSlide`, cabang carousel di editor, `copy_prompt.py` carousel branch. *Est: L*
- [x] **P1-3. Schedule** ✅ Selesai — hapus route `/schedule` (atau proteksi di balik feature flag). Saat ini bisa diakses langsung lewat URL dan menampilkan data palsu. *Est: XS*
- [x] **P1-4. Platform selection benar-benar berpengaruh** — dipilih **P1-4c**. ✅ Selesai 2026-10-21.
  - [ ] **P1-4a. Minimal:** filter galeri template berdasarkan `content_type` sesuai platform terpilih + tampilkan pesan kosong yang jelas. *Est: M*
  - [ ] **P1-4b. Penuh:** tambah template per rasio (4:5, 9:16, 16:9) + canvas size per platform di `canvas-spec.ts` **dan** `TemplateRenderer.tsx` (dua renderer wajib, `AGENTS.md` §6). *Est: XL*
  - [x] **P1-4c. Alternatif:** kunci MVP ke 1 platform (Instagram Feed), hapus step pemilihan platform. *Est: S*
    - Backend: `schemas/generate.PLATFORM_ENUM = Literal["instagram_feed"]`, `platform` opsional (default `instagram_feed`);
      platform lain → 422. Prompt AI tetap menerima `instagram_feed`.
    - Frontend: Step 1 Create tinggal **Tujuan** + kartu info "Format: Instagram Feed · 4:5 (1080×1350)"; stepper "Tujuan";
      galeri tidak lagi membawa/menampilkan param `platform` (link lama diabaikan). Bar konteks galeri diganti dari
      "Filter aktif" → "Tujuan konten" karena tujuan pun **tidak** memfilter galeri.
    - Test: `test_generate.py::TestPlatformLockedToInstagramFeed` (2), `create/__tests__/page.test.tsx` (4 baru).
    - ⏳ Landing page & metadata SEO masih menyebut "Instagram, TikTok & WhatsApp" — keputusan pemasaran, belum diubah.
    - Membuka platform lain = P1-4b (template + canvas per rasio, di **kedua** renderer).

### 🟡 Prioritas 2 — Kejujuran UI

- [x] **P2-1. Onboarding: rapikan field yang tidak tersimpan** ✅ Selesai (jalur hapus).
  - [x] Hapus "Kota", "Deskripsi singkat", "Gaya bahasa", "Target audiens", dan switch platform dari form. **Bonus:** "Bahasa konten" tidak dihapus tapi *disambungkan* ke kolom `language_preference` yang ternyata sudah ada dan sudah dipakai di prompt AI. *Est: XS*
  - [ ] ATAU tambah kolom `city`, `target_audience`, `tone` ke `company_profiles` + migrasi Alembic + ikut dipakai di prompt AI. *Est: M*
- [x] **P2-2. Notification Settings** ✅ Selesai — sembunyikan section Notifikasi di Settings (tidak ada sistem notifikasi sama sekali). *Est: XS*
- [x] **P2-3. Badge Riwayat** ✅ Selesai — ganti `badge: "12"` hardcoded jadi jumlah project asli, atau hapus badge. *Est: S*
- [x] **P2-4. Rename project di History** ✅ Selesai — sambungkan ke `PATCH /api/v1/projects/{id}` yang sudah ada. *Est: S*
- [x] **P2-5. Delete account bersihkan R2** ✅ Selesai (6 prefix, termasuk `thumbnails/` yang terlewat di audit) — hapus prefix `thematic-images/`, `exported/`, `logos/`, `uploads/`, `payment-proofs/` milik user. Tambah `storage_service.delete_user_prefix()` + test dengan mock. *Est: M*
- [x] **P2-6. Koreksi `AI-GT_MVP_Recommendation.md`** ✅ Selesai — perbarui 4 baris yang sudah usang (upload gambar, ubah password, hapus akun, billing) agar dokumen tidak menyesatkan keputusan berikutnya. *Est: XS*

### 🔵 Prioritas 3 — Polish

- [x] **P3-1. Empty state & error state** yang konsisten di History, Templates, Dashboard saat kuota habis (429). ✅ Selesai 2026-10-22
  - **Kuota habis:** satu komponen `components/billing/QuotaExhaustedBanner.tsx` (pemakaian + link Upgrade ke `/subscription`)
    di Dashboard, Templates, History, dan Create. Aturan habis di `lib/quota.ts::isQuotaExhausted` — sama dengan
    `billing_service.assert_generate_quota` (`used >= limit`, limit negatif = tak terbatas). Data via `hooks/useSubscription.ts`;
    gagal memuat → tanpa banner (backend tetap menegakkan 429).
  - Empty state Dashboard/History tidak lagi mengajak "Buat konten" saat kuota habis. Create: tombol Generate nonaktif
    sebelum brief diisi; bila backend tetap menjawab `RATE_LIMIT_EXCEEDED` (data basi), banner muncul menggantikan toast generik.
  - **Bug ditemukan:** gagal memuat daftar di ketiga halaman jatuh ke empty state palsu ("Belum ada konten/template") + toast.
    Kini `LoadErrorState` (`role="alert"`, tombol Coba lagi) terpisah dari `EmptyState` (`components/ui/empty-state.tsx`).
  - Catatan: `shell/sidebar.tsx` juga memanggil `billingApi.subscription()` sendiri → 2 request per halaman (pola lama).
    Bisa disatukan lewat context bila jadi masalah.
- [x] **P3-2. Coverage check** ✅ Selesai 2026-10-21 — total **92% → 97%**, semua layer di atas ambang `AGENTS.md` §3.
  - Di bawah ambang sebelumnya (semua sudah ada sebelum sesi admin): `routers/generate.py` 77%, `generate_service.py` 77%,
    `ai_service.py` 59%, `anthropic_copy.py` 50%, `replicate_image.py` 71%, `base_copy/base_image.py` 0%, `supabase_auth.py` 39%.
  - **Bug test diperbaiki:** 7 test `TestReplicateImageProviderIntegration` selalu gagal & **menembak Replicate sungguhan** —
    mem-patch `replicate.async_run`, padahal provider sudah memakai `replicate.Client(...).async_run`; ekspektasi juga basi
    (3 gambar + padding `None`, padahal kini `urls[:1]`). Diperbarui ke API & perilaku sekarang; suite kini lolos tanpa `--deselect`.
  - Characterization test baru: `test_generate_images.py` (alur unduh→R2→fallback URL mentah, regenerate gambar project),
    `test_ai_providers_coverage.py` (pemilihan provider, `_call_copy_provider_raw`, saran gambar, Anthropic, Protocol, Supabase),
    `test_generate.py::TestGenerateAuxEndpoints` (upload-image, image-suggestions 503, image).
  - Terendah kini: `database.py` 80%, `main.py` 83% (infra/lifespan), `project_service.py` 87%, `routers/projects.py` 91%.
- [x] **P3-3. Hapus dead code** ✅ Selesai 2026-10-21; lint bersih 2026-10-22.
  - Sisa P1-1 s/d P1-3: tidak ada — `/campaign` di middleware/robots **sengaja** (route redirect P1-1a), tipe carousel
    sengaja disisakan P1-2a (dibuang di P1-2b).
  - Dihapus: import/konteks tak terpakai di `ui/button.tsx`, `ui/toast.tsx` (`ToastContext`), state menu mobile mati di
    `landing/navbar.tsx`; entry point job lama (`cleanup_expired_temp_files`, `run_billing_maintenance`) di A-10.
  - `create/page.tsx`: loading picker template diturunkan dari status (bukan setState di effect), perilaku retry dikunci test;
    tombol tutup picker diberi `aria-label`.
  - File yatim tapi **tidak** dihapus (bukan sisa P1, keputusan design system): `types/api.ts`, `components/ui/dropdown-menu.tsx`.
  - ✅ **Lint bersih (0 error, 0 warning) 2026-10-22.** Ketujuh error lama dikunci characterization test dulu
    (ditulis & lolos di kode lama), baru di-refactor:
    - `hooks/useAutoSave.ts` — ref fn diperbarui di effect, bukan saat render (`useAutoSave.test.ts`).
    - `hooks/useGenerateSession.ts` — `loading` diturunkan dari `settledFor`, fetch jadi rantai promise (`useGenerateSession.test.ts`).
    - `ui/toast.tsx` — store modul + `useSyncExternalStore`, bukan variabel global yang di-assign saat render (`toast.test.tsx`).
    - `theme-provider.tsx` & `shell/sidebar.tsx` — preferensi localStorage lewat hook baru `hooks/useStoredValue.ts`
      (`useSyncExternalStore`, aman hydration) (`theme-provider.test.tsx`, `sidebar.test.tsx`).
    - `onboarding/page.tsx` — prefill profil lewat initializer `useState` (`onboarding/__tests__/page.test.tsx`).
    - `editor/page.tsx` — tanpa `projectId` langsung layar error, tanpa setState di effect (`editor/__tests__/page.test.tsx`).
    - Warning: `FabricCanvas` cleanup memakai holder yang disalin, `auth.register` tak lagi mendeklarasikan param tak terpakai,
      test brief-schema tanpa variabel `_`.
  - Ketemu saat itu: `beforeEach(() => mock.mockReset())` **mengembalikan fungsi mock**, dan vitest menjalankan nilai balik
    `beforeEach` sebagai cleanup → mock terpanggil diam-diam setelah tiap test. Dirapikan di 6 file (pakai kurung kurawal).

---

## Bagian 3 — To-Do List: Admin Panel

> **Kondisi per 2026-09-11: fondasi sudah terpasang (A-1 & A-2 selesai).**
> Kolom `users.role` (`user`/`admin`/`superadmin`) + migrasi `0015`, dependency `get_current_admin()`,
> error code `ADMIN_FORBIDDEN`, router `/api/v1/admin` (`GET /ping`), route group `(admin)` +
> `AdminShell`/`AdminSidebar` dengan guard klien, dan script `scripts/promote_admin.py`.
> **Update 2026-10-05:** A-3 (pembayaran, `/admin/orders`), A-4 + A-5 (user & langganan, `/admin/users`),
> A-7 (pesan, `/admin/messages`), A-8 (metrik, `/admin`), A-9 (audit log, `/admin/audit`), dan A-10 (storage & job,
> `/admin/storage`) selesai. **Update 2026-10-22:** A-6 (template, `/admin/templates`) selesai.

### Fase A — Fondasi (wajib duluan)

- [x] **A-1. Role & otorisasi admin** ✅ Selesai
  - Tambah kolom `role` (`'user' | 'admin' | 'superadmin'`) ke tabel `users` + migrasi Alembic.
  - Dependency `get_current_admin()` di `app/utils/auth.py` → `403 ADMIN_FORBIDDEN` untuk non-admin.
  - Tambah error code `ADMIN_FORBIDDEN` di `app/utils/exceptions.py`.
  - Script `scripts/promote_admin.py <email>` untuk membuat admin pertama.
  - Test: akses endpoint admin sebagai user biasa → 403; tanpa token → 401.
  - *Est: M*

- [x] **A-2. Struktur router & halaman admin** ✅ Selesai (kerangka)
  - Backend: package `app/routers/admin/` dengan prefix `/api/v1/admin` — **saat ini baru `__init__.py` berisi `GET /ping`**.
    Modul `users.py`, `payments.py`, `templates.py`, `metrics.py`, `messages.py` ditambahkan oleh A-3 s/d A-8 masing-masing.
  - Frontend: route group `frontend/src/app/(admin)/admin/` (baru `page.tsx`) + `AdminShell` terpisah dari `Shell` user.
  - Guard sisi klien: redirect non-admin ke `/dashboard`.
  - Semua response tetap mengikuti format `AGENTS.md` §4.
  - *Est: M*

### Fase B — Fungsi inti (urut dampak)

- [x] **A-3. Verifikasi pembayaran (pengganti `confirm_payment.py`)** ✅ Selesai 2026-10-03
  - `GET /admin/orders?status=&limit=&offset=` — default `awaiting_verification`, `status=all` untuk semua; berisi user, `total_amount` + kode unik, `has_proof`.
  - `GET /admin/orders/{id}` — detail.
  - `GET /admin/orders/{id}/proof` — bytes bukti transfer ber-`get_current_admin`, `Cache-Control: private, no-store`.
    **Bukan** lewat proxy `/api/v1/assets` (proxy publik menolak `payment-proofs/`). Frontend menampilkannya sebagai blob URL.
  - `POST /admin/orders/{id}/confirm` — guard status (`pending`/`awaiting_verification` saja, selain itu 422 `ORDER_STATUS_INVALID`) lalu `billing_service.confirm_order()`.
  - `POST /admin/orders/{id}/reject` — status `rejected` + alasan (wajib, ≤500 karakter) + `reviewed_by`/`reviewed_at`.
  - Migrasi `0016`: kolom `rejection_reason`, `reviewed_by` (FK `users`, `SET NULL`), `reviewed_at` di `payment_orders`.
  - UI `/admin/orders`: tab status + tabel + paginasi + modal detail (Setujui dengan konfirmasi ganda, Tolak dengan alasan).
  - Sisi user: `rejection_reason` ikut di `OrderData`; halaman `/payment` menampilkan order ditolak/kadaluarsa tanpa form upload.
  - Test: `test_admin_payments.py` (32), `order-detail-modal.test.tsx`, `admin-orders-panel.test.tsx`, `payment-page.test.tsx`.
  - `scripts/confirm_payment.py` dipertahankan sebagai jalur darurat (tanpa guard status); sejak 2026-10-22 wajib `--admin <email>` → jejak peninjau + audit log.

- [x] **A-4. Manajemen user** ✅ Selesai 2026-10-03
  - `GET /admin/users?q=&plan=&status=&limit=&offset=` — cari email/nama (case-insensitive, wildcard `%`/`_` di-escape),
    filter paket (user tanpa row Subscription = `starter`) & status `all | active | suspended`. Tanpa `password_hash`.
  - `GET /admin/users/{id}` — profil bisnis, langganan, pemakaian kuota bulan ini (`generate_used/limit`, `history_used/limit`).
  - `POST /admin/users/{id}/suspend` `{reason}` (wajib, ≤500) + `/unsuspend`. Migrasi `0018`: `users.is_active`, `suspended_at`, `suspended_reason`.
    - Suspend **berlaku seketika**: `auth_service.assert_active()` dicek di `login_user()` **dan** `get_current_user()` → `403 AUTH_ACCOUNT_SUSPENDED`.
    - Di login dicek **setelah** verifikasi password, supaya salah password tidak membocorkan status suspend.
  - `DELETE /admin/users/{id}` `{confirm_email}` — email wajib cocok (konfirmasi ganda di server), lalu `auth_service.delete_account()` (termasuk file R2).
  - **Hierarki** (`admin_user_service._assert_can_manage`): tidak bisa menindak diri sendiri; akun admin hanya oleh superadmin; superadmin tak bisa ditindak dari panel.
  - `POST /admin/users/{id}/verify` tidak dibuat (lihat B-1a).
  - UI `/admin/users`: cari + filter paket + tab status + tabel + modal detail (suspend dengan alasan, aktifkan lagi, hapus dengan ketik ulang email).
  - Test: `test_admin_users.py` (33), `admin-users-panel.test.tsx` (10).
  - ✅ Suspend/unsuspend/hapus tercatat di audit log (A-9).

- [x] **A-5. Manajemen langganan & kuota** ✅ Selesai 2026-10-05
  - **Keputusan produk:** ganti paket manual **ikut me-reset kuota** generate bulan berjalan.
  - Reset kuota: kolom `subscriptions.quota_reset_at` (migrasi `0020`). `billing_service.compute_usage()` — satu-satunya
    penghitung kuota (gate generate, halaman langganan user, panel admin) — menghitung sejak `max(tgl 1 bulan ini, quota_reset_at)`.
    Riwayat session **tidak** dihapus.
  - `PATCH /admin/users/{id}/subscription` `{plan_id?, extend_days?, reset_quota?}`:
    - ganti ke paket berbayar tanpa periode aktif → periode 30 hari; periode aktif dipertahankan (upgrade di tengah periode tidak memotong/menambah);
    - ganti ke Starter → `current_period_end` dihapus; add-on tidak disentuh;
    - `extend_days` (1–365) ditambahkan ke `max(sekarang, akhir periode)`; Starter → 422.
  - `POST /admin/users/{id}/grant-addon` `{addon_id | null}` — beri/cabut add-on storage tanpa order pembayaran.
  - Hierarki sama dengan A-4 (`_assert_can_manage`) — admin **tidak bisa** memberi paket/add-on ke dirinya sendiri.
  - Audit: `subscription.update` (before/after/extend_days/quota_reset) & `subscription.grant_addon` (before/after).
  - UI: tombol "Kelola langganan" di modal detail user → form paket/perpanjang/reset (reset terkunci aktif saat paket diganti) + add-on.
  - Test: `test_admin_subscriptions.py` (25), `user-subscription.test.tsx` (8).

- [x] **A-6. Manajemen template (= Template Lab)** ✅ Selesai 2026-10-22 — **menutup T-11**
  - **Keputusan (2026-10-22):** (1) `template_config` template live **tidak pernah diubah** — "edit" = versi baru
    (draft → publish template baru → template asal boleh dinonaktifkan), jadi `AGENTS.md` §6/§10 #3 tetap utuh;
    (2) sumber kebenaran = **DB**, publish memakai resolver preset yang sama dengan seeder, JSON format
    `seed_template_data` bisa diunduh untuk di-commit (bukan file-first di server — backend stateless);
    (3) "Start from Image" (AI vision) **ditunda**.
  - `GET /admin/templates?status=all|active|inactive` (+ `usage_count`), `GET/PATCH/DELETE /admin/templates/{id}`.
    PATCH hanya metadata (`name`, `industry`, `theme`, `copy_intent`, `is_premium`, `is_active`); field lain → 400.
    DELETE ditolak `422 TEMPLATE_IN_USE` bila pernah dipakai generate; gambar R2 dihapus kecuali dirujuk template lain.
  - `POST /admin/templates/{id}/image?kind=thumbnail|background` → R2 `permanent/templates/{thumbnails|backgrounds}/{id}.png`.
  - `POST /admin/templates/validate` → `{valid, errors, warnings, resolved_config}` (preview realtime).
    Aturan di `app/services/template_validation.py` (README template §0/§3/§4/§8): preset dikenal, canvas sesuai
    `content_type` (mapping generik `CONTENT_TYPE_CANVAS`), ≥1 `bind:"headline"`, `bind` ∈ headline/body/cta,
    tipe elemen dikenal, posisi 0–1, `brand_theme` wajib. Slot gambar hanya **peringatan** — `flash-sale-retro-poster`
    (live) tidak punya. Ketujuh template seed lolos (dikunci test).
  - Draft: tabel `template_drafts` (migrasi `0023`), `GET/POST /admin/template-drafts`, `GET/PATCH/DELETE /{id}`,
    `POST /{id}/publish {deactivate_source}`, `GET /{id}/export`. Draft menyimpan config **mentah** (preset belum
    di-expand) dan boleh belum valid; publish menolak `422 TEMPLATE_CONFIG_INVALID` bila metadata/config belum
    layak atau nama sudah dipakai (seeder meng-upsert per `name`).
  - Resolver preset pindah ke `app/services/design_system.py`; `scripts/design_system.py` me-re-export.
  - Audit: `template.publish`, `template.update`, `template.upload_image`, `template.delete`. Draft tidak di-audit
    (ruang kerja, tak terlihat user).
  - UI `/admin/templates` (tab live/draft, edit metadata & gambar, aktif/nonaktif, versi baru, unduh JSON, hapus) dan
    `/admin/templates/lab/[draftId]` (metadata + JSON + validasi realtime + preview **CSS dan Fabric berdampingan** +
    toggle "Uji brand" dengan warna kontras, sesuai uji standar README §5).
  - **Bug paritas ditemukan & diperbaiki:** latar `source:"background"` dibaca renderer CSS dari `background_url`,
    tapi Fabric (editor/export) memakai `thumbnail_url`, dan `background_url` tak pernah sampai ke `final_config`.
    Latar upload admin akan hilang dari PNG. Kini disuntik di `_normalize_template_config` dan dibaca `canvas-spec`;
    project lama (tanpa field itu) tetap memakai `thumbnail_url`.
  - Test: `test_admin_templates.py` (48), `test_template_validation.py` (28), `admin-templates-panel.test.tsx` (10),
    `template-lab.test.tsx` (9), `template-meta-modal.test.tsx` (3), `canvas-spec.test.ts` (+3).
  - *Belum:* Start from Image (AI vision), preset picker visual, canvas drag/resize (Phase 2 spec).

- [x] **A-7. Kotak masuk pesan Contact** ✅ Selesai 2026-10-03 — **menutup T-12**
  - Migrasi `0017`: `is_handled` (boolean) → `status` `new | read | handled` (baris lama `is_handled=true` → `handled`),
    + `handled_by` (FK `users`, `SET NULL`) + `handled_at`.
  - `GET /admin/messages?status=&limit=&offset=` — default `open` (= `new` + `read`); juga `new`, `read`, `handled`, `all`.
    Response menyertakan `unread` (jumlah `new` lintas filter) untuk tab "Baru (n)".
  - `PATCH /admin/messages/{id}` `{status, only_if_new?}` — `handled` mencatat admin + waktu; status lain mengosongkannya.
    `only_if_new` dipakai auto-mark-read saat pesan dibuka supaya pesan yang sudah selesai tidak terbuka ulang.
  - UI `/admin/messages`: tab, daftar yang bisa dibuka, tombol "Tandai selesai"/"Buka lagi", "Balas via email" (`mailto:`).
  - Label kategori dipusatkan di `lib/contactCategories.ts` (dipakai form publik & admin).
  - Test: `test_admin_messages.py` (21), `admin-messages-panel.test.tsx` (10).

### Fase C — Observability

- [x] **A-8. Dashboard metrik admin** ✅ Selesai 2026-10-05
  - Kegagalan generate kini tercatat: kolom `generate_sessions.error_reason` + `error_message` (migrasi `0021`), diisi
    `generate_service._mark_failed()` — `copy_timeout`, `copy_invalid_json`, `copy_failed`, `missing_profile`, `missing_template`.
    Pesan dipotong 500 karakter dan **hanya** dibaca endpoint admin (diuji: tidak bocor di `/generate/session/{id}`).
  - `GET /admin/metrics` — user (total, baru 7/30 hari, tersuspend), generate (bulan ini, 30 hari per status,
    `success_rate_30d` = completed/(completed+failed), `null` bila 0/0), pendapatan bulan ini (order `paid` per `paid_at`),
    pekerjaan tertunda (order menunggu verifikasi, pesan baru), tren harian 30 hari. Batas hari/bulan **UTC** — sama dengan kuota.
  - `GET /admin/sessions?status=failed|processing|completed|all` — dengan user, nama template, alasan & pesan error.
  - UI `/admin` (Ringkasan): stat tile, tautan pekerjaan tertunda, grafik kolom bertumpuk berhasil/gagal (legenda, tooltip
    hover+fokus keyboard, tampilan tabel), daftar session.
  - Warna grafik: token `--chart-good`/`--chart-bad` di `globals.css`, divalidasi `dataviz/validate_palette.js`
    (terang CVD ΔE 8.0, gelap ΔE 13.1 — `--destructive` gelap gagal kontras 2.58:1 sehingga mode gelap punya step sendiri).
  - Tautan sidebar "Template" disembunyikan sampai A-6 (sebelumnya 404).
  - Test: `test_admin_metrics.py` (19), `admin-metrics.test.tsx` (11).
  - ⏳ Tren dikelompokkan di Python (fungsi tanggal SQLite ≠ Postgres) — pindahkan ke `date_trunc` bila volume membesar.

- [x] **A-9. Audit log** ✅ Selesai 2026-10-03
  - Tabel `admin_audit_logs` (migrasi `0019`): `admin_id` (FK `SET NULL`) + **`admin_email` salinan** (jejak tetap terbaca
    setelah akun admin dihapus), `action`, `target_type`, `target_id` (string tanpa FK — target boleh sudah dihapus), `payload`, `created_at`.
  - `audit_service.record()` hanya `db.add()` tanpa commit — dipanggil **sebelum** commit aksi, jadi log & aksi atomik
    (aksi ditolak/gagal = tidak ada log). Nama aksi divalidasi terhadap `audit_service.ACTIONS`.
  - Tercatat: `order.confirm`, `order.reject` (A-3), `user.suspend`, `user.unsuspend`, `user.delete` (A-4).
  - `GET /admin/audit-logs?admin_id=&action=&date_from=&date_to=&limit=&offset=` — rentang tanggal inklusif (UTC);
    response juga berisi `actions` & `admins` untuk dropdown filter. **Tidak ada endpoint ubah/hapus** (diuji: 405).
  - UI `/admin/audit` (+ item nav "Audit log"): filter admin/aksi/tanggal, baris bisa dibuka untuk melihat payload.
  - Aturan baru `AGENTS.md` §10 #13: aksi admin yang mengubah data wajib `audit_service.record()`.
  - Test: `test_admin_audit.py` (17), `admin-audit-panel.test.tsx` (6).
  - ✅ `scripts/confirm_payment.py` (jalur darurat CLI) kini wajib `--admin <email>` (role admin/superadmin) dan tercatat sebagai
    `order.confirm` dengan `payload.via = "cli"` — 2026-10-22. Test: `test_confirm_payment_script.py`.

- [x] **A-10. Monitoring storage** ✅ Selesai 2026-10-05
  - **Bug diperbaiki:** cleanup temp tidak idempoten — URL varian tak dikosongkan setelah file dihapus, jadi file yang sama
    "dihapus" & dihitung ulang tiap 30 menit selamanya. Sekarang `thematic_image_url` di-set `None` setelah dihapus.
  - Tabel `job_runs` (migrasi `0022`) + `job_service`: setiap run (`schedule`/`manual`) tercatat — status, hasil, error,
    pemicu. Kegagalan dicatat, tidak di-raise (scheduler tidak mati). `main.py` menjadwalkan `job_service.JOBS`; entry point
    lama `cleanup_expired_temp_files` & `run_billing_maintenance` dihapus supaya tak ada jalur run yang tak tercatat.
  - `GET /admin/storage/jobs` — per job: run terakhir, run sukses terakhir, interval; + 20 run terbaru.
  - `POST /admin/storage/jobs/{name}/run` — jalankan manual (`cleanup_temp`, `billing_maintenance`), tercatat di audit log
    (`job.run`). Kegagalan job → 200 dengan `status: failed`.
  - `GET /admin/storage/usage` — pindai bucket on-demand (di thread, maks 50.000 objek, flag `truncated`): per prefix & 20 user
    terbesar. User yang sudah tak ada ditandai **file yatim** (sampah bucket). Gagal pindai → `503 STORAGE_UNAVAILABLE` tanpa detail.
  - UI `/admin/storage` (+ nav "Storage"): kartu status job + tombol "Jalankan sekarang", riwayat run, tombol "Pindai storage".
  - Test: `test_admin_storage.py` (18), `admin-storage-panel.test.tsx` (8).

### Catatan keamanan Admin Panel

- Endpoint admin **tidak boleh** memakai `get_current_user` polos — selalu `get_current_admin`.
- Bukti transfer (`payment-proofs/`) berisi data pribadi: jangan URL CDN publik.
  - ✅ **2026-10-03:** proxy publik `/api/v1/assets/` kini **menolak** `permanent/payment-proofs/` (404, `DENIED_PREFIXES` di [assets.py](backend/app/routers/assets.py)) + test di `test_assets_proxy.py`.
  - ✅ **A-3:** bukti transfer dibaca admin lewat `GET /admin/orders/{id}/proof` ber-`get_current_admin`.
  - ⏳ **Infra:** bucket disajikan publik lewat CDN, jadi `{CDN}/permanent/payment-proofs/...` kemungkinan masih terbuka. Tutup dengan rule Cloudflare (blok path `/permanent/payment-proofs/*` di custom domain) atau pindahkan bukti transfer ke bucket privat terpisah.
- Aksi destruktif (hapus user, hapus template) wajib konfirmasi ganda di UI + tercatat di audit log.
- Jangan pernah tampilkan `password_hash` di response admin manapun.

---

## Ringkasan Estimasi

| Kelompok | Jumlah item | Bobot |
|---|---|---|
| Blocker (B-1, B-2) | 2 keputusan | S–L |
| Prioritas 1 | 4 item | S–XL |
| Prioritas 2 | 6 item | XS–M |
| Prioritas 3 | 3 item | S–M |
| Admin Panel Fase A | 2 item | M |
| Admin Panel Fase B | 5 item | S–XL |
| Admin Panel Fase C | 3 item | M–L |

Jalur tercepat menuju MVP yang layak rilis: **B-1a → B-2a → P1-3 → P1-1a → P2-2 → P2-1 → A-1 → A-2 → A-3 → A-4**.
