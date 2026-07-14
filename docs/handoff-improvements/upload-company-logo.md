# HANDOFF 0 — Company Logo Upload (Real Implementation)

> **Status:** Ready for execution
> **Prerequisite untuk:** Handoff 2 (Live-merge company profile)
> **Owner:** Claude Code
> **Baca dulu:** `AGENTS.md` (seluruhnya), `docs/Tech_Doc.md` §5, §6, §7, §10, §12

---

## 1. Problem Statement

Fitur upload logo perusahaan **tidak pernah benar-benar diimplementasikan**. Yang ada saat ini
hanya mock di UI — file yang dipilih user tidak pernah sampai ke backend, tidak pernah masuk
Cloudflare R2, dan `company_profiles.logo_url` tidak pernah terisi dengan asset nyata.

Dampak langsung:

- Onboarding dan Settings tampak berfungsi tapi tidak menghasilkan apa-apa.
- Slot `logo` di `template_config` tidak pernah ter-render dengan logo user asli, baik di
  `TemplateRenderer` (CSS) maupun di `TemplateFabricCanvas` (Fabric).
- **Handoff 2 (live-merge company profile) tidak dapat divalidasi secara utuh.** `logo_url`
  adalah satu-satunya field brand yang melewati storage layer + CDN. Kalau logo masih mock,
  live-merge hanya teruji untuk `brand_colors`/`brand_font` — yaitu jalur yang paling tidak
  mungkin rusak. Jalur yang paling mungkin rusak (CDN cache, CORS, canvas taint) tidak teruji
  sama sekali.

---

## 2. Root Cause

Jalur logo tidak pernah ada di kode, meskipun sudah dijanjikan di dokumen:

| Dokumen | Isi | Realita |
|---|---|---|
| `AGENTS.md` §7 | Struktur bucket mencantumkan `permanent/logos/{user_id}/logo.{ext}` | Folder tidak pernah ditulis |
| `Tech_Doc` §10 | Struktur bucket **tidak menyebut** `logos/` sama sekali | Konsisten dengan realita |
| `Tech_Doc` §7 | `/api/v1/company-profile` hanya `GET` / `POST` / `PATCH` | Tidak ada endpoint upload |
| `storage_service.py` | `upload_temp`, `move_to_permanent`, `upload_permanent_thematic`, `upload_exported` | Tidak ada fungsi logo |

Artinya path logo di `AGENTS.md` bersifat **aspirational sejak awal**. Handoff ini menutup gap
tersebut dan menyelaraskan dokumen dengan kode.

---

## 3. Keputusan Arsitektur (SUDAH DIPUTUSKAN — jangan diperdebatkan ulang)

### 3.1 Endpoint upload dipisah dari mutasi profil

```
POST /api/v1/company-profile/logo     (multipart/form-data, field: file)
  → validasi + normalisasi + upload ke R2
  → return { logo_url: "/permanent/logos/{user_id}/logo.png?v={epoch}" }
  → TIDAK menyentuh database
```

Penulisan ke DB tetap melalui endpoint existing (`POST` untuk onboarding, `PATCH` untuk settings)
dengan `logo_url` di body.

**Alasan (jangan diubah):** onboarding punya chicken-and-egg — user meng-upload logo di step 2,
tapi row `company_profiles` baru lahir di akhir wizard. Kalau endpoint upload sekaligus menulis DB,
ia harus punya dua perilaku (profil ada → update; belum ada → hanya return path). Itu ambiguitas
yang tidak perlu. Satu endpoint, satu tanggung jawab, perilaku identik di onboarding maupun settings.

Path memakai `{user_id}` (bukan `{profile_id}`) sehingga upload legal dilakukan sebelum profil ada.
Ini sudah sesuai `AGENTS.md` §7.

### 3.2 Normalisasi ke PNG (Pillow)

Semua logo dinormalisasi server-side:

