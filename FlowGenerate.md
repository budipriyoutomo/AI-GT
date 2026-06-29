# Perbandingan & Detail Flow: Quick Generate vs Campaign

> Referensi produk AI-GT untuk pembagian fitur free vs premium **dan** detail isian tiap flow untuk implementasi.
> Campaign = **fitur premium**. Quick Generate = jalur free/entry.
>
> **Lokasi simpan di repo:** `ai-gt/docs/quick-generate-vs-campaign.md`
> (di `docs/`, bukan root — jangan ketuker dengan `AGENTS.md` / `README.md`).
>
> Konvensi penamaan field mengikuti Tech Docs AI-GT (Section 2–4).
> Wire contract (payload API) memakai `snake_case` (backend FastAPI). Frontend boleh map ke `camelCase` di layer types.
> Item bertanda **[PLACEHOLDER]** = penamaan belum final, samakan dengan codebase yang ada sebelum implement.

---

## 1. Tabel Perbandingan

| Dimensi | Konten Biasa (Quick Generate) | Campaign |
|---|---|---|
| Tier | Free / entry | **Premium** |
| Tujuan | Satu konten cepat, sekali jalan | Serangkaian konten di bawah satu tujuan besar |
| Sifat | Reaktif, single-shot, "butuh sekarang" | Proaktif, terencana, series-wide |
| Output | **1 konten, 1 varian** per generate | Banyak konten dalam satu payung campaign |
| Flow | 4 step (lihat §2) | Form 5-kriteria + wizard 7-step (lihat §3) |
| Varian | **1 varian, langsung ke editor** | Multi-konten + A/B variant per konten |
| Campaign Brief | Tidak ada | Tujuan, target audience, CTA utama, positioning |
| Narrative Arc | Tiap konten berdiri sendiri | Urutan nyambung (teaser → reveal → social proof → reminder → last call) |
| Konteks Musiman ID | Bisa sebut momen sekali saja | Seluruh seri koheren: mood, register, motif imagery, logika tanggal |
| Antisipasi proaktif | User yang bawa ide | Tools mengingatkan momen ("Gajian 5 hari lagi, siapin promo?") |
| Konsistensi antar konten | Tidak ada carry-over | Tone, tema, tagline, CTA selaras di semua konten |
| Beban credit | Ringan per pakai | Lebih berat (multi-konten) |
| Backend | Single generate contract | Single generate contract yang sama + lapisan konteks campaign |
| Template Integrity | Berlaku penuh | Berlaku penuh (tetap kunci layout/background/warna) |

---

## 2. Detail Flow — Quick Generate (4 Step)

Urutan baru (funnel: persempit pilihan dulu, baru tampilkan template relevan):

**1. Tujuan + Platform → 2. Gallery Template (auto-filtered) → 3. Pilih Template + Form Brief → 4. Generate → Editor**

Output: **1 konten, 1 varian**, langsung masuk editor (tanpa layar pilih-varian).

### Step 1 — Tujuan + Platform
Dua pertanyaan ringan di depan. Dipakai untuk memfilter gallery template di Step 2.

| Field | Type | Required | Keterangan |
|---|---|---|---|
| `goal` | enum string | ✅ | Tujuan konten: `awareness` / `engagement` / `conversion` / `launch` / `promo`. Mewarnai arah copy. |
| `platform` | enum string | ✅ | Target platform: `instagram_feed` / `instagram_story` / `facebook` / `tiktok` **[PLACEHOLDER enum]**. Menentukan aspect ratio template. |

> **Smart default / skippable.** Untuk user yang cuma mau browse cepat, sediakan default cerdas (mis. `goal=promo`, `platform=instagram_feed`) supaya step 1 nggak jadi gesekan. Dipandu itu bagus untuk SMB yang belum tahu mau apa, tapi yang buru-buru tetap terlayani.

### Step 2 — Gallery Template (auto-filtered)
Bukan input user — sistem menampilkan template yang sudah difilter dari Step 1.

Filter: `platform` (wajib, karena menentukan dimensi canvas) + `goal` (langsung, atau via mapping `goal → theme`).

> ⚠️ **Implikasi skema (lihat §6).** Tabel `templates` saat ini punya `industry`, `theme`, `content_type`, `is_premium` — **belum ada `platform` & `goal`**. Tanpa `platform`, gallery auto-filter di step ini tidak bisa jalan. Tambahkan field-nya dulu.

### Step 3 — Pilih Template + Form Brief
User memilih satu template, lalu mengisi form brief gabungan. Satu layar, tiga blok (di-section visual; jaga agar tidak padat di mobile).

