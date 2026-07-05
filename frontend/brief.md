# Instruksi: Komponen Halaman "Isi Brief"

Buat komponen halaman "Isi Brief" berdasarkan desain berikut. Sesuaikan dengan stack, convention, dan struktur folder yang sudah ada di codebase.

---

## Layout

- Split 60/40 — kiri template preview, kanan form
- Tidak ada scroll di form panel — semua konten muat dalam satu layar
- Sticky footer di form panel berisi progress indicator + tombol Generate

---

## Kiri — Template Preview (60%)

- Header kecil: nama template, subtitle (industri · tipe · platform), tombol "Ganti template"
- Preview area: tampilkan template yang dipilih user (static, tidak interaktif)
- Lock badges di bawah preview: "Layout", "Background", "Color scheme" — masing-masing dengan icon gembok

---

## Kanan — Form Panel (40%)

Tiga section dipisah divider:

### 1. Brief konten (wajib)

- Field: Produk / Layanan (wajib), Pesan utama (wajib), Detail promo (opsional)
- Semua input type text

### 2. Gaya bahasa (wajib)

- Custom dropdown — bukan native `<select>`
- Tiap option tampilkan: label + deskripsi
- Setelah pilih, trigger menampilkan label + deskripsi pilihan aktif
- Click outside menutup dropdown
- Options:

| Value | Label | Deskripsi |
|---|---|---|
| `formal` | Formal | Kalimat lengkap, profesional, tidak ada singkatan |
| `casual` | Casual | Sapaan akrab, kalimat pendek, pakai "kamu" |
| `persuasive` | Persuasive | Social proof, angka konkret, urgensi tinggi |
| `fun_playful` | Fun & playful | Wordplay, emoji, tone ringan dan menghibur |
| `inspiratif` | Inspiratif | Quote-driven, emosional, motivatif |

### 3. Sumber gambar (opsional)

- 3-column card grid
- Single select
- Options:

| Value | Label | Icon |
|---|---|---|
| `upload` | Upload gambar | upload |
| `ai_generate` | AI generate | wand |
| `no_image` | Tanpa gambar | ban |

---

## Footer Form

- Kiri: progress dots + teks "X dari Y field wajib terisi"
- Kanan: tombol Generate

---

## Referensi Visual Dropdown

```html
<div class="dropdown-wrap">
  <div class="dropdown-trigger">
    <div>
      <span class="name">Persuasive</span>
      <span class="desc">Social proof, angka konkret, urgensi tinggi</span>
    </div>
    <icon chevron-down />
  </div>
  <div class="dropdown-list">
    <div class="dropdown-option selected">
      <div>
        <span class="name">Persuasive</span>
        <span class="desc">Social proof, angka konkret, urgensi tinggi</span>
      </div>
      <icon check />
    </div>
    <!-- repeat per option -->
  </div>
</div>
```

---

## Komponen Reusable: Dropdown

Buat dropdown sebagai komponen tersendiri dengan props:

```ts
interface DropdownOption {
  value: string
  label: string
  description: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
}
```

---

## Yang Tidak Perlu Dibuat

- Topbar stepper — sudah ada
- Logic generate — sambungkan ke handler yang sudah ada
