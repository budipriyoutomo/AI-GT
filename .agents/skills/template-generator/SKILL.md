---
name: template-generator
description: >
  Standardized visual template extraction and generator skill for AI-GT. Converts template reference images
  into production-ready template_config JSON files complying with seed_template_data/README.md guidelines,
  enforcing mandatory slots (Logo, Headline, Body, CTA, Footer), dual-renderer parity (CSS + Fabric.js),
  brand theme color rules, coordinate normalization (0.0-1.0), and user confirmation of ambiguities.
  Use when user asks to convert an image to a template, generate a new template, create a template config,
  or mentions template generation from image.
---

# Template Generator Skill — AI-GT

Skill ini digunakan untuk mengoversi gambar referensi desain menjadi file `template_config` JSON yang **100% konsisten**, presisi, dan sesuai standar [backend/scripts/seed_template_data/README.md](file:///home/irfan/works/startupforindustries/AI-GT/backend/scripts/seed_template_data/README.md).

---

## 1. Lima Elemen Wajib (Mandatory 5-Element Checklist)

Setiap template yang dihasilkan **WAJIB** memiliki 5 elemen utama ini (tidak boleh ada yang terlewat):

1. **Logo Slot** (`type: "logo"`):
   ```json
   {
     "type": "logo",
     "source": "brand",
     "x": 0.05,
     "y": 0.05,
     "width": 0.15,
     "height": 0.06
   }
   ```
2. **Headline Header** (`role: "headline"` & `bind: "copy.headline"`):
   ```json
   {
     "type": "text",
     "role": "headline",
     "bind": "copy.headline",
     "x": 0.08,
     "y": 0.18,
     "width": 0.84,
     "style": {
       "fontSize": 42,
       "weight": "bold",
       "color": "primary",
       "align": "center"
     }
   }
   ```
3. **Body Copy** (`role: "body"` & `bind: "copy.body"`):
   ```json
   {
     "type": "text",
     "role": "body",
     "bind": "copy.body",
     "x": 0.08,
     "y": 0.35,
     "width": 0.84,
     "style": {
       "fontSize": 20,
       "weight": "normal",
       "color": "#333333",
       "align": "center"
     }
   }
   ```
4. **CTA Button / Box** (`role: "cta"` & `bind: "copy.cta"`):
   ```json
   {
     "type": "text",
     "role": "cta",
     "bind": "copy.cta",
     "x": 0.25,
     "y": 0.72,
     "width": 0.5,
     "style": {
       "fontSize": 18,
       "weight": "bold",
       "color": "#FFFFFF",
       "background": "accent",
       "radius": 24,
       "padding": "0.5em 1.5em",
       "align": "center"
     }
   }
   ```
5. **Footer Contact Bar** (`type: "footer"`):
   ```json
   {
     "type": "footer",
     "x": 0.05,
     "y": 0.90,
     "width": 0.90,
     "slots": ["instagram", "whatsapp", "location"],
     "align": "center",
     "style": {
       "color": "#666666",
       "fontSize": 14
     }
   }
   ```

---

## 2. Protokol Konfirmasi Ambiguitas (Mandatory Confirmation Protocol)

Sebelum menulis file `template_config` JSON final, periksa dan **konfirmasi kepada user** jika ditemukan salah satu ambiguitas berikut:

1. **Aspect Ratio Ambiguity**:
   - Jika rasio gambar tidak langsung jelas (misal mendekati `1:1` vs `4:5`), **TANYA user** rasio yang diinginkan (`1:1` 1080x1080, `4:5` 1080x1350, atau `9:16` 1080x1920).
2. **Solid vs. Gradient Fills**:
   - Warna latar belakang atau button yang ambigu di gambar referensi (karena kompresi/lighting foto): **TANYA user** apakah ingin menggunakan **solid color** atau **gradient** (dan arah gradient-nya).
3. **Product / Image Slot vs. Static Background**:
   - Elemen gambar dekoratif atau foto produk: **TANYA user** apakah area tersebut dijadikan **Product Image Slot** (`source: "thumbnail"`), **Background Image Slot** (`source: "background"`), atau area terbuka.
4. **Typography Fallback**:
   - Jika gambar menggunakan font dekoratif khusus: **TANYA/Rekomendasikan** pilihan font yang didukung di project (`Inter`, `Poppins`, `Montserrat`, `Anton`, `Archivo Black`).

---

## 3. Aturan Schema & Brand Adaptability

- **Brand Theme**: Wajib memiliki `brand_theme` agar tombol "Preview dengan brand color" di frontend berfungsi.
  ```json
  "brand_theme": {
    "color_slots": { "accent": 0, "primary": 1 },
    "font_brand_roles": ["body"]
  }
  ```
- **Koordinat Ternormalisasi**: Seluruh elemen visual menggunakan koordinat float `0.0` sampai `1.0` relatif terhadap ukuran canvas (`1080px`).
- **Aspect Dimensions**:
  - `1:1` → `width: 1080, height: 1080`
  - `4:5` → `width: 1080, height: 1350`
  - `9:16` → `width: 1080, height: 1920`

---

## 4. Alur Kerja Setelah JSON Dibuat

1. Simpan JSON ke `backend/scripts/seed_template_data/<category>/<template_id>.json`.
2. Jalankan test parity & resolver frontend untuk memastikan JSON valid dan dapat di-render oleh CSS (`TemplateRenderer.tsx`) and Fabric.js (`TemplateFabricCanvas.tsx`).
3. Jalankan `make seed` dari root repository untuk meng-update database.
