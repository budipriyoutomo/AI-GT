---
description: Sinkronkan docs/PRD-AI-GT-v2-synced.md & docs/TECHNICAL_DOCUMENTATION.md dengan fitur yang sudah diimplementasi tapi belum terdokumentasi. TIDAK commit.
---

Update dua dokumen konteks produk/teknis berdasarkan perubahan yang BELUM tercermin di dalamnya. **JANGAN commit/push** — user yang review & commit sendiri.

**HEMAT TOKEN:** cek `--stat` dulu sebelum baca diff penuh; baca hanya file yang relevan dengan delta yang doc-worthy.

## 1. Tentukan scope per dokumen

Tiap dokumen disinkronkan dari commit TERAKHIR ia diubah — bukan dari satu titik bersama, karena PRD dan Tech Doc bisa drift dengan kecepatan berbeda:

```bash
PRD_BASE=$(git log -1 --format=%H -- docs/PRD-AI-GT-v2-synced.md)
TECH_BASE=$(git log -1 --format=%H -- docs/TECHNICAL_DOCUMENTATION.md)

git diff "$PRD_BASE" --stat -- . ':(exclude)docs/PRD-AI-GT-v2-synced.md' ':(exclude)docs/TECHNICAL_DOCUMENTATION.md'
git diff "$TECH_BASE" --stat -- . ':(exclude)docs/PRD-AI-GT-v2-synced.md' ':(exclude)docs/TECHNICAL_DOCUMENTATION.md'
```

Ini menangkap commit yang sudah masuk MAUPUN working tree yang belum commit (satu base vs kondisi sekarang) — jadi seluruh delta yang terakumulasi sejak dokumen terakhir disentuh ikut tertangkap, termasuk dari sesi-sesi sebelumnya. Kalau `*_BASE` kosong (dokumen belum pernah dicommit terpisah), pakai commit pertama repo sebagai base.

## 2. Identifikasi delta yang doc-worthy

Dari diff, cari perubahan yang mengubah kontrak/perilaku yang terdokumentasi — BUKAN detail implementasi internal:
- Field/endpoint/kolom DB baru, berubah, atau dihapus.
- Flow user baru atau berubah (step generate, onboarding, dll).
- Konvensi atau keputusan arsitektur baru.
- Enum/opsi baru (goal, platform, gaya bahasa, image_source, dst).
- Known gap (§11 PRD) yang baru KETUTUP oleh perubahan ini.
- Migrasi Alembic baru → nomor migrasi terbaru berubah.

Abaikan: refactor internal tanpa perubahan kontrak, rename variabel lokal, bugfix yang tidak mengubah behavior terdokumentasi, perubahan test-only (kecuali ia menyingkap business rule baru yang belum pernah tertulis).

## 3. Update — edit bedah, JANGAN tulis ulang

**`docs/PRD-AI-GT-v2-synced.md`** — ikuti konvensi yang SUDAH ada di file:
- Tandai delta dengan **[NEW]** / **[CHANGED]** / **[DROPPED]** inline, konsisten dengan gaya existing di sekitarnya.
- Tambah baris ke tabel **§12 Changelog vs PRD Awal** untuk tiap delta signifikan.
- Kalau delta ini menutup salah satu **§11 Known Gaps**, update atau hapus entry tersebut.
- Update tanggal sync di baris pembuka (`per YYYY-MM-DD`) ke tanggal hari ini.

**`docs/TECHNICAL_DOCUMENTATION.md`** — dokumen deskriptif (bukan delta-tracked), jadi langsung update section terkait jadi kondisi terkini (tanpa tag [CHANGED]):
- §5 Model Data — kolom/tabel DB baru atau berubah.
- §7 Referensi Endpoint — endpoint baru/berubah.
- §8 Alur Generate — kalau flow generate berubah.
- Nomor migrasi terakhir (§4 Struktur Repository + penutup §5) — samakan dengan file terbaru di `alembic/versions/`.
- Baris penutup ("kondisi implementasi aktual di branch `devv2`") — update nama branch kalau sudah tidak akurat.

## 4. Laporkan (jangan commit)
- Delta apa yang ditemukan per dokumen (atau "sudah sinkron, tidak ada yang perlu diupdate").
- Section mana yang diedit, ringkas.
- Hal yang butuh keputusan user (mis. delta ambigu: masuk PRD, Tech doc, keduanya, atau tidak keduanya).
- Tegaskan: **tidak ada commit/push** dilakukan.
