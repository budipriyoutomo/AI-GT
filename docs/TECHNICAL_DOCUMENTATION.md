# AI-GT — Technical Documentation

> Reference dokumentasi teknis untuk platform **AI-GT (AI Content Generator Tools)**.
> Dokumen ini menjelaskan arsitektur, struktur kode, model data, kontrak API, dan alur kerja
> sistem sebagaimana benar-benar terimplementasi di repository (bukan aspirasional).
>
> Dokumen pelengkap:
> - [`AGENTS.md`](../AGENTS.md) — aturan wajib kontribusi (TDD, API standard, template integrity)
> - [`docs/PRD-AI-GT-v2-synced.md`](PRD-AI-GT-v2-synced.md) — product requirement
> - [`docs/render-template-logic.md`](render-template-logic.md) — logika merge & render template
> - [`docs/template_lab_spec.md`](template_lab_spec.md) — spec internal Template Lab
> - [`backend/scripts/seed_template_data/README.md`](../backend/scripts/seed_template_data/README.md) — kontrak `template_config` JSON

---

## 1. Ringkasan Produk

AI-GT adalah platform SaaS untuk **generate konten visual marketing berbasis AI**, ditujukan untuk
pelaku UKM Indonesia. Alur inti produk:

1. User memilih **template** visual (anchor desain yang tidak pernah dimodifikasi AI).
2. User mengisi **brief kampanye** (produk, pesan kunci, tujuan, platform, gaya bahasa).
3. AI meng-generate **copy** (headline, body, CTA) + saran **typography**, dan opsional **thematic image**.
4. Hasil disajikan sebagai varian; user memilih varian → menjadi **project**.
5. User meng-edit di **canvas editor** (Fabric.js) lalu **export** sebagai PNG.

Ada dua mode generate:

| Mode | Pemicu | Perilaku |
|---|---|---|
| **Quick Generate** (free) | `campaign_data = null` | Satu varian, auto-selected → project otomatis dibuat |
| **Campaign** (premium) | `campaign_data != null` | Multi-varian, dipilih manual. **Di-gate di server (403)** |

---

## 2. Arsitektur Sistem

```
┌────────────────────────────┐         ┌─────────────────────────────────────┐
│  Frontend (Next.js 16)     │         │  Backend (FastAPI)                  │
│  localhost:3000            │  HTTPS  │  localhost:8000                     │
│                            │ ──────► │                                     │
│  - App Router (pages)      │  Bearer │  /api/v1/*  routers                 │
│  - api/*  (fetch layer)    │  token  │    ↓                                │
│  - Fabric.js canvas editor │         │  services/ (business logic)         │
│  - localStorage token      │ ◄────── │    ↓                                │
└────────────────────────────┘  JSON   │  ai_service ── providers/ (pluggable)│
                                        │  storage_service ── Cloudflare R2   │
                                        │  APScheduler (cleanup /30 min)      │
                                        └───────────────┬─────────────────────┘
                                                        │ async SQLAlchemy
                                                        ▼
                                             ┌──────────────────────┐
                                             │  PostgreSQL 16        │
                                             └──────────────────────┘

External providers:
  - Copy:  Anthropic (Haiku) | DeepSeek        (via AI_COPY_PROVIDER)
  - Image: Replicate (SDXL)                      (via AI_IMAGE_PROVIDER)
  - Storage: Cloudflare R2 (S3-compatible)
  - Auth: JWT lokal | Supabase                   (via AUTH_PROVIDER)
```

**Prinsip arsitektural kunci:**

- **Backend stateless** — semua state ada di database; tidak ada session state di memory proses.
- **Pluggable providers** — copy, image, dan auth semuanya diseleksi via environment variable
  tanpa perubahan kode. Nama model tidak pernah di-hardcode.
- **Template integrity** — backend hanya *membaca* `template_config`; tidak pernah memodifikasinya.
- **Copy adalah output utama, image adalah optional layer** — kegagalan image provider tidak
  boleh menggagalkan session.

---

## 3. Tech Stack

### Backend
| Komponen | Teknologi |
|---|---|
| Framework | FastAPI |
| Server | Uvicorn (ASGI) |
| ORM | SQLAlchemy 2.0 (async, `Mapped`/`mapped_column`) |
| DB Driver | asyncpg (PostgreSQL) |
| Migrasi | Alembic |
| Validasi | Pydantic v2 + pydantic-settings |
| Auth | python-jose (JWT), bcrypt |
| Scheduler | APScheduler (`AsyncIOScheduler`) |
| AI SDK | `anthropic`, `openai` (DeepSeek), `replicate` |
| Storage | `boto3` (S3-compatible → Cloudflare R2) |
| HTTP | `httpx` (download image dari provider) |
| Testing | pytest, pytest-asyncio (`asyncio_mode = auto`) |

### Frontend
| Komponen | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Canvas editor | Fabric.js 6 |
| Ikon | lucide-react, react-icons |
| Validasi (form/schema) | Zod |
| Testing | Vitest, Testing Library, jsdom |

---

## 4. Struktur Repository

