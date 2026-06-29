# AI-GT — AI Content Generator Tools

Platform SaaS untuk generate konten visual marketing berbasis AI, ditujukan untuk pelaku UKM Indonesia.
User memilih template, mengisi brief kampanye, lalu AI generate copy + thematic image dalam 3 varian.
User memilih varian, edit di canvas editor, lalu export sebagai PNG.

Monorepo:

```
ai-gt/
├── frontend/   → Next.js (React, TypeScript) — http://localhost:3000
├── backend/    → FastAPI (Python)            — http://localhost:8000
├── docs/       → PRD & dokumen teknis
├── Makefile    → shortcut run / seed / install
└── AGENTS.md   → instruksi wajib untuk AI coding assistant
```

> 📌 Sebelum berkontribusi, baca **[AGENTS.md](AGENTS.md)** (aturan TDD, API response standard,
> AI integration, template integrity) dan **[docs/](docs/)** (PRD tersinkron & logika render template).

---

## Prasyarat

| Tool | Versi | Catatan |
| :---- | :---- | :---- |
| Node.js | ≥ 18 | untuk frontend (Next.js 16) |
| Python | ≥ 3.11 | untuk backend (FastAPI) |
| PostgreSQL | 16 | bisa lewat Docker (lihat di bawah) |
| virtualenv backend | — | diharapkan ada di `backend/aigt/` (dipakai Makefile) |

---

## Setup Awal (sekali jalan)

```bash
# 1. Siapkan database PostgreSQL (opsi cepat: Docker)
docker compose up -d db          # Postgres di localhost:5432 (user/pass/db: aigt/aigt/aigt_db)

# 2. Buat virtualenv backend (Makefile mengharapkan path backend/aigt/)
python -m venv backend/aigt

# 3. Salin & isi environment variables
cp backend/.env.example backend/.env        # isi API key & DATABASE_URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local

# 4. Install semua dependency (frontend + backend)
make install

# 5. Jalankan migrasi database
cd backend && aigt/bin/alembic upgrade head && cd ..

# 6. Seed template ke database
make seed
```

> ⚠️ `backend/.env.example` saat ini berisi kredensial Cloudflare R2 yang terlihat asli — **ganti dengan
> nilai sendiri** dan jangan pernah commit `backend/.env`. Lihat catatan keamanan di bawah.

---

## Perintah Makefile

Semua dijalankan dari root repo.

| Perintah | Fungsi |
| :---- | :---- |
| `make dev` | Jalankan **frontend + backend sekaligus** (paralel) |
| `make frontend` | Frontend saja (Next.js) → http://localhost:3000 |
| `make backend` | Backend saja (FastAPI/uvicorn, `--reload`) → http://localhost:8000 |
| `make migrate` | `alembic upgrade head` — terapkan semua migrasi (DB baru / yang sudah selaras) |
| `make reconcile` | **Sekali jalan**: selaraskan schema DB *existing* yang drift akibat revisi Alembic lama yang sempat duplikat. DB baru tidak perlu ini |
| `make seed` | Seed templates ke DB — **RESET tabel `templates`** lalu insert ulang dari JSON di `backend/scripts/seed_template_data/` |
| `make install` | Install dependency frontend (`npm install`) + backend (`pip install -r requirements.txt`) |
| `make help` | Tampilkan ringkasan perintah |

> Makefile memakai virtualenv di `backend/aigt/bin`. Kalau venv kamu di lokasi lain, sesuaikan
> variabel `VENV` di [Makefile](Makefile) atau jalankan perintahnya manual (lihat di bawah).

---

## Menjalankan Tanpa Makefile (manual)

**Backend:**
```bash
cd backend
source aigt/bin/activate          # aktifkan virtualenv
uvicorn app.main:app --reload     # http://localhost:8000  (docs: /docs)
```

**Frontend:**
```bash
cd frontend
npm run dev                       # http://localhost:3000
```

---

## Database & Migrasi (Alembic)

```bash
cd backend
aigt/bin/alembic upgrade head                       # terapkan semua migrasi
aigt/bin/alembic revision -m "deskripsi perubahan"  # buat migrasi baru (manual edit)
aigt/bin/alembic downgrade -1                        # rollback 1 langkah
aigt/bin/alembic current                             # cek versi migrasi sekarang
```

Migrasi ada di `backend/alembic/versions/`. Konfigurasi koneksi diambil dari `DATABASE_URL` di `backend/.env`.

### Reconcile schema (sekali jalan — untuk DB yang sudah terlanjur ada)

Riwayat migrasi sempat memakai **revisi duplikat** (dua `0002`, dua `0003`), sehingga sebagian
migrasi tidak ter-apply dan schema DB lama bisa drift dari model (mis. kolom `templates.platform`
& `generate_sessions.{goal,platform,content_data}` hilang → error *"column does not exist"*).
Revisi sudah dilinearkan menjadi `0001 → 0006` (satu head).

