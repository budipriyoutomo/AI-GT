# PRD — AI Content Generator Tools (Synced with Codebase)

AI-GT · Product Requirements Document · MVP 1.0 — **disinkronkan dengan implementasi aktual**

> ***"Konten marketing profesional, tanpa desainer."***
>
> Dokumen ini adalah PRD awal yang sudah **disesuaikan dengan kode yang benar-benar ada di repo** per
> 2026-06-29. Bagian yang bergeser dari PRD awal ditandai dengan **[CHANGED]**, **[NEW]**, atau **[DROPPED]**.
> Lihat juga §12 (Changelog) untuk ringkasan delta.

---

## 1. Overview

AI-GT adalah platform berbasis web yang membantu SMB owner dan marketing person generate konten marketing
visual secara cepat, on-brand, dan terjangkau — tanpa skill desain. User input profil bisnis, pilih template,
lalu AI generate copy + typography + elemen visual yang siap di-export sebagai PNG.

| Atribut | Detail |
| :---- | :---- |
| Versi | MVP 1.0 |
| Client pertama | PT SOPWER |
| Export format | PNG |
| Pricing model | TBD |
| Platform | Web app (desktop-first) |

---

## 2. Problem Statement

SMB owner menghadapi masalah yang sama soal konten marketing:

- Tidak punya budget untuk hire desainer/agency → konten diabaikan atau seadanya.
- Tools seperti Canva butuh waktu belajar & skill desain → barrier tinggi.
- Konten buatan sendiri sering tidak on-brand, tidak konsisten, dan tidak dirancang untuk convert.

AI-GT menyederhanakan proses dari input bisnis hingga PNG siap posting menjadi beberapa klik.

---

## 3. Target User

| Segmen | Deskripsi | Kebutuhan utama |
| :---- | :---- | :---- |
| Primary — SMB Owner | Pemilik bisnis yang handle marketing sendiri | Konten cepat, murah, tanpa skill desain |
| Secondary — Marketing Staff | Tim marketing perusahaan kecil-menengah | Scale output tanpa tambah headcount |
| Tertiary — Perorangan | Freelancer, personal branding, content creator | Visual profesional untuk keperluan personal |

---

## 4. Core Features (MVP)

### 4.1 Onboarding — Company Info Setup

First-time user diarahkan ke onboarding saat pertama login. Profil ini jadi "memory" AI untuk semua sesi
generate, dan bisa diedit kapanpun via Settings.

**[CHANGED] Field company profile lebih kaya dari PRD awal.** Profil sekarang menyimpan:

| Field | Tipe | Catatan |
| :---- | :---- | :---- |
| `business_name` | string | Wajib |
| `industry` | string | Wajib (F&B, Fashion & Retail, Jasa & Layanan, Kesehatan & Kecantikan, Toko Kelontong, Edukasi, Lainnya) |
| `logo_url` | string \| null | Upload logo |
| `brand_colors` | **string[]** \| null | **[CHANGED]** Dari "brand color (tunggal, opsional)" → **array warna** (primer + sekunder, dst) |
| `brand_font` | string \| null | **[NEW]** Font brand default (Google Fonts) |
| `tagline` | string \| null | **[NEW]** |
| `contact` | object \| null | **[NEW]** `{ website, phone, instagram, tiktok, youtube, hashtag }` — dipakai elemen `footer` template |
| `language_preference` | string | Default `"id"` |

> Onboarding UI saat ini berbentuk wizard multi-step (identitas → logo & tagline → brand color & font →
> preferensi bahasa/tone/platform). Beberapa field UI (kota, deskripsi, target audiens, platform default)
> masih tampil di onboarding tapi **belum semuanya dipersist** ke model company profile — lihat §11 (Known Gaps).

### 4.2 Template System

Library template terkategori. Setiap template sudah include layout, background, dan color scheme —
**tidak ada elemen visual yang di-generate ulang AI saat user memilih template** (Template Integrity, §4.3).