```
ai-gt/
├── AGENTS.md / CLAUDE.md        → instruksi kontribusi wajib
├── Makefile                     → shortcut dev/seed/migrate/install
├── docker-compose.yml           → Postgres + backend + frontend
├── docs/                        → PRD & dokumen teknis (termasuk file ini)
│
├── backend/
│   ├── app/
│   │   ├── main.py              → FastAPI entry, CORS, lifespan (scheduler), routing
│   │   ├── config.py            → Settings (pydantic-settings, baca .env)
│   │   ├── database.py          → async engine, AsyncSessionLocal, get_db, Base
│   │   ├── models/              → SQLAlchemy ORM (user, company_profile, template,
│   │   │                          generate_session, generate_variant, project)
│   │   ├── schemas/             → Pydantic request/response
│   │   ├── routers/             → auth, company_profile, templates, generate, projects
│   │   ├── services/
│   │   │   ├── ai_service.py            → orkestrator AI (entry point wajib)
│   │   │   ├── generate_service.py      → session lifecycle + background task
│   │   │   ├── storage_service.py       → Cloudflare R2 (temp/permanent/exported)
│   │   │   ├── cleanup_service.py       → hapus temp file expired
│   │   │   ├── auth_service.py          → register/login/verify token
│   │   │   ├── company_profile_service.py
│   │   │   ├── project_service.py
│   │   │   └── providers/
│   │   │       ├── base_copy.py / base_image.py   → Protocol interface
│   │   │       ├── ai_types.py                     → dataclass I/O + exceptions
│   │   │       ├── anthropic_copy.py / deepseek_copy.py
│   │   │       ├── replicate_image.py
│   │   │       ├── copy_prompt.py                  → prompt templates
│   │   │       └── auth/ (jwt_auth, supabase_auth, base_auth)
│   │   └── utils/
│   │       ├── auth.py          → get_current_user dependency (HTTPBearer)
│   │       └── exceptions.py    → AppError, handler, ErrorCode constants
<<<<<<< HEAD
│   ├── alembic/versions/        → migrasi 0001…0012
=======
│   ├── alembic/versions/        → migrasi 0001…0010
>>>>>>> 6ce03094d04747fa12a1c7aefcabb097c93c9916
│   ├── scripts/                 → seed_templates.py, design_system.py, reconcile_schema.py
│   └── tests/                   → conftest.py, unit/, integration/
│
└── frontend/
    └── src/
        ├── app/                 → routes (login, register, dashboard, create, generate,
        │                          editor, templates, history, settings, …)
        ├── api/                 → fetch layer (authApi, generateApi, templatesApi, …)
        ├── components/          → ui/, editor/ (FabricCanvas), template/ (TemplateRenderer), shell/
        ├── lib/                 → apiClient.ts (token + request wrapper), auth.tsx, brandAdapt.ts
        ├── hooks/               → useGenerateSession, useAutoSave
        ├── types/               → TypeScript definitions (mirror backend schemas)
        └── middleware.ts        → guard route berbasis cookie token
```

---

## 5. Model Data (Database Schema)

Semua primary key adalah `UUID`. Timestamp menggunakan `timezone=True`. Relasi dikelola via
SQLAlchemy `relationship`.

### `users`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | UUID PK | |
| email | String(255) | unique, not null |
| password_hash | String(255) | bcrypt |
| name | String(100) | |
| is_verified | bool | default false |
| created_at / updated_at | timestamptz | |

Relasi: `company_profile` (1:1), `generate_sessions` (1:N), `projects` (1:N).

### `company_profiles`
1:1 dengan user (`user_id` unique). Menyimpan `business_name`, `industry`, `logo_url`,
`brand_colors` (JSON list), `brand_font`, `tagline`, `address` (Text nullable), `contact` (JSON),
`language_preference` (default `"id"`). Company profile **wajib ada** sebelum generate (kalau tidak →
`PROFILE_NOT_FOUND`).

`address` adalah **kolom tersendiri, bukan key di dalam JSON `contact`** — form Settings menyimpan
`contact` apa adanya, jadi menyuntikkan alamat ke sana akan ikut mempersist slot render (`location`)
sebagai data profil. Pemetaan `address` → slot footer `location` dilakukan saat render di frontend
(`lib/template/footer-contact.ts`), bukan di DB.

`contact` adalah JSON bebas; schema `ContactInfo` mengisi `website`, `phone`, `instagram`, `tiktok`,
`youtube`, `whatsapp`, `facebook`, `hashtag` (semua default `""`). Slot footer template boleh memakai
key lain (mis. `location`, `booking`) — lihat `SocialIcon`.

### `templates`
Anchor visual. Kolom penting:
| Kolom | Tipe | Catatan |
|---|---|---|
| name, industry, theme | String | metadata & filter |
| content_type | String(20) | `"Single"` \| `"Carousel"` |
| copy_intent | String(20) nullable | niat copy → arah AI: `"promotion"` \| `"story"` \| `"brand"` (null = fallback generic) |
| layout_type | String | default `"promo_simple"` |
| thumbnail_url | Text | foreground/gallery thumbnail |
| background_url | Text nullable | image latar full-bleed (opsional, di-upload admin) |
| template_config | JSON | struktur elements/slot — **read-only bagi backend** |
| platform | String nullable | |
| is_premium / is_active | bool | |