- Terima: **PNG, JPEG, WEBP**. Tolak sisanya (termasuk **SVG** — lihat Non-Goals).
- Deteksi tipe via **MIME sniffing dari bytes** (`PIL.Image.open`), **bukan** dari header
  `Content-Type` atau ekstensi filename.
- Konversi ke **PNG** (mode `RGBA`).
- Resize proporsional sehingga **sisi terpanjang maksimum 1024px** (jangan upscale kalau sudah
  lebih kecil).
- Batas ukuran file mentah: **2 MB**.

**Alasan:** ekstensi variabel → path variabel → overwrite tidak bekerja → file orphan menumpuk
setiap user ganti logo. Normalisasi juga memberi transparansi konsisten, meng-strip EXIF, dan
menjaga canvas tetap ringan.

### 3.3 Cache busting via query version

`logo_url` yang disimpan di DB **menyertakan query version**:

```
/permanent/logos/{user_id}/logo.png?v=1752345600
```

Object key di R2 tetap deterministik (`permanent/logos/{user_id}/logo.png`) → overwrite, tanpa
orphan. `?v={epoch}` dibangkitkan saat upload dan ikut disimpan di kolom `logo_url`.

**Alasan:** tanpa ini, Cloudflare CDN akan terus menyajikan logo lama setelah user mengganti logo.
Gejalanya akan terlihat persis seperti "live-merge gagal" padahal itu murni CDN — dan akan salah
didiagnosis saat validasi Handoff 2.

`resolveAssetUrl` (`lib/assetUrl.ts`) hanya meng-prepend `NEXT_PUBLIC_CDN_URL`, jadi query string
lolos apa adanya. **Verifikasi ini di kode**, jangan diasumsikan.

> ⚠️ Catatan: ini sedikit melonggarkan asumsi di `Tech_Doc` §10 bahwa kolom URL berisi *path
> root-relative murni*. Sekarang ia berisi path + query. Perbarui §10 sesuai §7 di bawah.

### 3.4 Resolve logo tetap LIVE — jangan diubah

Editor & renderer me-resolve logo langsung dari `company_profile` (live-merge), **bukan** dari
snapshot di `final_config`. Perilaku ini **dipertahankan apa adanya**.

Konsekuensi yang diterima: user rebrand → buka project lama → logo di editor ikut berubah, meski
PNG yang sudah ter-export masih memakai logo lama.

> ⛔ **Ini keputusan yang masih pending pembahasan (terkait Point 8). JANGAN mengubah perilaku ini,
> JANGAN menambah snapshot brand ke `final_config`, dan JANGAN mendokumentasikannya ke
> `docs/render-template-logic.md`.** Cukup implementasikan sesuai perilaku yang sudah ada.

---

## 4. Scoped Work Items

### 4.1 Backend — Storage

**`app/services/storage_service.py`**

- Tambah `upload_logo(user_id: UUID, file_bytes: bytes) -> str`
  - Validasi + normalisasi (lihat §3.2) — atau delegasikan normalisasi ke helper terpisah
    (mis. `app/utils/images.py`) supaya bisa di-unit-test tanpa mock S3.
  - Upload ke key `permanent/logos/{user_id}/logo.png`, `ContentType=image/png`.
  - Return **path root-relative + query version**: `/permanent/logos/{user_id}/logo.png?v={epoch}`.
  - Kegagalan upload → `AppError(500, ErrorCode.STORAGE_UPLOAD_FAILED, ...)`.

### 4.2 Backend — Error codes

**`app/utils/exceptions.py`**

`ErrorCode` saat ini tidak punya konstanta untuk kegagalan validasi file. `STORAGE_UPLOAD_FAILED`
adalah 500 dan **tidak boleh** dipakai untuk input user yang salah (file terlalu besar / format
tidak didukung → itu **400**). `AGENTS.md` §4 melarang string error bebas.

Tambahkan:

```
INVALID_FILE_TYPE      → 400  (bukan PNG/JPEG/WEBP, atau bytes bukan gambar valid)
FILE_TOO_LARGE         → 400  (> 2 MB)
```

