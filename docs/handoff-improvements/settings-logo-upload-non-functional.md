# Findings: Upload Logo Bisnis di Settings — Belum Fungsional (UI Mock)

> Status: Investigation only — belum ada keputusan fix, dokumen ini murni laporan temuan.
> Terkait: Settings → tab "Profil Bisnis" → section "Logo & Identitas".
> Ditemukan juga di flow `/onboarding` (step "Logo & Identitas") — pola stub yang sama, kemungkinan hasil copy-paste.

---

## 1. Ringkasan

Tombol "Tarik logo ke sini atau klik untuk unggah" di halaman Settings **tidak melakukan upload apapun**.
Ini adalah UI mock/prototype yang belum pernah disambungkan ke storage atau ke backend. Tidak ada file
picker yang terbuka, tidak ada network request, dan tidak ada data yang tersimpan.

## 2. Current Behavior (hasil investigasi kode)

File: `frontend/src/app/settings/page.tsx`, fungsi `TabProfilBisnis` (baris ~361-488).

- **State logo hanyalah boolean**, bukan file:
  ```ts
  const [logo, setLogo] = useState(false);   // line 368
  ```
  Tidak ada `File | null`, tidak ada `logoUrl` yang dibaca dari `user?.logoUrl` sama sekali —
  komponen ini tidak pernah pre-fill dari data profile yang sudah ada.

- **Dropzone tidak berisi `<input type="file">`.** Elemen yang terlihat seperti dropzone (baris 462-478)
  adalah `<div onClick={...}>` biasa:
  ```tsx
  onClick={() => { setLogo(true); toast({ title: "Logo terunggah", variant: "success" }); }}
  ```
  Klik di situ **langsung** men-set `logo = true` dan menampilkan toast sukses palsu — tanpa pernah
  membuka dialog pemilihan file, tanpa membaca file apapun dari disk user.

- **Preview "logo yang sudah diunggah" adalah data hardcoded**, bukan file yang sebenarnya (baris 447-461):
  ```tsx
  <div className="aigt-h6">logo-bisnis.png</div>
  <div className="aigt-caption">512×512 · 84 KB</div>
  ```
  Nama file dan ukuran ini statis/fiksi, sama persis di setiap kondisi — bukan hasil baca metadata file asli.
  Avatar yang ditampilkan pun bukan gambar logo, melainkan cuma huruf inisial nama bisnis
  dengan background warna primary (`{initial}` — baris 454-455).

- **Tombol "Ganti" cuma mengembalikan state ke `false`** (baris 460) — kembali ke tampilan dropzone kosong,
  tidak ada logic ganti file yang sesungguhnya.

- **`handleSave` (submit form "Simpan profil bisnis") tidak menyertakan logo sama sekali** (baris 382-400):
  ```ts
  await updateProfile({
    businessName: businessName.trim(),
    industry,
    tagline: tagline.trim(),
    brandColors: [primary, secondary],
    brandFont: font,
    contact,
  });
  ```
  Field `logoUrl` tidak pernah dikirim ke `updateProfile()` — walaupun tombol upload di-klik dan toast
  "Logo terunggah" muncul, tidak ada apapun yang benar-benar disimpan ke company_profile saat form disave.

- **State `logo` tidak persist.** Karena ia cuma `useState` lokal component (bukan dibaca dari
  `user.logoUrl`), refresh halaman atau pindah tab lalu balik lagi akan mengembalikan tampilan ke
  dropzone kosong — seolah logo belum pernah diunggah, walau sebelumnya sempat "sukses".

### Ditemukan juga di `/onboarding`

`frontend/src/app/onboarding/page.tsx` step 1 ("Logo & Identitas", baris ~99-131) punya **pola stub yang
identik**: `const [logo, setLogo] = useState(false)` (baris 33), dropzone `onClick` yang cuma
`setLogo(true)` + toast palsu (baris 118), preview hardcoded `logo-senja.png` / `512×512 · 84 KB`
(baris 111-112). `next()` (baris 56-70) yang memanggil `updateProfile()` di step terakhir juga tidak
pernah menyertakan `logoUrl`.

→ Ini bukan bug yang berdiri sendiri di satu halaman — ini stub yang di-copy-paste ke dua flow berbeda,
jadi fix idealnya menyelesaikan keduanya sekaligus (atau diekstrak jadi satu komponen `LogoUploadField`
yang dipakai keduanya).

## 3. Root Cause

Fitur ini belum pernah diimplementasikan ujung-ke-ujung — baik di frontend maupun backend:

**Frontend** — tidak ada:
- `<input type="file">` / file picker
- Validasi tipe file & ukuran (UI sudah menuliskan syarat "PNG, JPG atau SVG · maks 5 MB" tapi tidak
  pernah benar-benar divalidasi, karena tidak ada file yang pernah diterima)
- Panggilan API untuk upload file

**Backend** — dicek `backend/app/services/storage_service.py` dan `backend/app/routers/company_profile.py`:
- `storage_service.py` sudah punya fungsi upload untuk thumbnail, thematic image, dan export
  (`upload_thumbnail`, `upload_permanent_thematic`, `upload_exported`), tapi **tidak ada `upload_logo`**.
- Router `company-profile` (`GET`/`POST`/`PATCH` di `backend/app/routers/company_profile.py`) hanya
  menerima JSON body lewat `CompanyProfileCreate`/`CompanyProfileUpdate` — field `logo_url` di schema
  (`backend/app/schemas/company_profile.py`) bertipe `str | None`, artinya endpoint ini **mengharapkan
  URL yang sudah jadi**, bukan menerima file mentah (`UploadFile`). Tidak ada endpoint multipart untuk
  terima file logo sama sekali.
- `AGENTS.md` §7 (Storage Flow) sudah mendokumentasikan path yang seharusnya dipakai:
  `permanent/logos/{user_id}/logo.{ext}` — tapi path ini belum ada implementasinya di kode manapun.

Kesimpulan: kolom `logo_url` di database & schema **sudah siap menerima data**, tapi **tidak ada jalur
yang mengisinya** — baik dari sisi endpoint upload backend maupun dari sisi UI frontend yang benar-benar
mengirim file.

## 4. Dampak

- User yang mengira sudah upload logo brand-nya akan kaget saat logo tidak pernah muncul di preview
  template, canvas editor, atau hasil export — karena `company_profile.logo_url` di database tetap
  `null` selamanya lewat jalur UI ini.
- Toast sukses palsu ("Logo terunggah") menciptakan ekspektasi salah bahwa aksi berhasil, padahal
  tidak ada efek nyata sama sekali — berpotensi menyesatkan user secara diam-diam.
- Karena berlaku juga di `/onboarding`, ini adalah titik pertama kali user baru mencoba fitur ini —
  kesan awal produk jadi buruk kalau dibiarkan seperti ini.

## 5. Yang BUKAN bagian dari temuan ini (di luar scope investigasi)

- Belum ada keputusan desain soal detail teknis fix (validasi ukuran/tipe file di client vs server,
  apakah crop/resize logo, dsb.) — itu keputusan produk yang belum diambil.
- Tidak menyentuh field lain di "Profil Bisnis" (warna brand, font, kontak) — semuanya itu sudah
  tersambung dengan benar ke `updateProfile()`/backend, tidak ada masalah di situ.
- Tidak mengevaluasi `resolveTemplateLayout`/rendering logo di canvas — itu domain terpisah
  (lihat catatan non-goal di `docs/handoff-improvements/merge-in-create.md`).

## 6. Kemungkinan Arah Perbaikan (belum final — perlu keputusan Irfan)

Kalau nanti mau dikerjakan, ini butuh kerjaan di kedua sisi, bukan cuma frontend:

1. **Backend**: tambah `storage_service.upload_logo(...)` (path `permanent/logos/{user_id}/logo.{ext}`
   sesuai AGENTS.md §7) + endpoint baru yang menerima `UploadFile` (mis. `POST /api/v1/company-profile/logo`),
   validasi tipe (`png`/`jpg`/`svg`) & ukuran maks 5 MB di server, return `logo_url` yang lalu disimpan
   ke `company_profiles.logo_url`.
2. **Frontend**: ganti dropzone mock dengan `<input type="file">` sungguhan, panggil endpoint upload di
   atas, lalu simpan `logo_url` hasilnya ke store yang sama (via `updateProfile`/`refreshProfile` — lihat
   `frontend/src/lib/auth.tsx`) supaya konsisten dengan pola yang sudah ada untuk field profile lainnya.
3. Pertimbangkan ekstrak jadi satu komponen `LogoUploadField` yang dipakai ulang di `settings/page.tsx`
   **dan** `onboarding/page.tsx`, supaya tidak ada dua implementasi stub yang harus di-maintain terpisah.
4. Ikuti TDD wajib sesuai `AGENTS.md` §3 — test upload sukses, file terlalu besar, tipe file tidak
   didukung, dan upload gagal (mock storage error → `STORAGE_UPLOAD_FAILED`).

Ini murni opsi untuk didiskusikan — belum ada yang dieksekusi.