> Aturan `template_config` (slot `role` vs `bind`, pemisahan TEMPLATE vs GAMBAR) didefinisikan di
> [`backend/scripts/seed_template_data/README.md`](../backend/scripts/seed_template_data/README.md).

### `generate_sessions`
Merepresentasikan satu request generate. Kolom kunci:
| Kolom | Catatan |
|---|---|
| user_id, template_id | FK |
| language_style | formal / casual / persuasive / fun_playful / inspiratif |
| goal, platform, thematic_image_theme | brief |
| content_data | JSON — field Quick Generate (product_or_service, key_message, image_source, …) |
| campaign_data | JSON — **null = Quick Generate; non-null = Campaign (premium)** |
| status | `processing` → `completed` \| `failed` |
| progress | Integer 0-100, default 0. Diperbarui `generate_service._do_generate` di titik nyata (20 = brief tervalidasi & AI mulai dipanggil, 75 = AI selesai tinggal persist varian, 100 = `completed`) — progress asli, bukan simulasi waktu di frontend |
| expires_at | not null — TTL **1 jam** (`_SESSION_TTL_HOURS`) |

Property `project_id` di-derive dari relasi `project` (1:1).

### `generate_variants`
Hasil per varian dari satu session:
`variant_number`, `copy_data` (JSON), `typography_data` (JSON), `thematic_image_url` (nullable),
`is_selected` (bool). Cascade delete mengikuti session.

### `projects`
Terbentuk saat varian dipilih (atau otomatis pada Quick Generate):
`session_id`, `variant_id`, `title`, `final_config` (JSON — snapshot lengkap untuk editor),
`exported_image_url`, `thumbnail_url`, `is_exported`.

`final_config` menggabungkan `copy`, `typography`, `thematic_image_url`, `image_source`,
`image_prompt`, dan **seluruh `template_config`** (disalin apa adanya, read-only) plus field runtime
yang di-inject di top-level — `name`, `content_type`, `thumbnail_url` (lihat
`generate_service._normalize_template_config`). Inilah payload yang di-render canvas editor.

`final_config.typography` menyimpan hasil edit editor: `headline_font`, `body_font`, `headline_size`,
`body_size`, `letter_spacing`, plus **`headline_scale` / `body_scale`** — faktor skala ukuran font
**relatif ukuran yang di-authored template** (1 = ukuran template; slider editor 0,6–1,6). Skala di-apply
di `lib/editor/preview-config.ts` ke elemen ber-`bind`, lalu auto-fit canvas tetap membatasi ke budget
layout. Project lama tanpa kedua field ini → fallback `1`.

### `contact_messages`
Pesan kontak/support dari form publik (endpoint tanpa auth, tidak terkait `user_id`):
`id`, `name`, `email`, `category` (nullable), `message`, `is_handled` (default `false`), `created_at`.

### Relasi (ringkas)

```
User ──1:1── CompanyProfile
User ──1:N── GenerateSession ──1:N── GenerateVariant
User ──1:N── Project ──1:1── GenerateSession
                    └──1:1── GenerateVariant
Template ──1:N── GenerateSession
```

Migrasi dikelola Alembic (`0001_initial_schema` … `0010_add_address_to_company_profiles`).

> `0008` adalah **guard idempoten** (`ADD COLUMN IF NOT EXISTS thumbnail_url`) untuk memperbaiki DB yang
> revisi `0004`-nya sempat ter-skip akibat tabrakan revision id antar-branch — lihat pola serupa di `0007`.
> `0009` menambah kolom `templates.copy_intent` (nullable, idempoten) — `seed_templates.py` juga
> menambahnya via `SCHEMA_FALLBACKS` agar seed jalan sebelum migrasi di-apply.
> `0010` menambah kolom `company_profiles.address` (Text nullable, idempoten — cek `inspect()` dulu,
> pola yang sama dengan `0007`/`0008`).

---

## 6. Standar Respons API

**Semua endpoint** mengikuti kontrak seragam.

**Success:**
```json
{ "success": true, "data": { }, "message": "opsional" }
```

