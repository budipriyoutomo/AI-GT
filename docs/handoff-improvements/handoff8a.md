# HANDOFF 8a — Satu Resolver, Dua Renderer (Brand Sampai ke Export)

> **Status:** Ready for execution
> **Menutup:** Point 8 (resolve logic ownership) + Point 6 (anchor/zones cleanup — digabung ke sini)
> **Membuka:** Point 5 / Handoff 8b (rewrite `render-template-logic.md`) — **hanya setelah ini merge**
> **Baca dulu:** `AGENTS.md` §6 (dua renderer, paritas wajib), Tech Doc §5, §12

---

## 1. Problem Statement

**Adaptasi brand tidak pernah sampai ke produk akhir.** Sekarang:

| Permukaan | Brand color? | Logo user? |
|---|---|---|
| Galeri / preview modal (`TemplateRenderer`) | ✅ ya (via `brandAdapt.ts`) | ✅ ya |
| Canvas editor (`canvas-spec` / `TemplateFabricCanvas`) | ❌ **tidak** | ✅ ya (Handoff 0) |
| PNG hasil export | ❌ **tidak** | ✅ ya (Handoff 0) |

`canvas-spec.ts` **sama sekali tidak meng-import `brandAdapt.ts`**. `TemplateRenderer` di toggle
"HTML view" editor (`editor/page.tsx:1441`) dipanggil **tanpa** `brandColors`/`brandFont`, sehingga
`adaptScheme` langsung early-return (`brand.length === 0 → return scheme`).

Akibatnya, alur user hari ini:

1. User nekan toggle **"Preview dengan brand color"** → template tampil dengan warna brand-nya.
2. Pilih template → generate → buka editor.
3. **Warna kembali ke warna asli template.**
4. Export PNG → yang keluar warna template, **bukan** brand user.

PRD §4.2 & changelog #11/#17 menjual "personalisasi brand saat render" dan menyatakan pilihan toggle
**terbawa ke flow generate**. Kenyataannya brand adaptation efektif hanya fitur **preview**.

Setelah Handoff 0, ini jadi makin janggal: **logo user muncul di export, tapi warna brand-nya tidak.**
Setengah personalisasi lebih membingungkan daripada tidak ada sama sekali.

---

## 2. Root Cause

Tiga modul resolve ada, **tidak overlap**, tapi **tidak pernah dirangkai**:

| Modul | Tanggung jawab | Caller saat ini |
|---|---|---|
| `lib/brandAdapt.ts` | Warna (`adaptScheme`, `adaptBackground`, `adaptScrimGradient`) + contrast-guard | **Hanya** `TemplateRenderer.tsx:317` |
| `lib/editor/merge.ts` | Copy & tipografi (`mergeCopyIntoTemplate`) — isi `value`/`fontFamily`/`fontSize`/`letterSpacing` per `bind`/`role` | **Hanya** `preview-config.ts` |
| `lib/editor/preview-config.ts` | Adapter state editor di atas `merge.ts` + dua fixup editor-spesifik | `editor/page.tsx` → `buildCanvasSpec` + `TemplateRenderer` |

Masing-masing menyentuh sumbu berbeda dan **nyaris tidak pernah jalan pada objek yang sama**, karena
mereka hidup di fase produk yang berbeda:

- **Sebelum generate** (galeri, preview modal, Step 2 `/create`) → `template_config` mentah + `brandAdapt`.
- **Setelah generate** (editor) → `merge`/`preview-config` untuk copy. Brand tidak ikut.

**Tidak ada satu titik pun di kode yang menyatakan: `template + brand + copy → config final`.**
Ada jalur brand, ada jalur copy, keduanya tidak pernah bertemu.

Ini juga menjawab pertanyaan asli Point 8 (*"resolve di Python atau TypeScript?"*): **pertanyaannya
salah.** Yang rusak bukan *siapa* yang resolve, tapi bahwa **tidak ada yang mengkomposisi**.