- Kategori per **industri**: F&B, retail, jasa, pendidikan, kesehatan, dll.
- Kategori per **tema**: seasonal/tematik (Lebaran, Hari Buruh, Harbolnas), promo, product launch, event, brand awareness.
- **Content type**: `Single` atau `Carousel`.
- **[NEW] `layout_type`** — tiap template punya tipe layout (mis. `promo_simple`) untuk varian komposisi.
- **[NEW] Template element-based.** `template_config` bukan lagi sekadar "layout + background + color".
  Sekarang berisi struktur **elemen ternormalisasi 0–1** (`logo`, `text`, `group`, `footer`, `scrim`, `image`)
  dengan kontrak slot AI. Galeri **live-render** template dari `template_config` ini (komponen `TemplateRenderer`),
  bukan sekadar gambar thumbnail statis. Aturan authoring lengkap ada di
  `backend/scripts/seed_template_data/README.md`.
- **[NEW] Kolom `platform`** ada di model `Template` (nullable) untuk menandai template spesifik platform.
  **[GAP]** Kolom ini **belum di-expose** di schema list (`TemplateListData`) sehingga filter template per-platform
  di galeri belum aktif — lihat §11.
- AI suggest template relevan berdasarkan company profile.
- Premium: `is_premium` flag ada; fitur "generate background AI" masih roadmap.

### 4.3 Content Generation

Inti platform. **[CHANGED] Flow di-restrukturisasi total** dari PRD awal.

PRD awal memisah **Quick Generate** (langsung template) vs **Generate by Campaign** (pre-step opsional).
Implementasi aktual **menggabungkan keduanya menjadi satu wizard 4-step**, di mana **Goal + Platform jadi
Step 1 yang wajib untuk semua user** (tidak ada lagi jalur "skip campaign").

#### Alur Generate Aktual (4 Step)

| Step | Nama | Aksi User | Keterangan |
| :---- | :---- | :---- | :---- |
| 1 | **Tujuan & Platform** | Pilih Goal + Platform | **[CHANGED]** Keduanya **WAJIB**. Sebelumnya khusus campaign & opsional. |
| 2 | **Pilih Template** | Browse/pilih template (galeri) | Template menentukan layout/background/color (terkunci). |
| 3 | **Isi Brief** | Isi form brief + gaya bahasa + sumber gambar (+ carousel jika perlu) | **[NEW]** Form brief eksplisit (lihat di bawah). |
| 4 | **Generate** | Klik Generate → AI buat 3 varian | Lalu pilih varian → editor → export PNG. |

#### [NEW] Form Brief (Step 3)

Field brief yang dikirim ke `POST /api/v1/generate/session`:

| Field | Wajib? | Keterangan |
| :---- | :---- | :---- |
| `product_or_service` | ✅ Wajib | Nama produk/layanan |
| `key_message` | ✅ Wajib | Pesan utama konten |
| `promo_detail` | Opsional | Detail promo/diskon |
| `additional_notes` | Opsional | Catatan/arahan tambahan untuk AI |
| `language_style` (gaya bahasa) | ✅ Wajib | Lihat tabel gaya bahasa |
| `image_source` | Opsional | `upload` \| `generated` \| `none` (default `none`) |
| `thematic_image_theme` | Wajib jika `generated` | Tema gambar AI |
| `selected_image_prompt` | Opsional | Prompt eksplisit untuk gambar AI |
| `campaign_data` | Wajib jika carousel | Pengaturan carousel (lihat §4.3 Carousel) |

#### Aturan Penting: Template Integrity (tetap berlaku)

| Elemen | Kontrol | Override user? |
| :---- | :---- | :---- |
| Layout & komposisi | Template (fixed) | Hanya via editor |
| Background | Template (fixed) | Hanya via editor |
| Color scheme | Template (fixed) | Hanya via editor |
| Thematic image | AI generate (optional) | Ya — termasuk posisi & ukuran |
| Typography (font + sizing) | AI generate (industri + gaya bahasa) | Ya — via editor |
| Copy (headline, body, CTA) | AI generate (profil + gaya bahasa) | Ya — via editor |

> AI **tidak boleh** memodifikasi `template_config`, layout, background, atau color scheme dalam kondisi apapun.

#### [CHANGED] Sumber Gambar — 3 Opsi

PRD awal hanya punya "AI thematic image (opsional)". Implementasi aktual punya **3 pilihan `image_source`**:

| Opsi | Nilai | Keterangan |
| :---- | :---- | :---- |
| **Upload Image** | `upload` | **[NEW]** User pakai foto/aset brand sendiri (PNG/JPG/WEBP, maks 5MB) |
| **AI Generate Image** | `generated` | AI buat gambar tematik (butuh `thematic_image_theme`) |
| **Tanpa Gambar** | `none` | Hanya copy + typography |

> Image provider failure tetap **tidak menggagalkan session** — copy adalah output utama, gambar adalah layer opsional.

#### [NEW] Carousel — Story Flow Engine

Untuk template `content_type = "Carousel"`, Step 3 menampilkan konfigurasi tambahan (`campaign_data`):

- **Jumlah slide:** 3–8 (struktur Cover + N Konten + Closing/CTA).
- **Alur cerita (`story_flow`):**
  - `problem_solution` — Cover → Problem → Solusi → Manfaat → CTA
  - `feature_highlight` — Cover → Fitur 1..N → CTA
  - `step_by_step` — Intro → Langkah 1..N → CTA
  - `social_proof` — Hook → Masalah → Testimoni → Bukti → CTA
  - `custom` — user definisikan urutan sendiri (`custom_flow`, mis. `Intro → Masalah → Fitur → CTA`)
- **Arahan per-slide (`slide_directions`):** catatan opsional per slide untuk mengarahkan AI.

#### Gaya Bahasa — Pilihan (tetap, 5 opsi)

| Gaya (`id`) | Karakteristik copy | Arah typography AI |
| :---- | :---- | :---- |
| Formal (`formal`) | Kalimat lengkap, profesional | Serif / clean sans-serif, sizing konservatif |
| Casual (`casual`) | Sapaan akrab, "kamu", kalimat pendek | Rounded sans-serif, sizing medium |
| Persuasive (`persuasive`) | Social proof, angka, urgensi | Bold headline, kontras tinggi |
| Fun & Playful (`fun_playful`) | Wordplay, emoji, ringan | Display font ekspresif |
| Inspiratif (`inspiratif`) | Quote-driven, emosional | Elegant serif, whitespace luas |

> **[DROPPED]** Segmen lokasi (Lokal/Nasional) yang ada di PRD belum diimplementasikan di form generate.

#### AI Typography

AI generate typography otomatis berdasarkan **industri** (dari company profile) + **gaya bahasa** (dipilih user).
Output: font pairing (headline + body), sizing hierarchy, letter spacing. Semua bisa di-override di editor.
Field varian: `headline_font`, `body_font`, `headline_size`, `body_size`, `letter_spacing`.

### 4.4 [CHANGED] Goal & Platform (sebelumnya "Generate by Campaign")

Konsep "Generate by Campaign" sebagai mode terpisah **sudah tidak ada**. Goal + Platform kini menjadi
**Step 1 wajib** dalam satu flow terpadu, sehingga setiap konten selalu punya arah campaign.

#### [CHANGED] Campaign Goal (enum aktual)

| PRD awal | Aktual (`id`) |
| :---- | :---- |
| Brand Awareness | `awareness` — Brand Awareness |
| Boost Engagement | `engagement` — Engagement |
| Drive Sales | `conversion` — Konversi |
| Increase Traffic | **[DROPPED]** |
| — | `launch` — **[NEW]** Launch / Produk Baru |
| — | `promo` — **[NEW]** Promo / Diskon |

#### [CHANGED] Platform tujuan (enum aktual, single-select)

| PRD awal | Aktual (`id`) | Rasio |
| :---- | :---- | :---- |
| Instagram Feed | `instagram_feed` | 4:5 |
| Instagram Story | `instagram_story` | 9:16 |
| TikTok | `tiktok` | 9:16 |
| WhatsApp Blast | **[DROPPED]** | — |
| X (Twitter) | **[DROPPED]** | — |
| — | `facebook` — **[NEW]** | 16:9 |

> Konteks/momen seasonal (Lebaran, Harbolnas, dll) dari PRD kini ditangani lewat
> kombinasi `thematic_image_theme` + `key_message`/`additional_notes`, bukan field "momen" terpisah.

---

## 5. User Flow

### 5.1 First-Time User

