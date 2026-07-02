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
│   ├── alembic/versions/        → migrasi 0001…0007
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
`brand_colors` (JSON list), `brand_font`, `tagline`, `contact` (JSON), `language_preference`
(default `"id"`). Company profile **wajib ada** sebelum generate (kalau tidak → `PROFILE_NOT_FOUND`).

### `templates`
Anchor visual. Kolom penting:
| Kolom | Tipe | Catatan |
|---|---|---|
| name, industry, theme | String | metadata & filter |
| content_type | String(20) | `"Single"` \| `"Carousel"` |
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
`image_prompt`, dan subset read-only dari `template_config` (background, color_scheme, layout,
slide_count) — inilah payload yang di-render canvas editor.

### Relasi (ringkas)

```
User ──1:1── CompanyProfile
User ──1:N── GenerateSession ──1:N── GenerateVariant
User ──1:N── Project ──1:1── GenerateSession
                    └──1:1── GenerateVariant
Template ──1:N── GenerateSession
```

Migrasi dikelola Alembic (`0001_initial_schema` … `0007_add_background_url_to_templates`).

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

### Company Profile — `/api/v1/company-profile`
| Method | Path | Deskripsi |
|---|---|---|
| GET | `` | Ambil profil user |
| POST | `` | Buat profil (201) |
| PATCH | `` | Update profil |

### Templates — `/api/v1/templates`
| Method | Path | Deskripsi |
|---|---|---|
| GET | `?industry=&theme=` | List template aktif (proyeksi kolom untuk list, filter opsional) |
| GET | `/{template_id}` | Detail satu template (404 `TEMPLATE_NOT_FOUND`) |

### Generate — `/api/v1/generate`
| Method | Path | Deskripsi |
|---|---|---|
| POST | `/session` | Buat session; memicu **background task** generate. Return `{id, status}` (201) |
| GET | `/session/{session_id}` | Poll status + varian. 403 jika bukan milik user, 422 jika expired |
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
      ├─ Susun CopyInput (brand, brief, template_theme, content_type, slide_count)
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
├── ai_types.py                ← CopyInput/CopyResult/CopyVariant, ImageInput/ImageResult,
│                                 exceptions (CopyError, CopyTimeoutError, CopyInvalidJsonError,
│                                 ImageError, ImageTimeoutError, ImageProviderError)
├── base_copy.py               ← Protocol: async generate_copy(CopyInput) -> CopyResult
├── base_image.py              ← Protocol image provider
├── anthropic_copy.py          ← implementasi Haiku
├── deepseek_copy.py           ← implementasi DeepSeek (OpenAI-compatible SDK)
├── replicate_image.py         ← implementasi SDXL
└── copy_prompt.py             ← template prompt (mis. IMAGE_SUGGESTIONS_PROMPT)
```

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

### Struktur bucket
```
ai-gt-bucket/
├── temp/thematic-images/{session_id}/{timestamp}.png      ← TTL 1 jam
└── permanent/
    ├── thematic-images/{user_id}/{project_id}.png          ← saat pilih varian
    ├── thumbnails/{user_id}/{project_id}.png               ← snapshot editor per auto-save
    └── exported/{user_id}/{project_id}/export.png          ← PNG final
```

### Lifecycle
1. Generate → `upload_temp()` ke `temp/`.
2. Pilih varian → `move_to_permanent()` (copy + delete temp) → `permanent/thematic-images/`.
   Jika URL eksternal (bukan temp/permanent) → di-download & `upload_permanent_thematic()`.
3. Regenerate gambar dari editor → `upload_permanent_thematic()` + update `final_config`.
4. Export → `upload_exported()`.
5. Kegagalan upload → `AppError(500, STORAGE_UPLOAD_FAILED)`.

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
- **Template rendering** — `components/template/TemplateRenderer.tsx` me-render `template_config` +
  data hasil generate. Logika merge tiga sumber (`template_config` + `company_profile` +
  `generate_config`) di runtime dijelaskan di [`docs/render-template-logic.md`](render-template-logic.md).
- **Editor** — `components/editor/FabricCanvas.tsx` (Fabric.js 6) untuk edit & export PNG;
  `hooks/useAutoSave.ts` menyimpan snapshot thumbnail secara berkala.
- **`hooks/useGenerateSession.ts`** — mengelola polling status session sampai `completed`/`failed`.

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

*Dokumen ini menggambarkan kondisi implementasi aktual di branch `devv2`. Jika kode berubah,
perbarui dokumen ini bersamaan dengan perubahan tersebut.*
