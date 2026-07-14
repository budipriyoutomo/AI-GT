# Render Template Logic

> ⚠️ Dokumen ini adalah **working notes** selama fase prototyping.
> Isinya bisa berubah sewaktu-waktu sebelum di-finalize ke `AGENTS.md`.
> Jangan enforce sebagai hard rules — gunakan sebagai referensi logic saat implement.

---

## Konsep Dasar

Render template adalah proses **merge tiga sumber data** menjadi satu `renderPayload`
sebelum dikirim ke Fabric.js canvas.

Tidak ada data yang disimpan sebagai hasil merge — merge terjadi di runtime,
di aplikasi layer, bukan di database.

### Tiga sumber data:

| Sumber | Asal | Kapan di-fetch |
|---|---|---|
| `template_config` | Tabel `templates` | Saat user pilih satu template |
| `company_profile` | Tabel `company_profiles` | Saat halaman `/create` di-mount → simpan di global state |
| `generate_config` | Input user per-sesi | Saat user trigger generate |

---

## Fase Render

### Fase 1 — Preview (user pilih template)

Merge: `template_config` + `company_profile`

Yang ditampilkan:
- Logo brand user di canvas
- Brand color di-apply ke color scheme template
- Footer terisi data contact user
- Text zones (headline, body, cta) masih kosong

### Fase 2 — Generate (user trigger AI)

Merge: `template_config` + `company_profile` + `generate_config` + AI copy

Yang ditampilkan:
- Semua dari Fase 1
- Headline, body, cta terisi hasil AI copy
- Font dan color override dari `generate_config` di-apply

### Fase 3 — Export

Render final canvas → export PNG 1080×1080px

---

## Urutan Merge

### Step 1 — Resolve color

```
brand_colors[0] dari company_profile
  → override color_scheme[brand_color_role] di template_config

Jika brand_color_role = "none"
  → skip, gunakan color scheme template as-is
```

### Step 2 — Resolve font

```
Cek font.locked di template_config:

  true  → gunakan font.family dari template
          abaikan company_profile.brand_font dan generate_config.font_override

  false → cek generate_config.font_override dulu
          → jika kosong, cek company_profile.brand_font
          → jika kosong, fallback ke font.family dari template
```

### Step 3 — Resolve logo

```
1. Inject company_profile.logo_url ke zones.logo
2. Pilih anchor random dari zones.logo.anchors
3. Apply posisi logo dari anchor yang terpilih
4. Apply affects dari anchor tersebut:
   → override nilai y untuk zone: headline, body, thematic_image, disclaimer
```

### Step 4 — Resolve footer

```
1. Inject company_profile.contact ke zones.footer.values
2. Render hanya slot yang terdaftar di zones.footer.slots
3. Urutan tampil mengikuti urutan array slots
```

### Step 5 — Resolve text zones

```
Fase preview (sebelum generate):
  → zones kosong, visible sesuai default template

Fase generate (setelah AI):
  → inject AI copy ke headline, body, cta
  → cta: default visible = false, tampil hanya jika AI mengisinya
         atau user aktifkan manual di editor
```

---

## Fetch Strategy

```
Saat halaman /create di-mount:
  → fetch company_profile sekali (fresh, bukan dari cache waktu login)
  → simpan/timpa di global state yang sama (React Context / Zustand) yang juga
    dibaca Settings & Dashboard
  → Step 1-4 di dalam wizard /create adalah satu page mount — pindah antar step
    TIDAK memicu fetch ulang, cukup pakai hasil fetch di awal mount ini
  → mount baru ke /create (mis. setelah brand diubah di Settings lalu balik lagi)
    akan fetch ulang, jadi datanya selalu segar tanpa perlu logout/login ulang

Saat user browse template list:
  → fetch kolom ringan saja: id, name, thumbnail_url, layout_type, industry
  → JANGAN fetch template_config di tahap ini

Saat user pilih satu template:
  → fetch template_config untuk template yang dipilih (single row)
  → ambil company_profile dari global state
  → merge → render ke canvas
```

---

## Aturan Yang Tidak Boleh Dilanggar

- ❌ Jangan simpan hasil merge ke database
- ❌ Jangan modifikasi `template_config` di tabel `templates`
- ❌ Jangan fetch `company_profile` ulang di tiap render/perpindahan step di dalam satu mount
  `/create` — cukup sekali di awal mount, lalu ambil dari global state selama mount itu aktif.
  Fetch ulang tetap terjadi di mount baru berikutnya (bukan cuma sekali per sesi login).
- ❌ Jangan fetch semua `template_config` saat list template — berat, tidak perlu
- ❌ Jangan merge di SQL (JOIN) — merge di aplikasi layer

---

## Status Explorasi

| Topic | Status | Catatan |
|---|---|---|
| Base schema | 🔲 Belum didokumentasikan | Perlu dibuat sebelum coding |
| `promo_simple` schema | ✅ Final | Lihat `AI-GT_template_config_docs.md` |
| `editorial` schema | 🔲 Belum didokumentasikan | Referensi: Sopwer template |
| `edu_card` schema | 🔲 Belum didokumentasikan | Referensi: Astari Dental template |
| Render merge logic | 🔲 Prototyping | Dokumen ini |
| Fabric.js implementation | 🔲 Belum dimulai | |
| `thematic_image` decision | 🔲 Pending | Upload user atau AI generate? |
| Multiple `thematic_image` slots | 🔲 Pending | Mascot + product image terpisah |