**Error:**
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "pesan human-readable" } }
```

Error dilempar via `AppError(status_code, code, message)` dan diterjemahkan oleh
`app_error_handler` (`app/utils/exceptions.py`). Kode error adalah konstanta di `ErrorCode`:

```
AUTH_INVALID_CREDENTIALS   AUTH_EMAIL_NOT_VERIFIED   AUTH_TOKEN_EXPIRED
PROFILE_NOT_FOUND          TEMPLATE_NOT_FOUND        SESSION_NOT_FOUND
SESSION_EXPIRED            VARIANT_NOT_SELECTED      AI_GENERATION_FAILED
STORAGE_UPLOAD_FAILED      RATE_LIMIT_EXCEEDED       FEATURE_REQUIRES_PREMIUM
INVALID_FILE_TYPE          FILE_TOO_LARGE
```

**Konvensi HTTP status:** `200` ok · `201` created · `400` validasi input · `401` unauthorized ·
`403` forbidden · `404` not found · `422` invalid bisnis (mis. `SESSION_EXPIRED`) · `429` rate limit ·
`500` internal · `503` provider AI unavailable.

Stack trace tidak pernah di-expose ke client — di-log di server, client hanya menerima error code bersih.

---

## 7. Referensi Endpoint

Semua endpoint di-prefix `/api/v1`. Kecuali auth register/login, semua memerlukan header
`Authorization: Bearer <token>` (dependency `get_current_user`).

### Auth — `/api/v1/auth`
| Method | Path | Deskripsi |
|---|---|---|
| POST | `/register` | Registrasi → return `access_token` + `user` (201) |
| POST | `/login` | Login → return `access_token` + `user` |
| GET | `/me` | Data user terautentikasi |
| POST | `/change-password` | Ganti password. 401 `AUTH_INVALID_CREDENTIALS` jika password saat ini salah |
| DELETE | `/me` | **Hard-delete** akun + seluruh data terkait (projects, generate_sessions, generate_variants, company_profile), urutan FK-safe. Tidak bisa dibatalkan |

### Company Profile — `/api/v1/company-profile`
| Method | Path | Deskripsi |
|---|---|---|
| GET | `` | Ambil profil user |
| POST | `` | Buat profil (201) |
| PATCH | `` | Update profil — **tri-state**: key absen → field tidak disentuh; `null` eksplisit → kolom di-set NULL (dipakai "Hapus logo"). Service memakai `model_dump(exclude_unset=True)`, **bukan** `exclude_none` |
| POST | `/logo` | Upload + normalize logo ke R2 (multipart, field `file`). **Tidak menyentuh DB** — return `{logo_url}` (path + `?v=` cache-busting), penulisan ke profil tetap lewat POST/PATCH biasa |

### Templates — `/api/v1/templates`
| Method | Path | Deskripsi |
|---|---|---|
| GET | `?industry=&theme=` | List template aktif (proyeksi kolom untuk list, filter opsional) |
| GET | `/{template_id}` | Detail satu template (404 `TEMPLATE_NOT_FOUND`) |

### Generate — `/api/v1/generate`
| Method | Path | Deskripsi |
|---|---|---|
| POST | `/session` | Buat session; memicu **background task** generate. Return `{id, status}` (201) |
| GET | `/session/{session_id}` | Poll status + varian, sertakan `progress` (0-100). 403 jika bukan milik user, 422 jika expired |
| POST | `/image-suggestions` | 3 saran prompt gambar dari brief (503 jika gagal) |
| POST | `/image` | Generate 1 gambar dari prompt; jika ada `project_id` → regenerate & update `final_config` |
| POST | `/session/{session_id}/select` | Pilih varian → buat project |

### Projects — `/api/v1/projects`
| Method | Path | Deskripsi |
|---|---|---|
| GET | `` | List project milik user |
| GET | `/{project_id}` | Detail project |
| PATCH | `/{project_id}` | Update (mis. title / final_config) |
| DELETE | `/{project_id}` | Hapus project |
| POST | `/{project_id}/thumbnail` | Upload snapshot canvas (multipart) |
| POST | `/{project_id}/export` | Upload PNG final → tandai exported (multipart) |

### Contact — `/api/v1/contact`
| Method | Path | Deskripsi |
|---|---|---|
| POST | `` | Kirim pesan kontak/support (201). **Publik — tanpa auth.** Body `{name, email, category?, message}`; `email` divalidasi `EmailStr`, `name`/`message` tak boleh kosong. Disimpan ke `contact_messages` (`is_handled=false`) |

### Lain-lain
- `GET /health` → `{ "success": true, "data": { "status": "ok" } }`

---

## 8. Alur Generate (End-to-End)

Alur ini menyatukan router → service → AI layer → storage → DB.

```
1. POST /generate/session
   └─ generate_service.create_session()
      ├─ Gating: campaign_data != null → 403 FEATURE_REQUIRES_PREMIUM
      ├─ Validasi image_source vs thematic_image_theme (mutual exclusivity)
      ├─ Cek Template aktif (404) & CompanyProfile ada (404)
      ├─ Simpan content_data, status="processing", expires_at = now + 1h
      └─ return {id, status}
   └─ background_tasks.add_task(run_generation_task, session.id)   ← non-blocking

2. run_generation_task()  (DB session baru sendiri)
   └─ _do_generate()
      ├─ build_copy_brief(template_config, copy_intent)   ← kompilasi slot AI yang ADA (rekursif ke
      │     group) + batas kata per slot + teks statis template sebagai konteks
      ├─ Susun CopyInput (brand, brief, template_theme, copy_intent, copy_brief, content_type, slide_count)
      ├─ ImageInput hanya jika image_source == "generated"
      ├─ ai_service.generate_content(copy_input, image_input, session_id)
      │     └─ asyncio.gather( _generate_copy_with_retry, _generate_images_safe )   ← PARALEL
      │           - copy: timeout 30s, retry 2x untuk invalid JSON
      │           - image: timeout 60s, error/timeout → ImageResult kosong (session tetap lanjut)
      ├─ CopyError → status="failed", return
      ├─ Simpan tiap GenerateVariant (copy_data, typography_data, thematic_image_url)
      │     - image di-download & di-upload ke R2 temp/ via _persist_image()
      ├─ status="completed"
      └─ Quick Generate (campaign_data is None) → _auto_select_first_variant() → buat Project

