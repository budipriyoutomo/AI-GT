# Handoff 2 — Live-Merge Company Profile Fetch di `/create`

> **Status:** Ready for execution — **SETELAH Handoff 0 selesai**
> **Depends on:** `docs/handoff-improvements/logo-upload.md` (Handoff 0)
> **Terkait:** PRD §4.3, Tech Doc §5 (`company_profiles`) & §12 (Frontend), `docs/render-template-logic.md` (Fetch Strategy)
> **Non-terkait langsung (jangan digabung):** resolve logic template (`resolveTemplateLayout`) — issue terpisah, masih pending keputusan. JANGAN disentuh di scope ini.

---

## 0. Dependency — baca sebelum mulai

Handoff ini **mengasumsikan Handoff 0 sudah selesai dan hijau**, khususnya:

- Upload logo nyata (`POST /api/v1/company-profile/logo`) — `logo_url` benar-benar terisi di DB.
- `logo_url` memuat cache-busting query `?v={epoch}`.
- Hapus logo bekerja end-to-end (tri-state PATCH: key absen ≠ `null`) — lihat Handoff 0 §4.3b.
- `refreshProfile()` (`src/lib/auth.tsx`) dipanggil setelah `updateProfile()` sukses di Settings.

Kalau salah satu di atas belum benar, **STOP** — acceptance criteria handoff ini tidak dapat
divalidasi dan hasilnya akan menyesatkan (brand terlihat basi bukan karena live-merge gagal, tapi
karena data sumbernya memang tidak pernah berubah).

---

## 1. Problem Statement

Company profile (`brand_colors`, `brand_font`, `logo_url`, `contact`) di-fetch **sekali saat login**,
disimpan di global state (`AuthContext`), lalu dipakai terus selama sesi aktif tanpa fetch ulang.

Konsekuensi: user mengubah brand color/font/logo di Settings, kembali ke `/create` untuk generate
atau preview template baru → data yang dipakai masih versi lama dari waktu login.

## 2. Root Cause

`docs/render-template-logic.md`, section **Fetch Strategy**:

```
Saat user login:
  → fetch company_profile sekali
  → simpan di global state (React Context / Zustand)
  → tidak perlu fetch ulang selama session aktif
```

