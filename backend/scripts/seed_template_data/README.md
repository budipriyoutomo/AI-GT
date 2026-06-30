# Template Authoring — Aturan Membuat `template_config` JSON

Dokumen acuan saat membuat/mengubah file template JSON di folder ini (`backend/scripts/seed_template_data/`).
Baca seluruhnya sebelum menulis satu template baru. Tujuannya: template **variatif** tapi tetap punya
komponen yang dibutuhkan **AI generate**.

---

## 1. Prinsip inti: TEMPLATE vs GAMBAR

`template_config` **hanya** menyimpan kerangka yang reusable. **Gambar spesifik konten TIDAK masuk.**

| ✅ TEMPLATE (masuk `template_config`) | ❌ GAMBAR (jangan dimasukkan) |
|---|---|
| Background (warna/gradient) | Foto produk / menu |
| `color_scheme`, `font` | Maskot, karakter, ilustrasi spesifik |
| Slot logo (posisi) | Badge harga grafis (mis. "Rp 1") |
| Semua zona teks | Logo pihak lain, badge sertifikasi (Halal, dll) |

> Gambar-gambar itu ditempel terpisah di editor, bukan bagian definisi template.
> Area yang ditempati gambar dibiarkan **kosong** di template (jangan reserve sebagai elemen image, kecuali memang slot generik).

---

## 2. Struktur `template_config`

```jsonc
{
  "canvas":       { "aspect": "4:5", "dimensions": { "width": 1080, "height": 1350 } },
  "background":   { "type": "gradient", "direction": "to bottom", "stops": ["#...", "#..."] },
  "color_scheme": { "accent": "#...", "primary": "#...", "secondary": "#..." },
  "font":         { "family": "Montserrat" },
  "brand_theme":  { "color_slots": { "accent": 0 }, "font_brand_roles": ["body"] },  // opsional, lihat §5
  "elements":     [ /* urutan array = z-index (depan ke belakang) */ ]
}
```

- `background.type`: `"gradient"` (pakai `stops`), `"color"` (pakai `value`), atau `"image"` (pakai `source: "thumbnail"` → ambil dari `templates.thumbnail_url`, dengan `fallback` warna saat kosong).
- Gradient: `shape: "linear"` (default, pakai `direction` mis. `"to bottom"`) atau `shape: "radial"` (pakai `position` mis. `"50% 33%"` — pusat glow). Stops dibagi rata; ulang warna yang sama untuk "menahan" warna lebih lama.
- Warna boleh **hex** (`"#FFFFFF"`) atau **role** (`"accent"`/`"primary"`/`"secondary"` → di-resolve ke `color_scheme`).
- `font.family` **wajib sudah di-load** di `frontend/src/app/layout.tsx` (next/font). Saat ini tersedia: **Inter, Poppins, Montserrat, Anton, Archivo Black** (dua terakhir = display headline, single-weight 400). Pakai font lain → tambahkan dulu di layout, kalau tidak akan fallback.

---

## 3. Element

Tiap element punya posisi **ternormalisasi 0–1** (`x`,`y` dari kiri-atas; `width`,`height` relatif kanvas).

### Tipe yang sudah ada
- **`logo`** — `{ "type":"logo", "source":"brand", "x","y","width","height" }`. `source:"brand"` = logo user.
- **`text`** — lihat bagian 4. Style: `fontSize`, `weight`, `color`, `lineHeight`, `letterSpacing`, `align`,
  `shadow`, `stroke` (outline), `fillGradient` (glossy), `accentWords`/`accentColor`/`accentWeight`.
  **Box/pill** (mis. CTA button): isi `background` (hex/role) → teks jadi kotak berlatar yang **hug-content**
  & ikut `align`; opsional `radius` (ruang 1080px) + `padding` (mis. `"0.4em 1.2em"`, em ikut fontSize).
  **`rotate`** (derajat): miringkan blok teks/box di sekitar pusatnya — negatif = naik ke kanan (poster retro).
  **`italic`** (bool): oblique letterform (faux-italic untuk font tanpa face italic mis. Anton).
  **`skew`** (derajat): skewX geometri — miringkan **box** jadi paralelogram (CTA italic, edge ikut miring).
  **`fontFamily`**: override font per-elemen (mis. subtitle pakai Montserrat thin) → fallback ke `font.family` template.