---

## 3. Keputusan Arsitektur (FINAL — jangan diperdebatkan ulang)

### 3.1 Resolve TETAP di TypeScript. Jangan pindah ke backend.

- **Export PNG terjadi di browser.** Fabric `toDataURL()` butuh canvas yang sudah ter-resolve →
  brand **wajib** ter-resolve di TS. Backend yang ikut resolve = implementasi **ketiga**, bukan
  penghilangan duplikasi.
- **Toggle `brandPreview` adalah state client**, per-view, bisa di-toggle user. Backend tidak tahu
  user sedang melihat mode branded atau tidak saat endpoint list template dipanggil.
- **Brand bersifat live** (Handoff 2: `refreshProfile()` tiap `/create` mount). Backend yang
  pre-resolve brand ke `final_config` = brand ter-freeze saat generate — melawan model yang baru
  saja di-ship.
- Ketiga modul resolve murni TS, tidak punya padanan Python. Memindahkannya = menulis ulang di
  Python **dan tetap** butuh versi TS untuk export.

> Kalau nanti muncul formula yang harus paritas Python↔TS (seperti `charCapacity`), solusinya
> **golden fixture** (Point 7), **bukan** memindahkan arsitektur.

### 3.2 Satu fungsi resolve murni, dikonsumsi dua renderer

```ts
// lib/template/resolve.ts  (baru)
resolveTemplateConfig(input: {
  templateConfig: TemplateConfig;
  profile: CompanyProfile | null;   // null → pakai DEFAULT_COMPANY_PROFILE
  branded: boolean;                 // toggle "Preview dengan brand color" / final_config.brand_applied
  copy?: CopyResult;                // undefined = fase pre-generate (belum ada copy AI)
}): ResolvedConfig                  // fungsi MURNI: tanpa DOM, tanpa Fabric, tanpa fetch
```

- `ResolvedConfig` = `elements[]` yang **sudah final**: warna, font, size, letterSpacing, value,
  visibility — semuanya sudah diputuskan.
- `TemplateRenderer.tsx` (CSS) dan `canvas-spec.ts` (Fabric) **hanya menggambar**. Tidak ada satupun
  dari keduanya yang boleh me-resolve sendiri.
- `brandAdapt.ts` dan `merge.ts` **tetap ada sebagai primitif** — dipanggil **oleh** resolver, bukan
  oleh renderer. Jangan dihapus, jangan diduplikasi.
- `preview-config.ts` menjadi **adapter tipis** yang menerjemahkan state UI editor → `CopyResult`,
  lalu memanggil resolver yang sama. Bukan jalur terpisah.

### 3.3 Hierarki font (precedence eksplisit — bukan last-writer-wins)

Untuk **slot copy AI** (headline / body / cta):

| Prioritas | Sumber | Kondisi |
|---|---|---|
| 1 | Override user di editor | selalu menang |
| 2 | **`company_profile.brand_font`** | kalau di-set **dan** `branded = true` |
| 3 | Font saran AI (`typography_data`) | kalau `brand_font` null / `branded = false` |
| 4 | Font asli template | fallback |

Untuk **elemen statis template** (kicker, tanggal, S&K, dst): **SELALU font template.** Tidak boleh
disentuh brand maupun AI.

> Ini memformalkan fixup yang sudah ada di `preview-config.ts` (mengembalikan `letterSpacing` asli
> ke elemen statis karena `merge.ts` menyapu rata). Sekarang jadi **aturan di resolver**, bukan
> tambalan di adapter.

**Alasan `brand_font` menang atas AI:** produk menjual *on-brand*. User yang men-set `brand_font`
lalu mendapat typeface lain karena tebakan industri AI = janji utama produk dilanggar. AI Typography
tetap hidup — ia **selalu** memberi size hierarchy + letter spacing, dan memberi **font** hanya
ketika `brand_font` kosong (mayoritas SMB).