**3a. Template terpilih**
| Field | Type | Required | Keterangan |
|---|---|---|---|
| `template_id` | UUID | ✅ | Layout/background/warna terkunci dari sini (Template Integrity). Tema imagery diturunkan dari `template.theme`. |

**3b. Gaya bahasa**
| Field | Type | Required | Keterangan |
|---|---|---|---|
| `language_style` | enum string | ✅ | Enum kanonik: `formal` / `casual` / `persuasive` / `fun_playful` / `inspiratif`. |

> Label UI preset (mis. "Anak muda", "Profesional") = lapisan presentasi yang map ke enum kanonik. Jangan kirim label mentah ke backend. Mapping **[PLACEHOLDER]**.

**3c. Konten** (isi *sebelum* gambar — konten jadi input untuk saran prompt gambar)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| `product_or_service` **[PLACEHOLDER]** | string | ✅ | Subjek konten / yang dipromosikan. |
| `key_message` **[PLACEHOLDER]** | string | ✅ | Pesan utama. |
| `promo_detail` **[PLACEHOLDER]** | string | ⬜ | Opsional: diskon, harga, periode. |
| `additional_notes` **[PLACEHOLDER]** | string | ⬜ | Opsional: catatan untuk AI. |

**3d. Sumber gambar** (mutually exclusive — tab/toggle, hanya satu aktif)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| `image_source` | enum string | ✅ | `"upload"` \| `"generated"` \| `"none"` |
| `uploaded_image` | file (multipart) | conditional | Wajib **hanya jika** `image_source = "upload"`. |
| `thematic_image_theme` | enum string | conditional | Hanya jika `generated`. Default: derive dari `template.theme`; boleh override. |
| `selected_image_prompt` **[PLACEHOLDER]** | string | conditional | Prompt teks terpilih. Hanya jika `generated`. |

**Aturan efisiensi kredit:** mode `generated` menampilkan **saran prompt berupa teks yang bisa diklik**, *bukan* gambar pre-render. Gambar di-generate saat final generate, untuk prompt terpilih saja.

**Aturan mutual-exclusivity (wajib test — §5):**
- `upload` → `uploaded_image` wajib; field generated NULL.
- `generated` → `thematic_image_theme` wajib; `uploaded_image` NULL.
- `none` → semua field gambar NULL.

### Step 4 — Generate → Editor
Submit single generate contract (§4). Backend generate **1 varian**, lalu **langsung** ke editor.

**Dampak 1 varian (vs 3 varian lama):**
- `generate_variants` berisi **1 row** (`variant_number = 1`).
- **Tidak ada layar pilih-varian.** Begitu status `completed`, varian tunggal **auto-selected** → buat `projects` record → pindah image temp→permanent (Tech Docs Section 5) → masuk editor.
- Endpoint `POST /generate/session/{id}/select` jadi **implisit/otomatis** untuk Quick Generate (tetap dipakai eksplisit di Campaign jika perlu).
- Polling status (`processing` → `completed` / `failed`) **tetap berlaku**.

> **Font = output AI**, dibatasi whitelist font template (Template Integrity). Bukan input user.

---

## 3. Detail Flow — Campaign (Premium)

Campaign = **Form Brief (5-kriteria)** set konteks sekali + **Wizard Generate (7-step)** eksekusi seri konten.
Semua input campaign disimpan di `generate_sessions.campaign_data` (JSONB) — extend tanpa migration (Tech Docs Section 2.4).

### 3.1 Form Campaign Brief (5-Kriteria)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| `goal` | enum string | ✅ | `awareness` / `engagement` / `conversion` / `launch` / `promo`. |
| `platform` | enum string | ✅ | Target platform **[PLACEHOLDER enum]**. |
| `moment` | enum string (FK Seasonal Moment) | ⬜ | Momen musiman (§3.3). NULL = non-musiman. |
| `audience_location` | string | ⬜ | Lokasi/target audience. |
| `budget_range` | enum string | ⬜ | `micro` / `small` / `medium` **[PLACEHOLDER]**. Mewarnai tone. |

`language_style` (enum sama §2) juga di `campaign_data`, di-set sekali level campaign.

**Field brief tambahan (lapisan lebih kaya):**
| Field | Type | Required | Keterangan |
|---|---|---|---|
| `target_persona` **[PLACEHOLDER]** | string | ⬜ | Umur, minat, pain point. |
| `main_cta` **[PLACEHOLDER]** | string | ⬜ | CTA utama konsisten semua konten. |
| `value_proposition` **[PLACEHOLDER]** | string | ⬜ | Positioning (murah/premium/lokal/cepat). |