3. Frontend polling GET /generate/session/{id} sampai status "completed"

4. (Campaign) POST /generate/session/{id}/select
   └─ select_variant()
      ├─ Pastikan status "completed" (422 jika belum)
      ├─ variant.is_selected = True
      ├─ _resolve_thematic_image(): move R2 temp/ → permanent/ (atau persist URL eksternal)
      ├─ Bangun final_config (copy + typography + template_config read-only subset)
      └─ Buat Project

5. Editor (Fabric.js) → auto-save thumbnail → POST /projects/{id}/export (PNG final)
```

**Aturan kegagalan AI (di-enforce di kode):**

| Kondisi | Tindakan |
|---|---|
| Copy provider timeout > 30s | `CopyTimeoutError` → session `failed` |
| Copy provider invalid JSON | Retry maks 2x, lalu `CopyInvalidJsonError` → `failed` |
| Image provider timeout > 60s | Skip image, `ImageResult` kosong — session tetap `completed` |
| Image provider error | Sama — image adalah optional layer |

Copy dan image **selalu dipanggil paralel** via `asyncio.gather` (tidak pernah sequential).

---

## 9. AI Integration Layer

Semua pemanggilan AI **wajib** lewat `app/services/ai_service.py`. Router tidak boleh memanggil
provider langsung. Nama model dibaca dari env (`ai_copy_model`, `ai_image_model`), tidak pernah
di-hardcode.

### Struktur

```
ai_service.py                  ← orkestrasi, seleksi provider, timeout, retry, gather
providers/
├── ai_types.py                ← CopyInput (incl. copy_intent, copy_brief)/CopyResult/CopyVariant,
│                                 CopyBrief (slot + batas kata + batas karakter + static_context),
│                                 ImageInput/ImageResult, exceptions (CopyError, CopyTimeoutError,
│                                 CopyInvalidJsonError, ImageError, ImageTimeoutError, ImageProviderError)
├── base_copy.py               ← Protocol: async generate_copy(CopyInput) -> CopyResult
├── base_image.py              ← Protocol image provider
├── anthropic_copy.py          ← implementasi Haiku
├── deepseek_copy.py           ← implementasi DeepSeek (OpenAI-compatible SDK)
├── replicate_image.py         ← implementasi SDXL
└── copy_prompt.py             ← scaffold prompt + personalisasi per template:
                                  intent_guidance/intent_lengths (arah & batas kata per copy_intent),
                                  build_copy_brief/render_slot_spec (slot + maxWords + maxChars +
                                  konteks statis)
```

> **Personalisasi copy per template** (bukan prompt disimpan per template): satu scaffold prompt di
> `copy_prompt.py` diisi DATA per template — `copy_intent` memilih blok guidance + batas kata; brief
> compiler menyuntik slot mana yang harus diisi (+ suruh `null` slot yang tak ada) dan teks statis
> template sebagai konteks. AI hanya menerima brief terkompilasi, BUKAN `template_config` mentah
> (hemat token + Template Integrity). `template.copy_intent` null → fallback batas lama 12/35/5.
>
> **Batas karakter per slot** (`char_limits`, `_collect_char_limits`) — diturunkan dari geometri elemen
> (lebar kolom ÷ `fontSize` × jumlah baris yang muat di budget vertikal, margin aman 10%), atau override
> eksplisit lewat `maxChars` di template. Jumlah kata menjaga gaya; karakter menjaga copy **muat** di
> layout. Formula (`_AVG_GLYPH_EM=0.5`, `_CHAR_MARGIN=0.9`) di-mirror di frontend
> `lib/editor/fit-text.ts` (`charCapacity`) supaya batas yang dilihat editor sama dengan yang
> diberikan ke AI.

### Seleksi provider (via env)
`get_copy_provider()` → `anthropic` | `deepseek`. `get_image_provider()` → `replicate`.
Provider tak dikenal → `ValueError`.

### Fungsi publik `ai_service`
| Fungsi | Kegunaan |
|---|---|
| `generate_content(copy_input, image_input, session_id)` | Entry utama — gather copy+image paralel |
| `generate_image_suggestions(...)` | 3 saran prompt gambar dari brief (return `[]` jika gagal) |
| `generate_single_image(prompt)` | 1 gambar dari prompt teks (URL atau `None`) |

Konstanta: `_COPY_TIMEOUT=30.0`, `_IMAGE_TIMEOUT=60.0`, `_COPY_MAX_RETRIES=2`.

---

## 10. Storage Flow (Cloudflare R2)

`storage_service.py` menggunakan `boto3` S3 client terhadap endpoint R2 (`signature_version=s3v4`).

> **Yang disimpan di DB adalah path root-relative, bukan URL absolut.** Semua fungsi upload/move
> mengembalikan path berawalan slash (mis. `/permanent/thumbnails/{user_id}/{project_id}.png`) —
> host publik **tidak** pernah di-bake ke data. Frontend menambahkan base CDN publik
> (`NEXT_PUBLIC_CDN_URL`) saat render via `resolveAssetUrl` (`lib/assetUrl.ts`); URL absolut/data/blob
> dilewatkan apa adanya. Leading slash juga diandalkan `cleanup_service` (`"/temp/" in url`) dan
> `generate_service._resolve_thematic_image` (parsing `urlparse().path`).
>
> **Pengecualian: `company_profiles.logo_url`.** Field ini menyimpan path **+ query version**
> (`/permanent/logos/{user_id}/logo.png?v={epoch}`), bukan path root-relative murni. Key R2-nya
> deterministik (selalu overwrite, tanpa file orphan); `?v=` berubah setiap upload semata untuk
> cache-busting CDN. `resolveAssetUrl` meneruskan query string apa adanya saat prepend base CDN.

### Struktur bucket
```
ai-gt-bucket/
├── temp/thematic-images/{session_id}/{timestamp}.png      ← TTL 1 jam
└── permanent/
    ├── thematic-images/{user_id}/{project_id}.png          ← saat pilih varian
    ├── thumbnails/{user_id}/{project_id}.png               ← snapshot editor per auto-save
    ├── exported/{user_id}/{project_id}/export.png          ← PNG final
    └── logos/{user_id}/logo.png                             ← selalu PNG (dinormalisasi Pillow), overwrite