Sinkronkan daftar konstanta ini ke `AGENTS.md` §4 dan `Tech_Doc` §6.

### 4.3 Backend — Router & Schema

**`app/routers/company_profile.py`**

- `POST /logo` — `UploadFile` multipart, dependency `get_current_user`.
- Panggil `storage_service.upload_logo(current_user.id, await file.read())`.
- Response mengikuti standar `{ "success": true, "data": { "logo_url": "..." } }`.
- **Tidak menulis ke DB.**

**`app/schemas/company_profile.py`**

- Tambah response schema `LogoUploadData { logo_url: str }`.
- Pastikan `logo_url` pada schema create/update menerima string berisi query (`?v=`) — cek kalau
  ada validator/regex path yang akan menolaknya.

### 4.3b Backend — Hapus logo harus benar-benar bisa NULL (TRI-STATE PATCH)

`LogoUploadField` menyediakan aksi "Hapus" → `onChange(null)` → `PATCH { logo_url: null }`.
Jalur ini **tidak akan bekerja** dengan kode saat ini, dan bug-nya ada di **dua sisi**. Keduanya
wajib diperbaiki di handoff ini — kalau tidak, tombol Hapus adalah mock kedua yang menggantikan
mock pertama.

**Sisi frontend** — `src/lib/auth.tsx`, `updateProfile()` saat ini melakukan:

```ts
payload.logo_url = data.logoUrl ?? undefined;   // ← null berubah jadi undefined
```

`undefined` = key `logo_url` tidak pernah ikut terkirim di body. Backend tidak pernah tahu user
ingin menghapus. Perbaiki agar `null` diteruskan apa adanya, dan longgarkan tipe
`CompanyProfileUpdate.logo_url` (saat ini `string | undefined`) menjadi `string | null | undefined`.

**Sisi backend** — ini yang belum pernah dicek dan berpotensi bikin fix frontend di atas tetap
gagal. Pydantic `logo_url: str | None = None` **tidak dapat membedakan** dua hal:

| Maksud user | JSON body | Yang harus terjadi |
|---|---|---|
| Jangan sentuh logo | key `logo_url` **absen** | biarkan nilai lama |
| Hapus logo | `"logo_url": null` | set kolom ke NULL |

Keduanya sama-sama menghasilkan `None` di model. Kalau `company_profile_service` melakukan
update dengan pola `if value is not None: setattr(...)` atau
`data.model_dump(exclude_none=True)`, maka **null akan selalu di-skip** — bahkan setelah frontend
diperbaiki.

**Tugas:**

1. **BACA DULU** `app/services/company_profile_service.py` (fungsi update) dan tentukan pola yang
   dipakai sekarang. Jangan menulis kode sebelum ini dipastikan.
2. Pastikan pembedaan absen-vs-null bekerja — gunakan `model_dump(exclude_unset=True)` (bukan
   `exclude_none`), sehingga hanya field yang **benar-benar dikirim** yang di-apply, dan `null`
   yang dikirim eksplisit tetap ter-apply sebagai NULL.
3. Perilaku ini berlaku untuk `logo_url`. **Jangan** mengubah semantik field lain di PATCH sebagai
   efek samping — kalau `exclude_unset` mengubah perilaku field lain (mis. `tagline`), verifikasi
   lewat test bahwa itu memang perbaikan, bukan regresi.

> Ini bukan concern Handoff 2. Handoff 0-lah yang memperkenalkan aksi "Hapus", jadi Handoff 0 yang
> harus membuatnya bekerja.

### 4.4 Frontend — API layer

**`src/api/companyProfileApi.ts`**

- Tambah `uploadLogo(file: File): Promise<{ logo_url: string }>` — `FormData`, lewat `apiClient`.
  Jangan set `Content-Type` manual (biarkan browser yang mengatur boundary). Verifikasi
  `apiClient.ts` tidak memaksa `application/json` untuk semua request — kalau iya, kecualikan
  body bertipe `FormData`.

