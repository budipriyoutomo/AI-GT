---
description: Pre-push gate — cek backward-compatibility lalu sinkronkan dokumen konteks. Jalankan sebelum commit/push manual. TIDAK commit.
---

Jalankan pemeriksaan pra-push lalu sinkronkan dokumentasi. **JANGAN commit/push** — user yang melakukannya setelah review.

**HEMAT TOKEN:** lihat diff dulu, jalankan HANYA cek yang relevan dengan area yang berubah, jangan eksplor file yang tak tersentuh.

## 1. Lihat scope perubahan
- `git status` dan `git diff --stat` (staged + unstaged) → tentukan apakah backend, frontend, atau dokumen yang berubah. Selebihnya menyesuaikan ini.

## 2. Cek backward-compatibility (sesuaikan area yang berubah)
- **Konsumen bentuk lama:** `grep -rn "preview_config\|_build_preview_config\|\.zones" backend/app backend/tests frontend/src` → harus kosong (atau hanya komentar/test yang disengaja).
- **Backend berubah:** `cd backend && aigt/bin/python -m pytest -q`. Catatan: kegagalan di `test_ai_service`/`test_replicate_image` karena `ReplicateError 401` = environment (tak ada API token), **bukan** blocker.
- **Frontend berubah:** `cd frontend && npx tsc --noEmit -p tsconfig.json` + `npx eslint <file yang berubah>`. Untuk perubahan besar/berisiko, `npm run build`.
- **Data template (JSON):** validasi tiap JSON yang berubah bisa di-`json.load`, dan bila relevan loader seed (`load_templates`) jalan.
- **Dependency baru:** kalau `package.json` berubah, pastikan lockfile (`package-lock.json`) ikut berubah — jangan ketinggalan.
- **Risiko data (bukan kode):** kalau struktur `template_config` berubah, ingatkan bahwa baris template bentuk LAMA di DB lain bisa tampil rusak (seed non-destruktif tidak menghapusnya).

## 3. Sinkronkan dokumen konteks
Dari diff, identifikasi perubahan yang MENGUBAH konteks terdokumentasi: tipe/field element baru, mekanisme baru, konvensi, keputusan arsitektur, perubahan schema/endpoint. Update **HANYA** yang out-of-sync, **edit bedah (jangan tulis ulang)**:
- `backend/scripts/seed_template_data/README.md` — aturan & tipe element template.
- `AGENTS.md` — konvensi/instruksi proyek tingkat tinggi.
- Memory (`MEMORY.md` + file memory) — fakta durable lintas-sesi.

## 4. Laporkan (jangan commit)
- Ringkasan hasil cek: lulus/gagal + apa yang gagal & kenapa.
- Doc apa yang di-sync (atau "sudah sinkron, tak perlu update").
- Hal yang perlu user putuskan/perhatikan sebelum push.
- Tegaskan: **tidak ada commit/push** dilakukan.