**Trade-off yang diterima:** `brand_font` adalah **satu** typeface, sementara template didesain
dengan **pairing** (headline ≠ body). Saat `brand_font` aktif, kontras tipografi turun ke
weight + size saja. Ini diterima secara sadar — bukan bug.

Precedence eksplisit ini juga menghapus pertanyaan "brand dulu atau copy dulu": **tidak ada yang
menimpa siapa pun**. Satu tabel, satu keputusan per elemen.

### 3.4 `brand_applied: bool` di `final_config`

Toggle "Preview dengan brand color" yang user aktifkan di preview modal **harus terbawa sampai
editor** (dan tetap benar saat project dibuka lagi berhari-hari kemudian).

- Simpan sebagai **`final_config.brand_applied: bool`**.
- `final_config` adalah kolom JSON → **tidak perlu migrasi Alembic**.
- Ini menyimpan **intent user**, **bukan** snapshot brand data. Warna/font/logo **tetap live** dari
  `company_profile`. Model live-merge tidak dilanggar.

---

## 4. Scope Kerjaan

### 4.1 Frontend — Resolver baru

**`src/lib/template/resolve.ts`** (baru)

- Implementasi `resolveTemplateConfig()` sesuai §3.2, **fungsi murni** — tanpa DOM, tanpa Fabric,
  tanpa import dari `components/`.
- Urutan internal:
  1. Pilih sumber profil: `branded ? profile : DEFAULT_COMPANY_PROFILE` (`lib/defaults.ts`).
  2. Warna: panggil `brandAdapt` (`adaptScheme` / `adaptBackground` / `adaptScrimGradient`) dengan
     `brand_theme` dari `template_config` (mode `tint`/`derive`) — **data ini sudah ada di
     `template_config` dan ikut tersalin ke `final_config`**, tinggal dipakai.
  3. Logo: inject `logo_url` (atau `DEFAULT_COMPANY_PROFILE.logo_url` kalau unbranded, atau hidden
     kalau `null` — lihat Handoff 0 §4.7).
  4. Copy & tipografi: panggil `mergeCopyIntoTemplate` kalau `copy` ada.
  5. Terapkan **tabel precedence font §3.3**, termasuk proteksi elemen statis.
- Return `ResolvedConfig` + `warnings[]` (teruskan warning dari `merge.ts`, mis. `orphan-copy-field`).

### 4.2 Frontend — Dua renderer jadi konsumen murni

- **`components/template/TemplateRenderer.tsx`** — hapus panggilan langsung ke `brandAdapt` (baris
  ~317). Terima `ResolvedConfig`, gambar apa adanya.
- **`lib/editor/canvas-spec.ts` + `components/editor/TemplateFabricCanvas.tsx`** — terima
  `ResolvedConfig`. **Ini yang menutup bug utama**: canvas akhirnya menggambar warna brand.
- **`lib/editor/preview-config.ts`** — tetap ada, tapi jadi adapter tipis: state editor →
  `CopyResult` → `resolveTemplateConfig(...)`. Dua fixup editor-spesifik yang ada sekarang
  (letterSpacing elemen statis, buang CTA saat field kosong) — **pindahkan yang pertama ke resolver**
  (jadi aturan §3.3), yang kedua tetap di adapter (itu murni UI state).
- **`editor/page.tsx:1441`** — `TemplateRenderer` di toggle "HTML view" sekarang menerima
  `ResolvedConfig` yang **sama** dengan yang dipakai Fabric. Tidak boleh ada dua jalur lagi.

### 4.3 Frontend — Alirkan `brandPreview` → `brand_applied`

- Toggle di `TemplatePreviewModal` → query `brandPreview` (`lib/create/brand-preview.ts`) → `/create`.
- Saat submit generate: sertakan `brand_applied` di payload `POST /api/v1/generate/session`
  (masuk ke `content_data`, yang memang blob JSON bebas untuk field Quick Generate).
