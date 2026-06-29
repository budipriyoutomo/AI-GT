# AGENTS.md — AI-GT (AI Content Generator Tools)

Dokumen ini adalah instruksi wajib untuk semua AI coding assistant yang mengerjakan project AI-GT.
Baca seluruh dokumen ini sebelum menulis satu baris kode pun.

---

## 1. Tentang Project Ini

**AI-GT** adalah platform SaaS untuk generate konten visual marketing berbasis AI, ditujukan untuk pelaku UKM Indonesia. User memilih template, mengisi brief kampanye, lalu AI generate copy + thematic image dalam 3 varian. User memilih varian, edit di canvas editor, lalu export sebagai PNG.

**Monorepo structure:**
```
ai-gt/
├── frontend/     → Next.js (React, TypeScript)
├── backend/      → FastAPI (Python)
└── AGENTS.md     → (file ini)
```

---

## 2. Referensi Teknis Wajib

Sebelum mengerjakan task apapun, pahami urutan referensi berikut dari Tech Docs:

| Urutan | Section | Baca untuk |
|---|---|---|
| 1 | Section 1 — System Architecture | Gambaran keseluruhan sistem, stack, dan flow |
| 2 | Section 2 — Database Schema | Schema tabel sebelum implement endpoint apapun |
| 3 | Section 3 — API Response Standard | Format response yang wajib diikuti semua endpoint |
| 4 | Section 4 — AI Integration Layer | Detail teknis pemanggilan AI copy & image |
| 5 | Section 5 — Storage Flow | Logic temp vs permanent di Cloudflare R2 |
| 6 | Section 6 — Error Handling | Aturan graceful error untuk semua kondisi |
| 7 | Section 7 — TDD Workflow | Workflow test wajib sebelum implementasi |
| 8 | Section 8 — Project Structure | Struktur folder dan konvensi penamaan |
| 9 | Section 9 — AI Provider Design | Desain pluggable AI provider |

---

## 3. TDD — Aturan Tidak Dapat Dilanggar

TDD adalah **workflow wajib**, bukan opsional. Tidak ada implementasi tanpa test.

### Urutan yang benar: Red → Green → Refactor

```
🔴 RED     →  Tulis test untuk fitur yang BELUM ada. Test harus failing.
🟢 GREEN   →  Tulis implementasi MINIMUM yang membuat test passing. Tidak lebih.
🔵 REFACTOR →  Perbaiki kode tanpa mengubah behavior. Test harus tetap passing.
```

### Larangan keras:
- ❌ Jangan tulis implementasi sebelum ada test yang failing
- ❌ Jangan tulis lebih dari yang dibutuhkan untuk membuat test passing
- ❌ Jangan merge jika ada test yang failing

### Test wajib per endpoint (minimal):

| Test case | Deskripsi |
|---|---|
| ✅ Happy path | Input valid → response sesuai schema Section 3 |
| ✅ Auth failure | Request tanpa token / token expired → 401 |
| ✅ Forbidden | User akses resource milik user lain → 403 |
| ✅ Not found | Resource ID tidak ada → 404 |
| ✅ Validation error | Required field kosong / format salah → 400 |
| ✅ AI failure mock | Simulasi Haiku/image provider error → response sesuai Section 6 |
| ✅ Business logic | Validasi rule bisnis spesifik (contoh: session expired → SESSION_EXPIRED) |

### Coverage minimum (jalankan `pytest --cov=app --cov-report=term-missing`):

| Layer | Minimum |
|---|---|
| Endpoints (routes) | 90% |
| Services (business logic) | 85% |
| AI service module | 80% — gunakan mock |
| Storage service module | 80% — gunakan mock |
| Database models | 70% |

---

## 4. API Response Standard

**Semua endpoint tanpa terkecuali** harus mengikuti format ini.