- **`rule`** — garis dekoratif. `{ "type":"rule", "x","y","width", "style":{ "color","thickness","rotate" } }`.
  Bisa ikut `rotate` agar paralel dengan teks miring (mis. garis atas/bawah subtitle poster).
- **`image`** — foto foreground dari `templates.thumbnail_url`. `{ "source":"thumbnail", "fit":"cover|contain", "radius":n }`.
  `contain` (produk transparan) otomatis dapat drop-shadow. (Untuk background full-bleed pakai `background.type:"image"`, bukan element ini.)
- **`scrim`** — overlay gradient untuk keterbacaan teks di atas foto.
  `{ "gradient": { "direction", "stops":[{ "color", "alpha", "position" }] } }`.
- **`footer`** — bar kontak. `{ "slots":[...], "style":{...} }`. Slot brand (instagram/tiktok/whatsapp/facebook/youtube)
  dan generic (website/location/booking/hashtag/phone) → icon via komponen `SocialIcon` (asset frontend).
- **`group`** — kontainer **flow vertikal**: anak (`children`) mengalir dengan **gap TETAP**, jadi jarak
  headline↔body proporsional berapa pun panjang teks (pendek tak menganga, panjang tak tabrakan).
  `{ "anchor":"top|bottom", "gap":n, "children":[ ...text ] }`. `anchor:"bottom"` = cluster nempel garis `y`
  dan tumbuh ke atas (cocok untuk teks di bawah foto). Anak biasanya `text` **tanpa `x/y`** (posisi diatur group).

### Konvensi `fontSize`
`style.fontSize` ditulis dalam **ruang 1080px** (bukan px layar). Renderer mengubahnya ke `cqw` agar skala
otomatis mengikuti lebar container (kartu galeri kecil maupun canvas editor besar pakai angka yang sama).

### Menambah tipe baru
Tambah tipe **hanya** kalau ada kebutuhan visual yang benar-benar baru (mis. `badge`, `sticker`, `image`,
`image_card`). Bersifat **aditif** — template lama tidak berubah. Jangan bikin tipe baru kalau cukup `text`/`logo`.

---

## 4. Element `text`: `role` vs `bind` (PENTING)

Dua sumbu yang **berbeda** dan tidak boleh dicampur:

| Field | Fungsi | Nilai |
|---|---|---|
| `role` | label peran visual (untuk identifikasi/gaya) | **bebas**: `eyebrow`, `headline`, `subtitle`, `caption`, `body`, `terms`, `footnote`, … |
| `bind` | menandai slot yang **diisi AI** saat generate | **kosakata tetap**: `headline`, `body`, `cta` |

Aturan:
- `text` dengan **`bind`** → `value`-nya diganti output AI saat generate. `value` di JSON = teks contoh/placeholder.
- `text` tanpa `bind` → **teks statis** bawaan template (tanggal, S&K, label acara, disclaimer).
- **Minimal wajib:** satu template harus punya ≥1 elemen `bind: "headline"`.
- `body` & `cta` **opsional** — tergantung layout. Layout tanpa CTA cukup tidak punya elemen `bind:"cta"`
  (AI tetap menghasilkan cta, hanya tidak ditempatkan). Inilah yang membuat layout boleh variatif.

```jsonc
{ "type":"text", "role":"headline", "bind":"headline",
  "x":0.1, "y":0.22, "width":0.8, "align":"center",
  "value":"TEBUS\nMURAH",                          // \n = baris baru; placeholder sebelum AI mengisi
  "style":{ "fontSize":130, "weight":"800", "color":"accent" } }
```

---

## 5. Personalisasi brand (`brand_theme`)

Blok **opsional** yang mendeklarasikan **bagian mana yang ikut data company profile** saat generate
(render-time). Yang tidak disebut = **LOCKED** (tetap pakai nilai template). `template_config` di DB
**tidak pernah dimutasi** — merge hanya terjadi saat render, jadi tetap patuh Template Integrity (§6 AGENTS.md).

```jsonc
"brand_theme": {
  "color_slots":      { "accent": 0 },                              // role -> index company_profile.brand_colors
  "font_brand_roles": ["subtitle", "caption", "terms", "footnote"]  // role teks yang boleh pakai brand_font
}
```

Dua sumbu, **dipisah** (sama disiplinnya dengan `role` vs `bind`):