- Editor membaca `final_config.brand_applied` → diteruskan sebagai `branded` ke resolver.
- **Backward compat:** project lama tidak punya key ini → `brand_applied` absen → perlakukan sebagai
  **`false`** (unbranded, sesuai perilaku hari ini). Jangan mengubah tampilan project lama.

### 4.4 Backend — persist intent (perubahan minimal)

- `generate_service`: terima `brand_applied` di `content_data`.
- `_normalize_template_config` / pembangunan `final_config` (di `select_variant` **dan**
  `_auto_select_first_variant` untuk Quick Generate): tulis `brand_applied` ke top-level
  `final_config`.
- **Tidak ada migrasi.** **Tidak ada** brand data (warna/font/logo) yang disnapshot — hanya boolean.
- Template integrity tidak dilanggar: `template_config` tetap read-only.

### 4.5 Cleanup — sisa model `zones` (menggantikan Handoff 4)

Sambil membongkar ketiga modul di atas, **grep dan hapus** sisa referensi model lama yang sudah
obsolete (codebase sudah pindah ke elements-array dengan posisi fixed):

- `zones`, `anchors`, random anchor selection, `affects`
- `font.locked`
- `brand_color_role`

Cek **backend dan frontend**. Pastikan tidak ada resolve logic yang masih memilih anchor secara
random. Kalau ditemukan sesuatu yang ternyata **masih dipakai**, **STOP dan laporkan** — jangan
dihapus sepihak.

---

## 5. Non-Goals (JANGAN DIKERJAKAN)

- ❌ **Jangan** menyentuh `docs/render-template-logic.md`. Rewrite-nya adalah **Handoff 8b**, dan
  hanya boleh ditulis **setelah** pipeline ini benar-benar ada di kode. Menulis doc sebelum kodenya
  jadi = drift siklus ketiga.
- ❌ **Jangan** memindahkan resolve logic ke Python.
- ❌ **Jangan** menyimpan brand data (warna/font/logo) ke `final_config`. **Hanya** `brand_applied: bool`.
- ❌ **Jangan** mengubah schema `template_config` atau menambah field baru padanya.
- ❌ **Jangan** menghapus `brandAdapt.ts` atau `merge.ts` — keduanya tetap primitif, hanya berpindah
  caller.
- ❌ **Jangan** menyentuh `fit-text.ts` / `charCapacity` / auto-fit & reflow. Itu berjalan **setelah**
  resolve, tidak berubah, dan punya handoff sendiri (Point 7).
- ❌ **Jangan** membuat migrasi Alembic.
- ❌ **Jangan** mengubah tampilan project lama (tanpa `brand_applied` → unbranded).

---

## 6. TDD Requirements (AGENTS.md §3 — failing test dulu)

### Resolver (`vitest`) — fungsi murni, tidak butuh jsdom canvas

| Test | Ekspektasi |
|---|---|
| `branded=true` + `brand_colors` | `color_scheme` ter-adaptasi sesuai `brand_theme` (tint/derive) |
| `branded=false` | Warna & font **asli template**; logo = `DEFAULT_COMPANY_PROFILE.logo_url` |
| `branded=true`, `logo_url=null` | Slot logo **hidden**, tidak ada reflow |
| `copy=undefined` (pre-generate) | Slot copy tetap placeholder template, tidak crash |
| **Precedence font**: `brand_font` set + AI font set, `branded=true` | Slot copy pakai **`brand_font`** |
| **Precedence font**: `brand_font` null + AI font set | Slot copy pakai **font AI** |
| **Precedence font**: `branded=false` + AI font set | Slot copy pakai **font AI** (brand tidak ikut) |
| **Precedence font**: keduanya null | Font **template** |
| **Elemen statis** (kicker/tanggal/S&K) | Font & letterSpacing **template**, tidak tersentuh brand maupun AI — di semua kombinasi di atas |
| Fungsi murni | Input identik → output identik; tidak ada akses DOM/Fabric/fetch |