### Success
```json
{
  "success": true,
  "data": {},
  "message": "string (optional)"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Error codes yang valid (gunakan konstanta, bukan string bebas):

```
AUTH_INVALID_CREDENTIALS     AUTH_EMAIL_NOT_VERIFIED      AUTH_TOKEN_EXPIRED
PROFILE_NOT_FOUND            TEMPLATE_NOT_FOUND           SESSION_NOT_FOUND
SESSION_EXPIRED              VARIANT_NOT_SELECTED         AI_GENERATION_FAILED
STORAGE_UPLOAD_FAILED        RATE_LIMIT_EXCEEDED
```

### HTTP Status Code:
- `200` — berhasil | `201` — resource dibuat | `400` — input validation error
- `401` — unauthorized | `403` — forbidden | `404` — not found
- `422` — invalid secara bisnis | `429` — rate limit | `500` — internal error
- `503` — external service (AI provider) unavailable

---

## 5. Aturan AI Integration

### Prinsip utama:
- **Semua AI call harus melalui `app/services/ai_service.py`** — tidak boleh inline di router atau endpoint manapun
- **Nama model tidak boleh di-hardcode** di kode — selalu baca dari environment variable
- AI teks dan AI gambar diperlakukan sebagai **dua provider terpisah** dengan interface masing-masing

### Struktur AI service (Section 9 — pluggable design):
```
backend/app/services/
├── ai_service.py          ← Orkestrasi utama (baca env, routing ke provider)
├── providers/
│   ├── base_copy.py       ← Interface/Protocol untuk copy provider
│   ├── base_image.py      ← Interface/Protocol untuk image provider
│   ├── anthropic_copy.py  ← Implementasi Haiku (atau model lain)
│   └── replicate_image.py ← Implementasi SDXL (atau model lain)
```

### Aturan failure AI (wajib diikuti):

| Kondisi | Tindakan |
|---|---|
| Copy provider timeout > 30 detik | Update session status → `failed`, return `AI_GENERATION_FAILED` |
| Copy provider return invalid JSON | Retry maksimal 2 kali, setelah itu declare failed |
| Image provider timeout > 60 detik | Skip thematic image, lanjut generate dengan copy saja |
| Image provider return error | Sama seperti timeout — session tetap `completed` tanpa image |

> ⚠️ **Image provider failure tidak boleh menggagalkan session.** Copy adalah output utama. Thematic image adalah optional layer.

### Environment variables yang diperlukan:
```env
# backend/.env
AI_COPY_PROVIDER=anthropic          # nama provider aktif
AI_COPY_MODEL=claude-haiku-4-5      # nama model — ganti di sini, 0 perubahan kode
AI_IMAGE_PROVIDER=replicate         # nama provider aktif
AI_IMAGE_MODEL=stability-ai/sdxl    # nama model
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...
DATABASE_URL=postgresql://...
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=ai-gt-bucket
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
```

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 6. Template Integrity

Template adalah anchor visual yang **tidak pernah dimodifikasi** oleh backend atau AI.

### Yang boleh dilakukan AI:
- ✅ Generate copy (headline, body, CTA)
- ✅ Suggest typography (font name, size, letter spacing — Google Fonts only)
- ✅ Generate thematic image (elemen visual opsional, terpisah dari background template)

### Yang dilarang keras:
- ❌ Memodifikasi `template_config` di database
- ❌ Mengubah layout, background color, atau background image template
- ❌ Menimpa color scheme template

### Membuat/mengubah template JSON

> 📐 **Sebelum menulis atau mengubah file `template_config` JSON** (di `backend/scripts/seed_template_data/`),
> WAJIB baca dulu **`backend/scripts/seed_template_data/README.md`** — aturan pemisahan TEMPLATE vs GAMBAR,
> struktur `elements`, dan kontrak slot AI (`role` vs `bind`).

---

## 7. Storage Flow

### Struktur folder R2:
```
ai-gt-bucket/
├── temp/
│   └── thematic-images/{session_id}/{timestamp}.png   ← TTL 1 jam
└── permanent/
    ├── thematic-images/{user_id}/{project_id}.png      ← Dipindah saat pilih varian
    ├── exported/{user_id}/{project_id}/export.png      ← Final PNG setelah export
    ├── logos/{user_id}/logo.{ext}                      ← Logo company profile
    └── templates/thumbnails/{template_id}.png          ← Thumbnail template