### 4.5 Frontend — Komponen bersama `LogoUploadField` (WAJIB, jangan dua implementasi)

Stub mock saat ini **di-copy-paste ke dua tempat** dengan pola identik:

- `src/app/settings/page.tsx` → `TabProfilBisnis` (~baris 361-488): `const [logo, setLogo] = useState(false)`
  (baris 368), dropzone berupa `<div onClick>` yang langsung `setLogo(true)` + toast sukses palsu
  (baris 462-478), preview hardcoded (baris 447-461), tombol "Ganti" hanya `setLogo(false)` (baris 460).
- `src/app/onboarding/page.tsx` → step "Logo & Identitas" (~baris 99-131): pola yang sama persis
  (`useState(false)` di baris 33, toast palsu di baris 118, preview hardcoded baris 111-112).

**Ekstrak menjadi satu komponen `LogoUploadField`** (mis. `src/components/ui/LogoUploadField.tsx`)
dan pakai di kedua halaman. Mengerjakannya dua kali = dua implementasi yang pasti drift.

Kontrak komponen:

```ts
type LogoUploadFieldProps = {
  value: string | null;              // logo_url dari profil (path + ?v=), null kalau belum ada
  onChange: (logoUrl: string | null) => void;  // dipanggil setelah upload sukses / dihapus
  disabled?: boolean;
};
```

Perilaku wajib:

- **Pre-fill dari `value`.** Kalau `value != null`, tampilkan preview memakai
  `resolveAssetUrl(value)` **saat mount** — bukan dropzone kosong. Bug saat ini: state hanya
  `boolean` lokal dan tidak pernah membaca profil, sehingga user yang sudah punya logo tetap
  melihat dropzone kosong setiap kali membuka halaman.
- **File picker sungguhan** — `<input type="file" accept="image/png,image/jpeg,image/webp">`.
  Hapus `<div onClick>` yang mensimulasikan upload.
- **Toast sukses HANYA setelah response 200.** Toast "Logo terunggah" saat ini muncul tanpa upload
  apa pun — hapus.
- **Hapus metadata hardcoded** (`logo-bisnis.png`, `512×512 · 84 KB`, `logo-senja.png`). Jangan
  diganti dengan metadata file mentah pilihan user — setelah normalisasi server, angka itu tetap
  salah (user pilih JPEG 2000×800, yang tersimpan PNG ≤1024). Cukup tampilkan preview gambar +
  aksi. Kalau metadata benar-benar dibutuhkan nanti, itu perluasan schema response — **bukan
  scope handoff ini**.
- **"Ganti"** → membuka file picker lagi (bukan reset state ke kosong).
- **"Hapus"** → `onChange(null)`. File di R2 dibiarkan (key deterministik, maksimum satu per user).
- State: `idle` / `uploading` / `error`. Error menampilkan pesan berdasarkan error code
  (`FILE_TOO_LARGE`, `INVALID_FILE_TYPE`, `STORAGE_UPLOAD_FAILED`).
- Validasi client-side (tipe + ukuran) hanya UX, **bukan** pengganti validasi server.

**Perbaiki copy UI.** Teks saat ini berbunyi *"PNG, JPG atau SVG · maks 5 MB"* — itu **bertentangan**
dengan kontrak backend di §3.2 (SVG ditolak, batas 2 MB). Ganti menjadi
**"PNG, JPG atau WEBP · maks 2 MB"** di kedua halaman. Membiarkannya = user memilih SVG dan
langsung kena 400.

### 4.6 Frontend — Integrasi ke halaman

- **Onboarding** (`onboarding/page.tsx`): `LogoUploadField` menyimpan `logo_url` ke state wizard →
  `next()` di step terakhir mengirimkannya di payload `updateProfile()`. Saat ini `next()`
  (~baris 56-70) **tidak pernah menyertakan `logoUrl`** — perbaiki.