```

### Lifecycle
1. Generate → `upload_temp()` ke `temp/`.
2. Pilih varian → `move_to_permanent()` (copy + delete temp) → `permanent/thematic-images/`.
   Jika URL eksternal (bukan temp/permanent) → di-download & `upload_permanent_thematic()`.
3. Regenerate gambar dari editor → `upload_permanent_thematic()` + update `final_config`.
4. Export → `upload_exported()`.
5. Logo → `POST /company-profile/logo` → `storage_service.upload_logo()`: validasi + normalisasi
   (`app/utils/images.py`, PNG/JPEG/WEBP only, ≤2MB, sisi terpanjang ≤1024px, convert RGBA) →
   upload ke key deterministik `permanent/logos/{user_id}/logo.png` → return path + `?v=`.
6. Kegagalan upload → `AppError(500, STORAGE_UPLOAD_FAILED)`.

### Cleanup terjadwal
`main.py` lifespan menjalankan `AsyncIOScheduler` yang memanggil
`cleanup_service.cleanup_expired_temp_files` **setiap 30 menit**. Cleanup memindai
`generate_sessions` dengan `expires_at < now`, lalu menghapus file `temp/` dari `thematic_image_url`
tiap varian.

---

## 11. Autentikasi & Otorisasi

- **Pluggable auth** via `AUTH_PROVIDER` (`jwt` default | `supabase`), diimplementasi di
  `providers/auth/` (`JwtAuthProvider`, `SupabaseAuthProvider`, `base_auth`).
- **JWT lokal**: `jwt_auth.py` — encode/decode HS256, klaim `sub` = user_id, `exp` = now + `JWT_EXPIRE_HOURS`.
  Password di-hash dengan **bcrypt**.
- **Dependency `get_current_user`** (`utils/auth.py`) — `HTTPBearer` mengekstrak token,
  `auth_service.verify_token` memvalidasi, lalu memuat `User` dari DB. Token invalid/expired → error auth.
- **Otorisasi kepemilikan** — service memeriksa `resource.user_id == current_user.id`; akses ke resource
  milik user lain → 403 (mis. `get_session` mengembalikan 403 `SESSION_NOT_FOUND`).
- **Frontend** — token disimpan di `localStorage` (`aigt_token`) dan disinkronkan ke cookie agar
  `middleware.ts` bisa memproteksi route. `apiClient.ts` menempelkan header `Authorization` dan
  membungkus error backend menjadi `ApiClientError`.

---

## 12. Frontend

- **App Router (Next.js 16)** — halaman tipis di `src/app/*`; logika data di `src/api/*` dan `src/hooks/*`.
- **`lib/apiClient.ts`** — satu-satunya jalur fetch ke backend. Membaca `NEXT_PUBLIC_API_URL`,
  meng-handle token, dan meng-unwrap `{success, data}` (melempar `ApiClientError` bila `success=false`).
- **`api/*.ts`** — wrapper per-domain: `authApi`, `companyProfileApi`, `templatesApi`, `generateApi`,
  `projectsApi`.
- **State company profile — `lib/auth.tsx` (`AuthContext`).** Satu-satunya store global; dibaca lewat
  `useAuth()` di `/create`, Settings, dan Dashboard (tidak ada store kedua). `refreshProfile()` adalah
  satu-satunya titik re-fetch + merge: dipanggil saat `/create` **mount** (brand terbaru berlaku tanpa
  logout/login) dan setelah `updateProfile()` sukses di Settings. Punya **in-flight guard** (request kedua
  yang tumpang tindih mengembalikan promise yang sama — mencegah double-fetch dari StrictMode
  double-invoke / bootstrap yang beririsan) dan **fail-soft**: fetch gagal → nilai lama di store
  dipertahankan, wizard tidak diblokir. Strategi fetch-nya di
  [`docs/render-template-logic.md`](render-template-logic.md).
- **Template rendering** — `components/template/TemplateRenderer.tsx` me-render `template_config` +
  data hasil generate. Logika merge tiga sumber (`template_config` + `company_profile` +
  `generate_config`) di runtime dijelaskan di [`docs/render-template-logic.md`](render-template-logic.md).
- **Satu resolver (`lib/template/resolve.ts`).** `resolveTemplateConfig({ templateConfig, profile, branded, copy })`
  adalah **fungsi murni** yang menggabungkan warna brand (`lib/brandAdapt.ts`) + copy/tipografi (`lib/editor/merge.ts`)
  + precedence font + logo/tagline jadi satu `ResolvedConfig`. Kedua renderer (CSS & Fabric) hanya **menggambar**
  `ResolvedConfig` — tidak ada satu pun yang meng-adapt brand sendiri, jadi preview HTML, canvas editor, dan PNG
  hasil export dijamin identik. Adapter editor `lib/editor/preview-config.ts` hanya menyiapkan state editor
  (copy, font, skala, strip CTA kosong) lalu memanggil resolver yang sama. Lihat AGENTS.md §6.
- **Galeri vs preview branded.** Kartu galeri (`app/templates/page.tsx`) dan preview modal dalam keadaan
  **unbranded** (default) merender template apa adanya — warna & font asli template — dengan slot logo diisi
  **logo default statis** (`DEFAULT_COMPANY_PROFILE.logo_url` di `lib/defaults.ts`), bukan logo brand user.
  Brand user (warna, font, logo asli) baru dipakai saat toggle **"Preview dengan brand color"** di
  `TemplatePreviewModal` diaktifkan, dan pilihan toggle itu terbawa ke `/create` lewat query `brandPreview`
  (`lib/create/brand-preview.ts`). Di `/create` query itu hanya **seed** untuk state lokal: toggle yang sama
  (`components/create/BrandPreviewToggle.tsx`) bisa dibalik in-page, dan mini template picker
  (`MiniTemplateCard`) + `SelectedTemplatePanel` sama-sama membaca state itu. Saat generate, pilihan itu
  dipersist sebagai `brand_applied` (request generate session → `final_config.brand_applied`); editor
  membacanya sebagai `branded` untuk resolver, sehingga proyek lama (tanpa field itu) tetap unbranded.
  **`branded` mengatur seluruh data profil sekaligus** — warna, font, logo, tagline, dan kontak footer:
  unbranded → `DEFAULT_COMPANY_PROFILE`, branded → profil user. Tidak ada campuran.
- **Slot footer & kontak.** Elemen `footer` di `template_config` mendeklarasikan `slots`
  (mis. `instagram`, `whatsapp`, `website`); isinya diambil dari `company_profile.contact` yang diteruskan
  sebagai prop `contact` ke `TemplateRenderer` (CSS) dan lewat `buildCanvasSpec({ contact })` (Fabric).
  Nilai kosong → ikon saja tanpa teks; `contact` null seluruhnya → `DEFAULT_COMPANY_PROFILE.contact`.
  Ikon di kedua renderer berasal dari peta `ICONS` yang sama (`components/template/SocialIcon.tsx`),
  jadi preview dan PNG hasil export identik.
- **`address` → slot `location` (`lib/template/footer-contact.ts`).** `address` adalah kolom tersendiri,
  bukan bagian dari `contact`, sementara kedua renderer sama-sama membaca `contact[slot]`.
  `buildFooterContact({ contact, address })` adalah **satu-satunya** tempat pemetaan itu terjadi, dan
  dipanggil **sebelum** resolver di tiap pemanggil (`app/create`, `app/editor`, `app/templates`) — kalau
  tiap renderer memetakan sendiri, preview dan PNG export bisa berbeda diam-diam. `address` kosong sengaja
  **tidak** menimpa slot (dirender ikon tanpa teks, bukan string kosong). Fungsi ini **hanya untuk render** —
  form Settings tetap memperlakukan `contact` dan `address` sebagai dua field terpisah sesuai bentuk DB-nya,
  sebab `contact` disimpan apa adanya dan `location` akan ikut terpersist kalau disuntikkan.
- **Editor** — `components/editor/FabricCanvas.tsx` (Fabric.js 6) untuk edit & export PNG;
  `hooks/useAutoSave.ts` menyimpan snapshot thumbnail secara berkala.
- **Editor element-based (`TemplateFabricCanvas.tsx` + `lib/editor/canvas-spec.ts`)** — merender
  `template_config` di canvas Fabric, paralel dengan `TemplateRenderer.tsx` (CSS) untuk galeri/preview;
  paritas antara keduanya wajib (lihat AGENTS.md §6). Auto-fit & reflow (`lib/editor/fit-text.ts`,
  `canvas-spec.computeTextLayout`): teks top-level yang tidak muat setelah copy AI mengisi slot
  **mengecil** (lantai 50% fontSize template, tak pernah membesar) berdasarkan budget vertikal ke
  elemen terdekat di bawahnya yang beririsan sumbu X; teks di bawahnya ikut naik menjaga gap desain
  authored. Pengukuran wrap selalu lewat `Textbox` Fabric sungguhan (bukan estimasi) supaya keputusan
  fit sama persis dengan yang digambar. Batas karakter input di editor (`charCapacity`) memakai
  formula yang sama dengan `copy_prompt._char_capacity` di backend (§9).
- **`hooks/useGenerateSession.ts`** — mengelola polling status session sampai `completed`/`failed`, meneruskan `progress` (0-100) dari server apa adanya — bukan simulasi waktu di client.

---

## 13. Konfigurasi (Environment Variables)

Backend (`app/config.py`, dibaca dari `backend/.env`):

```env
DATABASE_URL=postgresql+asyncpg://aigt:aigt@localhost:5432/aigt_db

# Auth
AUTH_PROVIDER=jwt                 # jwt | supabase
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
SUPABASE_JWT_SECRET=...           # jika AUTH_PROVIDER=supabase

# AI — copy & image (nama model TIDAK di-hardcode di kode)
AI_COPY_PROVIDER=anthropic        # anthropic | deepseek
AI_COPY_MODEL=claude-haiku-4-5
AI_IMAGE_PROVIDER=replicate
AI_IMAGE_MODEL=stability-ai/sdxl

# API keys
ANTHROPIC_API_KEY=...
DEEPSEEK_API_KEY=...
REPLICATE_API_TOKEN=...

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=ai-gt-bucket

# CORS
CORS_ORIGINS=http://localhost:3000
```

Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CDN_URL=https://cdn.calira.my.id   # base CDN untuk asset R2 (path relatif dari backend)
```

> File `.env` tidak boleh di-commit — gunakan `.env.example` sebagai referensi.

---

## 14. Setup & Menjalankan

Prasyarat: Node.js ≥ 18, Python ≥ 3.11, PostgreSQL 16, virtualenv backend di `backend/aigt/`.

```bash
# 1. Database (opsi cepat via Docker)
docker compose up -d db                 # Postgres localhost:5432 (aigt/aigt/aigt_db)

# 2. Virtualenv backend (path diharapkan Makefile)
python -m venv backend/aigt

# 3. Environment
cp backend/.env.example backend/.env    # isi API key & DATABASE_URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local

# 4. Install dependency (frontend + backend)
make install

# 5. Migrasi & seed template
make migrate                            # alembic upgrade head
make seed                               # reset + insert templates dari JSON

# 6. Jalankan keduanya
make dev                                # frontend :3000 + backend :8000
```

Target Makefile lain: `make backend`, `make frontend`, `make reconcile` (selaraskan schema DB lama
yang drift ke head — sekali jalan, idempoten).

Alternatif full-container: `docker compose up` (db + backend + frontend).

---

## 15. Testing & Quality Gate

Workflow **TDD wajib** (Red → Green → Refactor). Tidak ada implementasi tanpa test yang gagal lebih dulu;
tidak boleh merge dengan test gagal atau coverage di bawah minimum.

```bash
cd backend
aigt/bin/pytest                              # semua test (asyncio_mode=auto)
aigt/bin/pytest --cov=app --cov-report=term-missing
```

Struktur test: `tests/conftest.py` (fixtures: test DB, mock AI, auth token), `tests/unit/*`,
`tests/integration/*`.

**Frontend** memakai **Vitest** (+ Testing Library, jsdom): `cd frontend && npm test` (`vitest run`),
`npm run test:coverage`. Unit test ada untuk lib editor (`merge`, `canvas-spec`, `preview-config`),
brief (`brief-schema`, `brief-completion`), dan komponen UI (`dropdown`).

**Test wajib per endpoint (minimal):** happy path, auth failure (401), forbidden (403),
not found (404), validation error (400), AI failure mock (mengikuti aturan Section 6), business logic.

**Coverage minimum:**
| Layer | Minimum |
|---|---|
| Endpoints (routes) | 90% |
| Services (business logic) | 85% |
| AI service module | 80% (mock) |
| Storage service module | 80% (mock) |
| Database models | 70% |

---

## 16. Larangan Kunci (Ringkasan)

| # | Larangan | Alasan |
|---|---|---|
| 1 | Hardcode nama model AI di kode | Harus dapat ganti provider via env |
| 2 | Panggil AI API langsung dari router | Semua AI call lewat `ai_service.py` |
| 3 | Modifikasi `template_config` di DB | Template integrity — backend hanya membaca |
| 4 | Expose stack trace ke client | Log di server; client hanya menerima error code |
| 5 | Implementasi sebelum test gagal | TDD wajib |
| 6 | Commit `.env` | Secret management |
| 7 | Merge di bawah coverage minimum | Quality gate |
| 8 | Image failure menggagalkan session | Image adalah optional layer |
| 9 | Panggil dua provider AI sequential | Harus paralel (`asyncio.gather`) |
| 10 | Simpan session state di memory backend | Backend harus stateless |

---

*Dokumen ini menggambarkan kondisi implementasi aktual di branch `dev`. Jika kode berubah,
perbarui dokumen ini bersamaan dengan perubahan tersebut.*