### 3.2 Narrative Arc (lapisan premium inti)
| Field | Type | Required | Keterangan |
|---|---|---|---|
| `content_count` **[PLACEHOLDER]** | integer | ✅ | Jumlah konten dalam seri. |
| `schedule` **[PLACEHOLDER]** | array<date> \| object | ⬜ | Jadwal tayang (content calendar mini). |
| `arc_structure` **[PLACEHOLDER]** | array<enum> | ⬜ | Urutan beat: `["teaser","reveal","social_proof","reminder","last_call"]`. |

Tiap konten membawa `arc_position` → AI tahu posisinya, membangun dari konten sebelumnya, anti-repetisi (konteks "sudah dibahas konten 1..N-1" diturunkan ke generate berikutnya).

### 3.3 Seasonal Moment (entity terkurasi)
Bukan date-picker. Tiap momen punya metadata budaya (data terstruktur, bukan hardcode di prompt → bisa nambah momen tanpa sentuh kode = moat lokal).

`SeasonalMoment` **[PLACEHOLDER schema]**:
| Field | Type | Keterangan |
|---|---|---|
| `id` / `slug` | string | `ramadan`, `lebaran`, `harbolnas`, `gajian`, `tanggal_kembar_1111`, dst. |
| `label` | string | Nama tampil. |
| `mood` | string | "hangat, berkah, silaturahmi" vs "urgent, countdown". |
| `register` | string | Register bahasa khas momen. |
| `imagery_motifs` | array<string> | Motif tematik (ketupat, takjil, bedug). **Copy/imagery only — bukan warna/layout.** |
| `cta_tendency` | string | Soft relationship vs hard urgency. |
| `date_logic` | enum/object | `one_time` / `recurring_monthly` / `date_range`. |

> ⚠️ **Template Integrity:** Seasonal Moment hanya memengaruhi **copy, diksi, tagline, motif imagery** — TIDAK warna/layout. Momen identik-warna (Imlek merah-emas, 17-an merah-putih) tetap tak boleh set color scheme; terkunci ke template. Dukung warna musiman = keputusan produk terpisah yang eksplisit melonggarkan Template Integrity.

### 3.4 Wizard Generate (7-Step) — struktur usulan
> Urutan final samakan dengan PRD v2. Struktur turunan dari diskusi; field-nya konkret.

1. **Pilih Template** — `template_id`.
2. **Campaign Brief** — 5-kriteria (§3.1) + brief tambahan.
3. **Seasonal Moment** — pilih `moment` (§3.3) atau skip.
4. **Narrative Arc** — `content_count`, `arc_structure`, `schedule` (§3.2).
5. **Konten per item / batch** — input pokok tiap konten (atau AI turunkan dari brief + arc).
6. **Gaya Bahasa & Sumber Gambar** — `language_style` (level campaign) + `image_source` per konten (mutual-exclusivity §2 tetap berlaku).
7. **Generate (batch)** — generate seluruh seri; A/B variant & regenerate per konten.

---

## 4. Single Generate Contract (kedua flow)

Satu kontrak, dua jalur. Quick Generate kirim `campaign_data: null`; Campaign mengisinya.

```jsonc
// POST /api/v1/generate/session
{
  "template_id": "uuid",                 // wajib, kedua flow
  "goal": "promo",                       // Quick Generate: dari Step 1; juga ada di campaign_data utk Campaign
  "platform": "instagram_feed",          // Quick Generate: dari Step 1 (juga implisit di template)
  "language_style": "casual",            // enum kanonik
  "image_source": "generated",           // "upload" | "generated" | "none"
  "thematic_image_theme": "lebaran",     // hanya jika generated (default: derive dari template.theme)
  "selected_image_prompt": "string|null",// hanya jika generated [PLACEHOLDER]
  // uploaded_image via multipart terpisah saat image_source = "upload"

  // konten Quick Generate [PLACEHOLDER naming]:
  "product_or_service": "string",
  "key_message": "string",
  "promo_detail": "string|null",
  "additional_notes": "string|null",

  "campaign_data": null
  // — atau, untuk Campaign (premium): —
  // "campaign_data": {
  //   "goal": "conversion",
  //   "platform": "instagram_feed",
  //   "moment": "ramadan",                 // slug SeasonalMoment | null
  //   "audience_location": "Bandung",
  //   "budget_range": "small",
  //   "target_persona": "...",             // [PLACEHOLDER]
  //   "main_cta": "...",                   // [PLACEHOLDER]
  //   "value_proposition": "...",          // [PLACEHOLDER]
  //   "narrative_arc": {                   // [PLACEHOLDER]
  //     "content_count": 6,
  //     "arc_structure": ["teaser","reveal","social_proof","reminder","last_call"],
  //     "schedule": ["2026-03-01", "..."]
  //   }
  // }
}
```