```

### Lifecycle image:
1. Generate → upload ke `temp/` dengan TTL 1 jam
2. User pilih varian → **move** (bukan copy) ke `permanent/thematic-images/`
3. User export → upload ke `permanent/exported/`
4. Session expire → auto-delete file di `temp/` (cron setiap 30 menit)

> ⚠️ Implement scheduled cleanup job yang baca `expires_at` dari tabel `generate_sessions` untuk hapus file temp yang sudah expired.

---

## 8. Konvensi Penamaan

### Backend (Python/FastAPI):

| Layer | Konvensi | Contoh |
|---|---|---|
| Router | snake_case, noun plural | `generate_sessions.py` |
| Service | snake_case + `_service` suffix | `ai_service.py` |
| Model (ORM) | snake_case, noun singular | `generate_session.py` |
| Schema (Pydantic) | snake_case, noun singular | `generate.py` |
| Test file | prefix `test_` | `test_generate.py` |

### Frontend (TypeScript/Next.js):

| Layer | Konvensi | Contoh |
|---|---|---|
| Component | PascalCase | `GenerateForm.tsx` |
| Hook | camelCase + prefix `use` | `useGenerateSession.ts` |
| Type/Interface | PascalCase | `GenerateSession.ts` |
| Service/API layer | camelCase | `generateService.ts` |
| Util | camelCase | `formatDate.ts` |

---

## 9. Struktur Folder Referensi

```
ai-gt/
├── frontend/
│   └── src/
│       ├── app/                   ← Next.js App Router (routing only, tipis)
│       │   ├── (auth)/login/
│       │   ├── (auth)/register/
│       │   ├── (dashboard)/dashboard/
│       │   ├── (dashboard)/create/
│       │   ├── (dashboard)/projects/
│       │   └── (dashboard)/settings/
│       ├── components/
│       │   ├── ui/                ← Reusable UI components
│       │   ├── editor/            ← Canvas editor components
│       │   ├── generate/          ← Generate flow components
│       │   └── template/          ← Template browser components
│       ├── lib/
│       │   ├── api.ts             ← API client (semua fetch ke backend)
│       │   └── utils.ts
│       ├── hooks/                 ← Custom React hooks
│       └── types/                 ← TypeScript type definitions
│
└── backend/
    ├── app/
    │   ├── main.py                ← FastAPI entry point
    │   ├── config.py              ← Environment variables & settings
    │   ├── database.py            ← DB connection & session
    │   ├── models/                ← SQLAlchemy ORM models
    │   ├── schemas/               ← Pydantic request/response schemas
    │   ├── routers/               ← FastAPI route handlers
    │   ├── services/              ← Business logic & external integrations
    │   │   ├── ai_service.py      ← Orkestrasi AI (entry point)
    │   │   ├── providers/         ← Implementasi per AI provider
    │   │   ├── storage_service.py ← Cloudflare R2
    │   │   ├── auth_service.py
    │   │   └── generate_service.py
    │   └── utils/
    │       ├── auth.py            ← JWT helpers
    │       └── exceptions.py      ← Custom exception handlers
    └── tests/
        ├── conftest.py            ← Fixtures global: test DB, mock AI, auth token
        ├── unit/
        │   ├── test_auth.py
        │   ├── test_company_profile.py
        │   ├── test_generate.py
        │   ├── test_ai_service.py
        │   ├── test_storage.py
        │   └── test_projects.py
        └── integration/
            ├── test_generate_flow.py
            └── test_auth_flow.py
```

---

## 10. Hal yang Dilarang — Ringkasan

| # | Larangan | Alasan |
|---|---|---|
| 1 | ❌ Hardcode nama AI model di kode | Harus bisa ganti provider via env var tanpa ubah kode |
| 2 | ❌ Panggil AI API langsung dari router | Semua AI call harus melalui `ai_service.py` |
| 3 | ❌ Modifikasi `template_config` di database | Template Integrity — backend hanya membaca template |
| 4 | ❌ Expose stack trace ke client response | Log di server, return error code yang bersih ke client |
| 5 | ❌ Tulis implementasi sebelum test failing | TDD adalah workflow wajib |
| 6 | ❌ Commit file `.env` ke repo | Secret management — gunakan `.env.example` sebagai referensi |
| 7 | ❌ Merge PR jika coverage di bawah minimum | Quality gate yang tidak boleh dikompromikan |
| 8 | ❌ AI image failure menggagalkan session | Image adalah optional layer — copy adalah output utama |
| 9 | ❌ Panggil dua AI provider secara sequential | Haiku + image provider harus dipanggil secara paralel (`asyncio.gather`) |
| 10 | ❌ Simpan session state di backend memory | Backend harus stateless — semua state ada di database |

---

## 11. Checklist Sebelum Submit PR

- [ ] Semua test baru berjalan dengan status PASSED
- [ ] Coverage tidak turun di bawah minimum per layer
- [ ] Semua response mengikuti format Section 3
- [ ] Tidak ada hardcode model name atau API key di kode
- [ ] AI call dilakukan melalui `ai_service.py`, bukan inline
- [ ] Error handling mengikuti aturan Section 6
- [ ] Tidak ada modifikasi pada `template_config`
- [ ] File `.env` tidak ikut ter-commit