### Paritas dua renderer (`vitest`) — INTI dari AGENTS.md §6

| Test | Ekspektasi |
|---|---|
| Golden `ResolvedConfig` → `TemplateRenderer` vs `canvas-spec` | Untuk setiap element id: **warna, fontFamily, fontSize, visibility identik**. Uji geometri murni dengan pengukur di-inject (jsdom tidak punya canvas 2D — lihat AGENTS.md §6) |
| `branded=true` → `canvas-spec` | Spec elemen **memuat warna brand** (regression test bug utama: sebelumnya `canvas-spec` tidak pernah melihat brand sama sekali) |

### `brand_applied` (`vitest` + `pytest`)

| Test | Ekspektasi |
|---|---|
| Editor: `final_config.brand_applied = true` | Resolver dipanggil dengan `branded=true` |
| Editor: `brand_applied` **absen** (project lama) | Diperlakukan `false` — tampilan tidak berubah |
| `pytest`: `POST /generate/session` dengan `brand_applied=true` → select variant | `final_config.brand_applied === true` |
| `pytest`: Quick Generate (auto-select) | `brand_applied` ikut tertulis ke `final_config` |
| `pytest`: `brand_applied` tidak dikirim | Default `false`, tidak crash |
| `pytest`: `template_config` di DB | **Tidak berubah** (template integrity) |

Coverage minimum tetap berlaku (routes 90%, services 85%).

---

## 7. Acceptance Criteria

1. Toggle "Preview dengan brand color" **ON** → generate → editor → **warna brand terlihat di canvas**.
2. **Export PNG dari editor menghasilkan warna brand user**, bukan warna asli template. *(Ini bug
   utama yang ditutup handoff ini — verifikasi manual, buka file PNG-nya.)*
3. Toggle **OFF** → editor & export memakai warna asli template + logo default generik.
4. `brand_font` di-set + `branded=true` → slot copy memakai `brand_font`, **bukan** font saran AI.
   Elemen statis template tetap memakai font template.
5. `brand_font` kosong → slot copy memakai font saran AI (AI Typography tetap berfungsi penuh).
6. Buka project **lama** (tanpa `brand_applied`) → tampilan **tidak berubah** dari sebelumnya.
7. `TemplateRenderer` dan `canvas-spec` menghasilkan warna/font/visibility identik untuk
   `ResolvedConfig` yang sama.
8. Tidak ada lagi referensi `zones` / `anchors` / `font.locked` / `brand_color_role` yang hidup di
   backend maupun frontend.
9. `template_config` di DB tidak pernah dimodifikasi.
10. Semua test hijau, coverage tidak turun.

---

## 8. Catatan untuk Claude Code

- Baca `AGENTS.md` penuh — khususnya **§6 (dua renderer, paritas wajib)** dan §3 (TDD).
- **Resolver harus fungsi murni.** Semua yang butuh browser (pengukuran teks Fabric, auto-fit,
  reflow) berjalan **setelah** resolve dan **tidak** masuk ke dalamnya.
- Kalau saat cleanup §4.5 kamu menemukan `zones`/`anchors` yang ternyata **masih dipakai**:
  **STOP dan laporkan.** Jangan hapus sepihak.
- Kalau `brand_theme` ternyata **tidak** ada di sebagian `template_config` (template lama):
  fallback ke perilaku unbranded untuk template itu, jangan crash, dan laporkan template mana.
- Jangan menulis dokumentasi apa pun ke `docs/render-template-logic.md`. Itu Handoff 8b.

---

## 9. Setelah Ini

**Handoff 8b (= Point 5):** rewrite `docs/render-template-logic.md` dari nol, mencerminkan pipeline
yang benar-benar ada — satu resolver, tabel precedence, dua renderer sebagai konsumen. Doc lama
(zones/anchors/`brand_color_role`/Fetch Strategy login-time) dibuang seluruhnya, bukan ditambal.