**Keputusan skema goal+platform:** karena `goal` & `platform` kini jadi input Quick Generate, mereka butuh rumah **di luar** `campaign_data`. Rekomendasi: simpan sebagai field di `generate_sessions` (atau top-level payload), supaya `campaign_data != null` tetap jadi **penanda tunggal "ini Campaign"**. Garis premium tetap bersih: goal+platform di Quick Generate cuma filter ringan; yang premium tetap narrative arc, seasonal carry-over, multi-konten, brief persona/CTA.

Response mengikuti envelope standar Tech Docs Section 3. Untuk Quick Generate: `data` berisi 1 varian + (setelah auto-select) `project_id` untuk redirect ke editor.

---

## 5. Aturan Validasi & TDD (wajib di-cover)

Sesuai TDD (Red→Green→Refactor) + coverage minimum Tech Docs Section 7.

**Quick Generate — 1 varian:**
- Generate menghasilkan **tepat 1** `generate_variants` row (`variant_number = 1`).
- Pada `completed` → auto-select → `projects` record dibuat → image temp→permanent → `project_id` tersedia untuk redirect editor.
- Tidak ada jalur "pilih dari 3 varian" untuk Quick Generate.

**Mutual exclusivity sumber gambar:**
- `upload` tanpa `uploaded_image` → 400.
- `generated` tanpa `thematic_image_theme` → 400.
- `none` dengan field gambar terisi → 400.
- Lebih dari satu mode terisi → 400.

**Payload validation:**
- `template_id`, `goal`, `platform`, `language_style` kosong → 400.
- `language_style` di luar enum kanonik → 400 (cegah label UI mentah lolos).

**Gating premium (Campaign):**
- Free user kirim `campaign_data` non-null / hit endpoint campaign → **403 `FEATURE_REQUIRES_PREMIUM`**.
- Enforcement di **server** (API boundary), bukan hide menu frontend.
- Tambahkan `FEATURE_REQUIRES_PREMIUM` ke Error Code List Tech Docs Section 3.

---

## 6. Implikasi Skema (yang perlu disiapkan sebelum coding)

**Tabel `templates` — tambah field:**
| Field | Type | Alasan |
|---|---|---|
| `platform` | VARCHAR/enum | Menentukan aspect ratio canvas + filter gallery Step 2. **Wajib** untuk flow baru. |
| `goal` **[opsional]** | VARCHAR/enum | Untuk filter langsung by goal. Alternatif: mapping `goal → theme` tanpa kolom baru. |

**Tabel `generate_sessions` — tampung goal+platform Quick Generate:**
- Tambah `goal` & `platform` sebagai kolom, **atau** top-level payload yang dipetakan ke session.
- `campaign_data` tetap NULL untuk Quick Generate → penanda tunggal jalur free vs premium.

**Tabel `generate_variants`:**
- Quick Generate: selalu 1 row. Tidak perlu perubahan struktur, hanya behavior (jumlah varian = 1).

---

## 7. Catatan Arsitektur & Bisnis

- **Template Integrity berlaku penuh di kedua jalur.** AI hanya ubah copy, tipografi, tematik imagery.
- **Campaign bukan jalur generate baru** — single generate contract yang sama + lapisan konteks (`campaign_data`).
- **Font = output AI**, dibatasi whitelist template; bukan input user.
- **Momen berulang = mesin retensi.** Gajian/akhir bulan tiap bulan → alasan user balik tiap bulan; jaga MRR.
- **Defensibility lokal.** Konteks musiman Indonesia = moat terhadap pemain global.

---

## 8. Open Decisions (samakan sebelum coding)
- [ ] Enum final `platform` & `goal`; keputusan kolom `templates.goal` vs mapping `goal → theme`.
- [ ] Lokasi simpan `goal` + `platform` Quick Generate (kolom `generate_sessions` vs top-level payload).
- [ ] Mapping label UI preset Gaya Bahasa → enum `language_style`.
- [ ] Penamaan final field konten Quick Generate (`product_or_service`, `key_message`, dst).
- [ ] Schema final `SeasonalMoment` + daftar momen prioritas.
- [ ] Penamaan field `narrative_arc` & nilai `arc_structure`.
- [ ] Enum `budget_range`.
- [ ] Urutan pasti 7-step wizard (samakan dengan PRD v2).