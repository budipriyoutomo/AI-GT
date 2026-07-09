# Handoff: Fix Template Preview Rendering Mismatch (Gallery → Create Step 2)

## Context untuk Claude Code

Baca dulu sebelum eksekusi:
- `docs/render-template-logic.md` — prinsip merge runtime, jangan simpan hasil merge
- `docs/PRD-AI-GT-v2-synced.md` §4.2 — kontrak `brand_theme` (mode `tint`/`derive`)
- `components/template/TemplateRenderer.tsx` — komponen render yang sudah ada, dipakai di modal preview galeri
- Ikuti AGENTS.md soal TDD wajib (Red → Green → Refactor) dan API standard yang berlaku di repo ini.

**Jangan mulai coding sebelum baca 3 dokumen di atas + inspect `TemplateRenderer.tsx` props signature yang sudah ada.**

---

## Problem Statement

Di halaman galeri (`/templates`), modal preview template punya toggle **"Preview dengan brand color"** yang me-render template pakai `TemplateRenderer` — bisa switch antara tampilan asli (`template_config` as-is) vs adaptasi brand user (`brand_theme` tint/derive).

Setelah user klik **"Pakai template ini"** dan masuk ke `/create?templateId={id}` (Step 2 — Isi Brief), panel "TEMPLATE DIPILIH" di sebelah kiri **tidak merefleksikan pilihan toggle user**. Saat ini panel tersebut kemungkinan besar cuma render `<img src={thumbnail_url}>` statis (thumbnail galeri), bukan live-render dari `TemplateRenderer`. Akibatnya:

1. User yang toggle "brand color" di modal, begitu lanjut ke create page, melihat template asli (atau sebaliknya) — inconsistent dengan apa yang mereka pilih.
2. Ada dua jalur render berbeda untuk template yang sama: satu di modal galeri (live, component-based), satu di create page (kemungkinan static image).

## Root Cause

Bukan soal transport data — masalahnya create page belum reuse component render yang sama. Fix ini punya 2 bagian: (1) passing toggle state antar page, (2) ganti render statis jadi live render pakai `TemplateRenderer`.

---

## Scope of Work

### 1. Passing state: query param, bukan hasil merge

Tambahkan query param `brandPreview` (boolean) ke navigasi dari modal galeri ke create page:

```
/create?templateId={templateId}&brandPreview=true|false
```

- Value merefleksikan toggle state terakhir user di modal SEBELUM klik "Pakai template ini".
- **Default value kalau user tidak pernah toggle: `false`** (tampilkan template asli / `template_config` as-is). Konfirmasi dulu ke Irfan kalau ada indikasi default seharusnya beda — tapi kalau tidak ada instruksi lain, pakai `false`.
- **JANGAN** serialize hasil render (computed colors, resolved font, dll) ke query string atau ke storage apapun. Yang dibawa cuma boolean toggle. Ini eksplisit dilarang oleh `render-template-logic.md`: *"Jangan simpan hasil merge ke database"* — prinsip yang sama berlaku untuk client-side state, jangan taruh computed output di URL/localStorage/sessionStorage.

### 2. Ganti panel statis di create page jadi live render

Di `/create` Step 2 (komponen yang render panel "TEMPLATE DIPILIH"):

- Ganti `<img src={thumbnail_url}>` (atau apapun implementasi statis saat ini — **cek dulu kode aktualnya**, jangan asumsi) dengan pemanggilan `TemplateRenderer` yang sama persis dipakai modal preview galeri.
- Input yang dibutuhkan `TemplateRenderer`:
  - `template_config` — fetch by `templateId` dari query param. Kalau modal galeri sebelumnya sudah fetch config yang sama, evaluasi apakah bisa reuse cache (React Query / SWR kalau dipakai di repo) alih-alih fetch ulang — tapi kalau tidak ada caching layer, fetch ulang single row tetap murah dan sesuai fetch strategy yang didefinisikan (`docs/render-template-logic.md` §Fetch Strategy: "Saat user pilih satu template → fetch template_config untuk template yang dipilih (single row)").
  - `company_profile` — ambil dari global state yang sudah ada (Context/Zustand), **jangan fetch ulang**.
  - `brand_theme` resolution — berdasarkan `brandPreview` query param: `true` → apply tint/derive; `false` → render as-is.
- Pastikan komponen ini konsisten dipakai lagi nanti di Step 4 (review varian) dan editor — kalau ada divergensi jalur render di sana juga, catat sebagai temuan terpisah, jangan diperbaiki diam-diam di PR ini (out of scope, biar reviewable).

### 3. Fallback brand color

Sudah ada default brand color di seed script — pastikan `TemplateRenderer` di create page pakai fallback yang sama saat `company_profile.brand_colors` kosong/null, konsisten dengan behavior yang sudah ada di modal galeri. Kalau modal galeri dan create page ternyata punya fallback berbeda saat ini, samakan keduanya ke satu sumber (idealnya default value ini didefinisikan sekali, bukan di-duplicate di dua tempat).

---

## Non-Goals (jangan dikerjakan di PR ini)

- Tidak mengubah kontrak `template_config` atau `brand_theme` (`tint`/`derive` logic tetap seperti yang sudah didefinisikan).
- Tidak mengubah flow Step 1/Step 3/Step 4.
- Tidak menambah field baru ke `company_profile` atau `generate_config`.
- Tidak menyentuh backend/API — ini murni frontend state passing + component reuse.

---

## Acceptance Criteria

1. User toggle "Preview dengan brand color" ON di modal → klik "Pakai template ini" → panel kiri di `/create` menampilkan template ter-adjust dengan brand color user.
2. User tidak toggle (default) → panel kiri di `/create` menampilkan template asli.
3. Refresh halaman `/create?templateId=...&brandPreview=true` langsung menampilkan state yang benar tanpa perlu balik ke galeri (karena state ada di URL, bukan di ephemeral client state).
4. Tidak ada hasil merge (computed color/font) yang tersimpan di URL, localStorage, sessionStorage, atau database.
5. `company_profile` tidak di-fetch ulang saat masuk create page — tetap dari global state.
6. User dengan `company_profile.brand_colors` kosong + `brandPreview=true` → fallback ke default brand color dari seed script, tidak error/blank.

## Test Requirements (sesuai AGENTS.md — TDD wajib)

- Unit test: query param parsing (`brandPreview` true/false/absent → default false).
- Unit test: fallback brand color dipakai saat `company_profile.brand_colors` null/empty.
- Component test: create page Step 2 render `TemplateRenderer` dengan props yang benar berdasarkan kombinasi `templateId` + `brandPreview`.
- Regression test: pastikan modal galeri preview behavior tidak berubah (masih toggle-able, masih live render).

---

## Open Question (perlu konfirmasi Irfan sebelum/selama implement, bukan diasumsikan sendiri)

- Apakah `brandPreview` juga perlu dibawa lanjut ke Step 4 (review 3 varian) dan editor, atau di titik itu template preview memang selalu final brand-adapted (tidak ada pilihan "asli" lagi setelah generate)? Tech doc & PRD tidak eksplisit soal ini — konfirmasi dulu sebelum extend scope ke situ.