**Siapa yang perlu apa:**

| Kondisi DB | Yang dijalankan |
| :---- | :---- |
| **DB baru** / dibuat ulang dari nol | `make migrate` saja (rantai `0001→0006` jalan bersih). **Tidak** perlu reconcile. |
| **DB existing** yang dibuat sebelum perbaikan ini (mungkin drift) | `make reconcile` **sekali**, lalu lanjut seperti biasa. |

```bash
make reconcile      # idempoten & aman diulang; stamp alembic_version ke 0006
make migrate        # verifikasi: harusnya no-op
make seed
```

> Buat partner kerja saat merge ke `dev`: kalau DB dev-nya disposable, **paling gampang recreate fresh**
> lalu `make migrate` — nol SQL manual. Reconcile hanya untuk DB existing yang ingin dipertahankan datanya.
> Detail SQL ada di [`backend/scripts/reconcile_schema.sql`](backend/scripts/reconcile_schema.sql).

---

## Seed Template

```bash
make seed
# atau manual:
cd backend && aigt/bin/python scripts/seed_templates.py
```

- Sumber data: file JSON di **`backend/scripts/seed_template_data/`**.
- Script ini **menghapus & mengisi ulang** tabel `templates` (destruktif — aman dijalankan ulang).
- Sebelum menambah/mengubah template JSON, **wajib baca**
  [`backend/scripts/seed_template_data/README.md`](backend/scripts/seed_template_data/README.md)
  (aturan TEMPLATE vs GAMBAR, struktur `elements`, kontrak slot AI `role` vs `bind`).

---

## Testing & Lint

**Backend (pytest, TDD wajib — lihat AGENTS.md §3):**
```bash
cd backend
aigt/bin/pytest                                   # jalankan semua test
aigt/bin/pytest --cov=app --cov-report=term-missing   # dengan coverage
```
Coverage minimum: endpoints 90%, services 85%, AI/storage module 80%, models 70%.

**Frontend (lint):**
```bash
cd frontend
npm run lint
npm run build      # cek build production
```

---

## Menjalankan via Docker (alternatif full-stack)

```bash
cp backend/.env.example backend/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
docker compose up --build          # db + backend + frontend
```

Service: `db` (Postgres 5432), `backend` (8000), `frontend` (3000). Lihat [docker-compose.yml](docker-compose.yml).

---

## Environment Variables

### `backend/.env` (lihat `backend/.env.example`)

| Variabel | Keterangan |
| :---- | :---- |
| `DATABASE_URL` | Koneksi PostgreSQL |
| `AUTH_PROVIDER` | `jwt` atau `supabase` |
| `JWT_SECRET_KEY` / `JWT_ALGORITHM` / `JWT_EXPIRE_HOURS` | dipakai jika `AUTH_PROVIDER=jwt` |
| `AI_COPY_PROVIDER` / `AI_COPY_MODEL` | provider & model AI copy (mis. `anthropic` / `claude-haiku-4-5`) |
| `AI_IMAGE_PROVIDER` / `AI_IMAGE_MODEL` | provider & model AI image (mis. `replicate` / `stability-ai/sdxl`) |
| `ANTHROPIC_API_KEY` / `REPLICATE_API_TOKEN` / `DEEPSEEK_API_KEY` | API keys |
| `CLOUDFLARE_R2_*` | account id, access key, secret key, bucket name |

> Nama model AI **tidak boleh di-hardcode** di kode — selalu dari env var (AGENTS.md §5).

### `frontend/.env.local`

| Variabel | Keterangan |
| :---- | :---- |
| `NEXT_PUBLIC_API_URL` | URL backend, mis. `http://localhost:8000` |

---

## ⚠️ Catatan Keamanan

`backend/.env.example` yang ter-commit saat ini memuat nilai `CLOUDFLARE_R2_*` yang menyerupai kredensial
asli. `.env.example` seharusnya hanya berisi **placeholder**. Disarankan:
- Ganti nilai-nilai itu dengan placeholder (mis. `your-r2-access-key`).
- Rotasi kredensial R2 tersebut jika memang asli & sudah pernah ter-push.
- Pastikan `backend/.env` (file asli) tidak pernah di-commit.

---

## Struktur & Konvensi

Lihat **[AGENTS.md](AGENTS.md)** untuk: struktur folder lengkap, konvensi penamaan, API response standard,
aturan AI integration, storage flow (Cloudflare R2), error handling, dan checklist sebelum submit PR.
Dokumen produk & flow ada di **[docs/](docs/)** dan **[FlowGenerate.md](FlowGenerate.md)**.