- **Warna** (`color_slots`) — brandable: role yang disebut ← `brand_colors[index]`. Locked: background, `primary` (warna teks), role lain.
- **Font** (`font_brand_roles`) — brandable: role teks di daftar ← `brand_font`. Locked: role teks lain, terutama `headline` (display identity).

Aturan & alasan:

- **`color_slots`** memetakan role → index `brand_colors`. Mulai aman: **1 slot** (`accent`). Background &
  warna teks **jangan** di-brand → jaga kontras/keterbacaan. Kalau `brand_colors` lebih sedikit dari jumlah
  slot, slot sisa **fallback** ke nilai template.
- **`font_brand_roles`** = daftar role teks yang boleh pakai `brand_font`. **`headline` sebaiknya tetap font
  template** (ukuran besar = rawan meluber & bagian identitas template). Fallback ke font template bila
  `brand_font` kosong.
- Default konservatif: **brand cukup jadi aksen**, bukan mendominasi. Longgarkan per-template hanya kalau memang dirancang begitu.

### Dua mode

Tentukan lewat field `mode` (default `tint`):

- **`tint`** — aman/konservatif. Hanya role di `color_slots` yang di-brand; sisanya locked. Cocok untuk template berpalet kuat (mis. Sushi Tei hijau).
  Background & scrim **LOCKED** secara default. Template foto+scrim (mis. Editorial, SOPWER) bisa `"scrim": true` agar overlay jadi **veil brand** — di situlah brand muncul saat background = foto.
- **`derive`** — seluruh palet **diturunkan otomatis** dari satu brand color. Cocok untuk template yang sengaja dibuat *adaptif ke brand apa pun* (mis. Astari).

```jsonc
"brand_theme": {
  "mode": "derive",
  "source": 0,                 // index company_profile.brand_colors yang jadi baseline
  "derive": {
    "accent":     "base",      // brand apa adanya (pop headline)
    "background": "tint",      // brand di-lighten -> pale tint (gradient)
    "secondary":  "readable",  // brand di-darken -> kebaca di bg terang
    "primary":    "on-image"   // putih / auto-kontras (teks di atas foto) — tidak ikut brand
  },
  "font_brand_roles": ["body", "closing"]
}
```

Resep turunan (diimplementasikan di helper warna renderer, bukan di JSON):

| Resep | Operasi |
| --- | --- |
| `base` | brand apa adanya |
| `tint` | lighten brand → pale (latar) |
| `readable` | darken/saturate brand → teks di bg terang |
| `on-image` | putih, atau auto-kontras vs latar |

> **Guardrail wajib:** warna teks hasil turunan harus lolos rasio kontras minimum vs latarnya; bila tidak, **clamp** (paksa lebih gelap/terang). Ini yang menjamin hasil `derive` tidak pernah jadi tak-terbaca.

Pada mode `derive`, `color_scheme` di JSON berfungsi sebagai **default/fallback** (dipakai saat preview atau bila brand color kosong).

---

## 6. Alur generate (konteks)

```
AI output (skema tetap): { headline, body, cta }
   → generate_service: untuk tiap elemen ber-`bind`, value = ai_output[bind]
   → elemen tanpa `bind` tetap statis
```

> ⚠️ **Dependency saat implement AI-fill:** penelusuran elemen ber-`bind` WAJIB rekursif ke dalam
> `children` element `group` — bukan cuma elemen top-level. (Contoh: SOPWER menaruh headline & body
> di dalam `group`, jadi bind-nya ada di level children.)

---

## 7. Field metadata di file JSON

Setiap file boleh punya blok `_meta` (dokumentasi, bukan bagian config) + field row DB:
`name`, `industry`, `theme`, `content_type`, `thumbnail_url`, `is_premium`, lalu `template_config`.

---

## 8. Checklist sebelum menyimpan template JSON baru

- [ ] Tidak ada gambar konten spesifik di `template_config` (lihat bagian 1)
- [ ] `brand_theme` (jika ada): background & warna teks TIDAK di-brand; `headline` tetap font template
- [ ] Ada ≥1 elemen `bind: "headline"`
- [ ] `bind` hanya memakai `headline` / `body` / `cta`
- [ ] Warna pakai role bila memungkinkan, konsisten dengan `color_scheme`
- [ ] Posisi 0–1, `fontSize` dalam ruang 1080px
- [ ] `value` pada elemen ber-`bind` diisi placeholder yang masuk akal