1. Register → 2. Verifikasi email → 3. Login pertama (deteksi belum ada profile → redirect Onboarding) →
4. Isi company info → 5. Selesai → Dashboard.

### 5.2 Returning User

1. Login (load company profile) → 2. Dashboard (history + shortcut Create).

### 5.3 [CHANGED] Generate Flow (terpadu)

1. Klik **Create** → masuk `/create`.
2. **Step 1:** Pilih **Goal + Platform** (wajib) → "Lihat Template".
3. **Step 2:** Browse/pilih template di galeri (`/templates`, membawa konteks goal+platform).
4. **Step 3:** Isi **Brief** (produk, pesan utama, promo, catatan), pilih **gaya bahasa**, pilih **sumber gambar**;
   jika carousel → set jumlah slide + alur cerita + arahan per-slide.
5. **Step 4:** Klik **Generate** → AI buat 3 varian (copy + typography + gambar jika dipilih).
6. Review 3 varian → "Pakai ini" → editor.
7. Edit (teks, typography, posisi gambar) → **Export PNG** → autosave ke Projects.

---

## 6. Scope

| In Scope (MVP) | Out of Scope |
| :---- | :---- |
| Generate dari template tersedia (element-based) | Generate tanpa template (full AI generate) |
| AI copy & (opsional) thematic image / upload image | Integrasi auto-post ke sosmed |
| AI typography (font, sizing, hierarchy) | Integrasi marketing tools (Meta/Google Ads) |
| Goal + Platform direction (wajib) | Scheduling & auto-posting |
| **[NEW]** Carousel story-flow engine | Analytics & performance tracking |
| Editor hasil generate | Multi-platform dalam satu sesi |
| Export PNG, autosave ke Projects | — |
| Edit company profile via Settings | — |

---

## 11. Known Gaps / Drift Teknis (perlu diputuskan)

Hal-hal yang **belum konsisten** antara UI, model, dan schema — kandidat untuk di-cleanup atau diputuskan:

1. **Template `platform` tidak ter-expose ke frontend.** Model `Template` punya kolom `platform`, tapi
   `TemplateListData` (schema list) tidak menyertakannya, sehingga filter galeri per-platform tidak berjalan.
   Saat ini filter platform di halaman galeri sudah dihapus (no-op).
2. **Field onboarding belum semua dipersist.** UI onboarding menampilkan "Kota", "Deskripsi singkat",
   "Target audiens", dan "Platform default", tapi field-field ini belum ada di model `CompanyProfile`.
3. **`brand_colors` pernah bolak-balik** antara `brand_color` (tunggal) ↔ `brand_colors` (array) di migrasi
   (`0003`, `0004`). Sumber kebenaran final: **`brand_colors: string[]`**.
4. **Segmen lokasi (Lokal/Nasional)** dari PRD belum diimplementasikan.
5. **Premium "AI background generation"** belum diimplementasikan (hanya flag `is_premium`).

---

## 12. Changelog vs PRD Awal (ringkasan delta)

| # | Area | Perubahan |
| :---- | :---- | :---- |
| 1 | Generate flow | Quick Generate + Generate by Campaign **digabung** jadi satu wizard 4-step. |
| 2 | Goal + Platform | Jadi **Step 1 wajib** untuk semua user (bukan opsional khusus campaign). |
| 3 | Goal enum | `awareness/engagement/conversion/launch/promo`. "Increase Traffic" dihapus; "launch" & "promo" baru. |
| 4 | Platform enum | `instagram_feed/instagram_story/facebook/tiktok`. WhatsApp & X dihapus; Facebook baru. |
| 5 | Form Brief | **Baru**: product/service, key message, promo detail, additional notes. |
| 6 | Carousel | **Baru**: story-flow engine (slide count 3–8, 5 alur, arahan per-slide). |
| 7 | Sumber gambar | **Baru**: Upload image (selain AI generate & none). |
| 8 | Company profile | **Diperluas**: brand_colors[], brand_font, tagline, contact/sosmed. |
| 9 | Template | **Element-based** + `layout_type` + `platform` + live-render galeri. |
| 10 | Lokasi/segmen | **Dihapus** dari flow (belum diimplementasikan). |