Bahkan diperkuat di section "Aturan Yang Tidak Boleh Dilanggar" (*"Jangan fetch `company_profile`
ulang setiap render"*). Caching ini terlalu agresif untuk data yang bisa diubah user kapan saja.

## 3. Keputusan (Product Decision — final)

- Content yang sudah ter-generate dengan brand lama **dibiarkan apa adanya** — tidak ada retroactive
  update ke project yang sudah ada.
- Brand terbaru **wajib applicable** di: **(a)** preview template di gallery/modal, **(b)** saat user
  memulai flow generate baru / reuse template.
- Solusi: `company_profile` di-fetch **fresh setiap kali `/create` di-mount**.
- Step 1–4 di `/create` adalah **satu page mount** (bukan route terpisah per step — Tech Doc §12),
  jadi fetch cukup **sekali di awal mount**, dipakai konsisten sampai Step 4 selesai.

## 4. Scope Kerjaan

1. Trigger `refreshProfile()` (`src/lib/auth.tsx`) saat komponen `/create` pertama kali mount.
2. Hasilnya **menimpa global store yang sama** (`AuthContext`) — bukan state terpisah yang scoped ke
   create-flow. Ini sekaligus membuat Settings/Dashboard ikut segar.
3. Pastikan Step 1–4 membaca dari satu sumber data yang sama (`useAuth()`), bukan snapshot lama.
4. **Tambahkan in-flight guard di `refreshProfile()`** — kalau sudah ada request berjalan, jangan
   trigger request kedua; kembalikan promise yang sama. Ini mencegah double-fetch dari StrictMode
   double-invoke di dev, dan dari bootstrap `AuthProvider` yang mungkin berjalan bersamaan.
5. **Fail-soft** — lihat §5.
6. Update `docs/render-template-logic.md` section **Fetch Strategy** dan **Aturan Yang Tidak Boleh
   Dilanggar** (lihat §7).

## 5. Behavior Saat Fetch Gagal (WAJIB — jangan improvisasi)

Kalau `refreshProfile()` di `/create` gagal (offline, 500, timeout):

- **Fail soft.** Pertahankan nilai company_profile yang ada di store (versi cache dari login).
- **JANGAN** memblokir wizard, **JANGAN** menampilkan error page, **JANGAN** melempar ke error
  boundary. Brand basi jauh lebih baik daripada user tidak bisa generate sama sekali.
- Log error saja. Toast opsional dan non-blocking — kalau ragu, jangan pakai toast.
- Kasus khusus: kalau store **belum punya** profil sama sekali (mis. user langsung landing ke
  `/create`) dan fetch gagal → biarkan perilaku existing menangani (`PROFILE_NOT_FOUND` /
  redirect onboarding). Jangan menambah jalur error baru.

**Perilaku transisi yang disengaja:** selama fetch in-flight, store masih memegang nilai lama, jadi
preview template dapat sesaat menampilkan brand lama sebelum ter-swap ke brand baru. Untuk MVP ini
**diterima** — jangan menambahkan skeleton/blocking loader untuk menutupinya.

## 6. Non-Goals (Eksplisit — jangan dikerjakan)

- ❌ **Tombol "Refresh brand" manual di editor** — tidak perlu, default-nya sudah live-fetch.
- ❌ **Resolve logic template** (`resolveTemplateLayout` / `TemplateRenderer.tsx` /
  `TemplateFabricCanvas.tsx`) — pending keputusan terpisah (Point 8). JANGAN direfactor.
- ❌ **Caching strategy untuk data lain** (template list, dsb) — scope ini hanya `company_profile`.
- ❌ **Edge case: user mengubah brand di tab lain SAAT sedang mengisi wizard** (window mount → klik
  Generate). Window kecil, effort tidak sepadan. Sengaja di-skip untuk MVP.
- ❌ **Assembly `final_config` di backend** — concern terpisah, bersinggungan dengan Point 8.
- ❌ **Fix bug `updateProfile()` / tri-state `logo_url`** — **sudah dipindah ke Handoff 0 §4.3b.**
  Kalau ternyata belum beres, itu Handoff 0 yang belum selesai. Jangan dikerjakan di sini.
- ❌ **Skeleton / blocking loader** selama fetch in-flight (lihat §5).

## 7. Perubahan Dokumen

`docs/render-template-logic.md`:

- Section **Fetch Strategy** — ganti "Saat user login → fetch company_profile sekali" menjadi
  "Saat halaman `/create` di-mount → fetch `company_profile` sekali (via `refreshProfile()`)".
  Hapus klaim "tidak perlu fetch ulang selama session aktif" khusus untuk `company_profile`.
- Section **Aturan Yang Tidak Boleh Dilanggar** — hapus/revisi baris
  *"❌ Jangan fetch `company_profile` ulang setiap render — ambil dari global state"*. Aturan ini
  sekarang **salah** dan akan menyesatkan kontributor berikutnya. Ganti dengan aturan yang benar:
  ambil dari global store, tapi store di-refresh saat `/create` mount.

> ⛔ **HANYA dua section itu.** Section lain di `render-template-logic.md` (Urutan Merge, Fase Render,
> zones/anchors) **masih disegel** menunggu Point 8 — jangan dirapikan, jangan diperbarui, walaupun
> jelas-jelas sudah usang. Itu scope handoff lain.

## 8. Acceptance Criteria

- [ ] Mount `/create` memicu **tepat satu** panggilan `refreshProfile()`. (Ukur pemanggilan
      `refreshProfile` / `companyProfileApi.get`, **bukan** total network call — `AuthProvider`
      bootstrap boleh saja punya fetch-nya sendiri; in-flight guard §4.4 yang mencegah duplikasi.)
- [ ] Berpindah Step 1→2→3→4 dalam satu mount **tidak** memicu fetch tambahan.
- [ ] Ubah brand color di Settings → kembali ke `/create` (mount baru) → preview template
      menampilkan brand baru, **tanpa** logout/login.
- [ ] Data yang di-refresh di `/create` konsisten terlihat di Settings & Dashboard (satu store,
      tidak ada state ganda).
- [ ] **Ganti logo di Settings → `/create` menampilkan logo baru**, termasuk `?v=` yang baru, utuh
      sampai ke `TemplateRenderer` **dan** `canvas-spec`.
- [ ] **Hapus logo di Settings → `/create` tidak lagi menampilkan logo** (slot hidden, tanpa reflow).
- [ ] Fetch gagal (mock network error) → wizard **tetap dapat digunakan** dengan nilai cache;
      tidak ada error page / crash.
- [ ] `docs/render-template-logic.md` diperbarui sesuai §7 — dan **hanya** section yang disebut di §7.

## 9. TDD Requirements (AGENTS.md §3 — failing test dulu)

- [ ] Mount `/create` → assert `refreshProfile` / `companyProfileApi.get` dipanggil **tepat 1 kali**.
- [ ] Dua pemanggilan `refreshProfile()` bersamaan → assert hanya **1** request keluar (in-flight guard).
- [ ] Mock profil berubah → mount ulang `/create` → assert komponen memakai versi baru, bukan versi
      lama dari store.
- [ ] Pindah step 1→2→3→4 dalam satu mount → assert **tidak ada** fetch tambahan.
- [ ] Store ter-update → assert komponen lain yang subscribe ke store yang sama menerima data terbaru.
- [ ] `logo_url` berubah (`?v=` baru dari Handoff 0) → mount ulang `/create` → assert query string
      **utuh** sampai ke `TemplateRenderer` dan `canvas-spec`. `logo_url` satu-satunya field brand
      yang lewat CDN dengan query — paling mungkin regresi diam-diam kalau query ter-strip di titik
      merge mana pun, berbeda dari `brand_colors`/`brand_font` yang cuma scalar DB biasa.
- [ ] `logo_url` berubah menjadi `null` → mount ulang `/create` → assert slot logo hidden di kedua
      renderer.
- [ ] `refreshProfile()` reject (mock error) → assert store **tetap** memegang nilai lama, komponen
      `/create` tetap render normal, tidak ada throw.

## 10. File yang Kemungkinan Tersentuh

- `frontend/src/app/create/page.tsx` — trigger fetch di mount
- `frontend/src/lib/auth.tsx` — `AuthContext` / `refreshProfile()` + in-flight guard
- `frontend/src/api/companyProfileApi.ts` — kemungkinan tidak berubah, hanya dipanggil di titik baru
- `docs/render-template-logic.md` — **hanya** section Fetch Strategy + Aturan Yang Tidak Boleh Dilanggar

## 11. Catatan untuk Claude Code

Baca `AGENTS.md` penuh (§3 TDD, §8 konvensi penamaan) sebelum mulai.

Struktur store sudah terverifikasi: `AuthContext` di `frontend/src/lib/auth.tsx`, dibaca lewat
`useAuth()` di `/create`, Settings, dan Dashboard, dengan `refreshProfile()` sebagai satu-satunya
titik re-fetch + merge. Pakai fungsi itu langsung — tidak perlu konfirmasi ulang bentuk store, dan
**jangan** membuat store/context baru.

Jangan berasumsi apa pun soal resolve logic template — itu di luar scope ini.