- **Settings** (`settings/page.tsx`): `value` = `logo_url` dari profil aktif (pre-fill).
  `handleSave` (~baris 382-400) saat ini mengirim `businessName / industry / tagline / brandColors /
  brandFont / contact` **tanpa `logoUrl`** — tambahkan `logoUrl` ke payload `updateProfile()`.
- **Setelah `updateProfile()` sukses, panggil `refreshProfile()`** (`src/lib/auth.tsx`) supaya global
  state ikut ter-update. Tanpa ini, `/create` akan tetap merender logo lama dari state basi — yaitu
  bug yang persis sedang dibunuh Handoff 2, masuk lagi lewat pintu logo.

> ⚠️ **Fallback inisial huruf: hanya di chrome aplikasi, JANGAN di template renderer.**
> Avatar inisial nama bisnis (`{initial}`) di Settings/onboarding boleh tetap ada sebagai
> placeholder UI. Aturan "logo null → hidden, tanpa fallback teks" di §4.7 **hanya berlaku untuk
> `TemplateRenderer` dan `canvas-spec`**. Jangan menghapus avatar inisial di Settings, dan jangan
> membawa pola inisial itu masuk ke renderer template.

### 4.7 Frontend — Dua Renderer (PARITY WAJIB)

Per `AGENTS.md` §6, `template_config` digambar oleh dua renderer. Logo harus benar di **keduanya**:

| Renderer | File |
|---|---|
| CSS | `src/components/template/TemplateRenderer.tsx` |
| Fabric | `src/lib/editor/canvas-spec.ts` + `src/components/editor/TemplateFabricCanvas.tsx` |

- Render `company_profile.logo_url` ke element logo di `template_config`, melalui `resolveAssetUrl`.
- **Fabric wajib memuat gambar dengan `crossOrigin: 'anonymous'`.** Tanpa ini, canvas ter-taint →
  `toDataURL()` melempar `SecurityError` → **export PNG mati total** (bukan degradasi — mati).
- `logo_url == null` → element logo **hidden**, layout **tidak** reflow, tidak ada fallback ke teks
  `business_name`. Perilaku ini harus identik di kedua renderer.

---

## 5. Non-Goals (JANGAN DIKERJAKAN)

- ❌ **Jangan** menyentuh `docs/render-template-logic.md` (masih disegel menunggu Point 8).
- ❌ **Jangan** menambahkan snapshot brand/logo ke `final_config`.
- ❌ **Jangan** mengubah cara editor/renderer me-resolve brand (tetap live).
- ❌ **Jangan** mendukung **SVG**. Fabric membutuhkan `loadSVGFromURL` (code path terpisah) dan
  Pillow tidak bisa meraster SVG. Di luar scope MVP.
- ❌ **Jangan** memakai presigned URL / direct-to-R2 upload. File kecil, frekuensi rendah, dan itu
  menambah konfigurasi CORS bucket tanpa manfaat nyata.
- ❌ **Jangan** membuat endpoint delete logo. Menghapus logo = `PATCH { logo_url: null }`. File di R2
  boleh tertinggal (maksimum satu file per user karena key deterministik).
- ❌ **Jangan** menyentuh flow `image_source=upload` (thematic image) — itu jalur terpisah.
- ❌ **Jangan** mengubah `template_config` atau menambah field baru padanya.

---

## 6. TDD Requirements (WAJIB — Red → Green → Refactor)

Tidak ada implementasi sebelum ada test yang gagal. `AGENTS.md` §3.

### Backend — `pytest`

**Unit: normalisasi gambar** (`tests/unit/test_image_utils.py`) — tanpa mock S3:

| Test | Ekspektasi |
|---|---|
| PNG valid | Return bytes PNG, mode RGBA |
| JPEG valid | Ter-konversi ke PNG |
| WEBP valid | Ter-konversi ke PNG |
| Gambar 2000×800 | Resize → sisi terpanjang 1024, rasio terjaga |
| Gambar 400×400 | **Tidak** di-upscale |
| Bytes bukan gambar (mis. teks/PDF) | Raise → `INVALID_FILE_TYPE` |
| File `.png` tapi isinya bukan gambar | Ditolak (membuktikan sniffing, bukan percaya ekstensi) |
| SVG | Ditolak |

**Unit: storage** (`tests/unit/test_storage.py`) — mock boto3:

| Test | Ekspektasi |
|---|---|
| Happy path | Key = `permanent/logos/{user_id}/logo.png`; return path diawali `/permanent/logos/` dan mengandung `?v=` |
| Upload dua kali | Key **identik** (membuktikan overwrite), `?v=` **berbeda** |
| boto3 raise | `AppError(500, STORAGE_UPLOAD_FAILED)` |

**Endpoint** (`tests/unit/test_company_profile.py`):

| Test | Ekspektasi |
|---|---|
| Happy path | 200, `{success: true, data: {logo_url}}` |
| Tanpa token | 401 |
| File > 2 MB | 400 `FILE_TOO_LARGE` |
| File bukan gambar | 400 `INVALID_FILE_TYPE` |
| Storage gagal (mock) | 500 `STORAGE_UPLOAD_FAILED` |
| Upload berhasil | Row `company_profiles` **tidak berubah** (endpoint tidak menyentuh DB) |

**Tri-state PATCH `logo_url`** (`tests/unit/test_company_profile.py` + integration) — WAJIB:

| Test | Ekspektasi |
|---|---|
| `PATCH {}` (key `logo_url` **absen**), profil punya logo | `logo_url` **tidak berubah** |
| `PATCH {"logo_url": null}`, profil punya logo | `logo_url` menjadi **NULL** di DB |
| `PATCH {"logo_url": "/permanent/logos/.../logo.png?v=2"}` | Nilai baru tersimpan utuh, query `?v=` ikut |
| `GET` setelah delete | `logo_url` = `null` |

> Dua test pertama adalah inti dari perbaikan ini. Kalau keduanya tidak bisa dibedakan, pola update
> di service masih salah.

**Integration** (`tests/integration/test_company_profile_flow.py`):

| Test | Ekspektasi |
|---|---|
| Upload → `POST /company-profile` dengan `logo_url` | Profil tersimpan, `GET` mengembalikan `logo_url` yang sama persis (query `?v=` ikut utuh) |
| Upload → `PATCH` logo baru | `logo_url` berubah, `?v=` berbeda dari sebelumnya |

Coverage minimum tetap: routes 90%, services 85%, storage 80% (mock).

### Frontend — `vitest`

| Test | Ekspektasi |
|---|---|
| `companyProfileApi.uploadLogo` | Mengirim `FormData`, tidak memaksa `Content-Type: application/json` |
| `resolveAssetUrl` dengan query | `/permanent/logos/x/logo.png?v=123` → `{CDN}/permanent/logos/x/logo.png?v=123` (query utuh) |
| `updateProfile({ logoUrl: null })` (`lib/auth.tsx`) | Body request memuat `"logo_url": null` — key **ikut terkirim**, bukan di-strip jadi `undefined` |
| `updateProfile({})` tanpa `logoUrl` | Key `logo_url` **tidak ada** di body |
| `LogoUploadField` dengan `value != null` | Menampilkan preview saat mount, **bukan** dropzone kosong (regression test untuk bug pre-fill) |
| `LogoUploadField` dengan `value = null` | Menampilkan dropzone |
| `LogoUploadField` upload gagal (mock 400) | **Tidak** memanggil `onChange`, **tidak** menampilkan toast sukses (regression test untuk toast palsu) |
| `LogoUploadField` upload sukses | `onChange` dipanggil dengan `logo_url` dari response |
| `TemplateRenderer` + `logo_url` | Merender `<img>` dengan URL ter-resolve |
| `TemplateRenderer` + `logo_url = null` | Element logo **tidak** dirender; posisi element lain tidak bergeser |
| `canvas-spec` + `logo_url = null` | Spec logo tidak dihasilkan; geometri element lain identik dengan kasus logo ada |

> Pengukuran font/canvas tidak bisa headless di jsdom (`AGENTS.md` §6). Uji **geometri murni** di
> `canvas-spec.ts` dengan pengukur di-inject; jangan mencoba menguji rendering Fabric sungguhan.

---

## 7. Dokumen yang Harus Ikut Diperbarui

- `Tech_Doc` §6 — tambahkan `INVALID_FILE_TYPE`, `FILE_TOO_LARGE` ke daftar `ErrorCode`.
- `Tech_Doc` §7 — tambahkan `POST /api/v1/company-profile/logo` ke tabel endpoint.
- `Tech_Doc` §10 — tambahkan `permanent/logos/{user_id}/logo.png` ke struktur bucket, dan catat
  bahwa `logo_url` menyimpan path + query version (pengecualian dari "path root-relative murni").
- `AGENTS.md` §4 — tambahkan dua error code baru.
- `AGENTS.md` §7 — perbaiki `logo.{ext}` → `logo.png` (selalu dinormalisasi).

> ⛔ `docs/render-template-logic.md` **tidak** disentuh. Lihat Non-Goals.

---

## 8. Acceptance Criteria

1. `POST /api/v1/company-profile/logo` menerima PNG/JPEG/WEBP, menolak selainnya dengan **400** +
   error code yang benar (bukan 500).
2. File tersimpan di R2 pada key `permanent/logos/{user_id}/logo.png` dan **selalu ter-overwrite**
   saat user upload ulang (tidak ada orphan).
3. `logo_url` di DB memuat `?v={epoch}` dan berubah setiap upload.
4. Onboarding: logo yang di-upload muncul di preview dan ikut tersimpan saat profil dibuat.
5. Settings: mengganti logo langsung terlihat setelah reload (**membuktikan cache busting bekerja**).
5b. **Buka Settings dengan profil yang sudah punya logo → preview logo langsung tampil saat mount**
    (bukan dropzone kosong). Ini regression check untuk bug state `boolean` yang tidak pernah
    membaca profil.
5c. Tidak ada lagi toast "Logo terunggah" yang muncul tanpa upload nyata; toast hanya setelah 200.
5d. Copy UI di kedua halaman berbunyi "PNG, JPG atau WEBP · maks 2 MB" (bukan SVG / 5 MB).
5e. Satu komponen `LogoUploadField` dipakai di Settings **dan** onboarding — tidak ada dua
    implementasi terpisah.
5f. **Klik "Hapus" di Settings → simpan → reload → logo benar-benar hilang** (kolom `logo_url` di DB
    = NULL). Ini membuktikan tri-state PATCH (§4.3b) bekerja di frontend **dan** backend.
5g. Menyimpan profil **tanpa menyentuh logo** tidak menghapus logo yang sudah ada (key absen ≠ null).
6. Logo user asli ter-render benar di **`TemplateRenderer` (galeri/preview) DAN
   `TemplateFabricCanvas` (editor)**.
7. `logo_url = null` → slot logo hidden di kedua renderer, tanpa reflow.
8. **Export PNG dari editor berhasil dengan logo asli dari R2 di canvas** (bukan `image_source=none`,
   bukan mock). Ini membuktikan `crossOrigin` + CORS R2 benar dan canvas tidak ter-taint. Kalau
   `toDataURL()` melempar `SecurityError`, **STOP dan laporkan** — itu berarti konfigurasi CORS
   bucket perlu diperbaiki (di luar scope kode, tapi memblokir handoff ini).
9. Semua test hijau, coverage tidak turun di bawah minimum per layer.

---

## 9. Setelah Ini

Handoff 2 (live-merge company profile) baru bisa divalidasi secara utuh — karena logo, satu-satunya
field brand yang melewati storage + CDN, akhirnya nyata.