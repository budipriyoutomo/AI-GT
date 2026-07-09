import { describe, it, expect } from "vitest";
import { blockHeight, charCapacity, fitFontSize, type MeasureBlock } from "../fit-text";

/**
 * Pengukur palsu. Di produksi peran ini dipegang Fabric — SATU-SATUNYA sumber
 * kebenaran soal di mana teks membungkus.
 */
const measurerFor = (maxWidth: number): MeasureBlock => (text, fontSize) => {
  const width = text.length * fontSize * 0.5;
  return { width, lines: Math.max(1, Math.ceil(width / maxWidth)) };
};

describe("blockHeight", () => {
  it("baris × fontSize × lineHeight (model CSS, bukan tinggi internal Fabric)", () => {
    expect(blockHeight(2, 10, 1.1)).toBeCloseTo(22);
    expect(blockHeight(1, 20, 1.2)).toBeCloseTo(24);
  });
});

describe("fitFontSize", () => {
  const base = { lineHeight: 1.1, minRatio: 0.5 };
  const COL = 993.6; // kolom headline astari

  // Pengukur "ketat" (0.55em) — meniru Fabric yang membungkus "Pipa Anti Bocor?" jadi 2 baris @118px
  const tight: MeasureBlock = (t, fs) => {
    const width = t.length * fs * 0.55;
    return { width, lines: width > COL ? 2 : 1 };
  };

  it("teks yang sudah muat → ukuran template tidak diubah", () => {
    expect(fitFontSize({ ...base, text: "Halo", fontSize: 40, maxWidth: 500, maxHeight: 200 }, measurerFor(500))).toBe(40);
  });

  it("tidak pernah memperbesar walau ruang berlebih", () => {
    expect(fitFontSize({ ...base, text: "Halo", fontSize: 40, maxWidth: 500, maxHeight: 5000 }, measurerFor(500))).toBe(40);
  });

  it("jumlah baris datang dari pengukur, bukan dari model sendiri", () => {
    // Regresi bug nyata: model lama menghitung 1 baris (0.5em) lalu tidak menyusut,
    // sementara Fabric menggambar 2 baris dan menabrak body.
    const text = "Pipa Anti Bocor?";
    const longgar = measurerFor(COL);
    expect(longgar(text, 118).lines).toBe(1);
    expect(tight(text, 118).lines).toBe(2);

    // pengukur longgar → tak menyusut; pengukur ketat (= Fabric) → menyusut
    expect(fitFontSize({ ...base, text, fontSize: 118, maxWidth: COL, maxHeight: 148.5 }, longgar)).toBe(118);
    expect(fitFontSize({ ...base, text, fontSize: 118, maxWidth: COL, maxHeight: 148.5 }, tight)).toBeLessThan(118);
  });

  it("penyusutan minimal: ukuran terbesar yang muat, bukan langsung ke lantai", () => {
    // 1 baris selama width ≤ 993.6 → fontSize maksimum = floor(993.6/(16×0.55)) = 112
    const fitted = fitFontSize({ ...base, text: "Pipa Anti Bocor?", fontSize: 118, maxWidth: COL, maxHeight: 148.5 }, tight);
    expect(fitted).toBe(112);
    const { width, lines } = tight("Pipa Anti Bocor?", fitted);
    expect(width).toBeLessThanOrEqual(COL);
    expect(blockHeight(lines, fitted, 1.1)).toBeLessThanOrEqual(148.5);
  });

  it("lebar melebihi kolom (kata tunggal) → tetap mengecil", () => {
    const m: MeasureBlock = (t, fs) => ({ width: t.length * fs * 0.5, lines: 1 });
    const fitted = fitFontSize({ ...base, text: "supercalifragilistic", fontSize: 40, maxWidth: 300, maxHeight: 9999 }, m);
    expect(fitted).toBe(30);
    expect(m("supercalifragilistic", fitted).width).toBeLessThanOrEqual(300);
  });

  it("berhenti di lantai minRatio walau masih belum muat", () => {
    expect(fitFontSize({ ...base, text: "x".repeat(500), fontSize: 100, maxWidth: 100, maxHeight: 10 }, measurerFor(100))).toBe(50);
  });

  it("budget nol/negatif → langsung lantai minRatio", () => {
    expect(fitFontSize({ ...base, text: "Halo", fontSize: 80, maxWidth: 500, maxHeight: 0 }, measurerFor(500))).toBe(40);
  });

  it("hasil selalu bilangan bulat", () => {
    const size = fitFontSize({ ...base, text: "abc def ghi jkl", fontSize: 77, maxWidth: 500, maxHeight: 100 }, measurerFor(500));
    expect(Number.isInteger(size)).toBe(true);
  });
});

describe("charCapacity", () => {
  // Mirror dari _char_capacity di backend/app/services/providers/copy_prompt.py
  it("astari headline: 993.6px @118px, budget 1 baris → 14", () => {
    expect(charCapacity({ width: 0.92 * 1080, fontSize: 118, lineHeight: 1.1, top: 0.19 * 1350, fitBottom: 0.30 * 1350 })).toBe(14);
  });

  it("astari body: 864px @36px, budget 2 baris → 86", () => {
    expect(charCapacity({ width: 0.80 * 1080, fontSize: 36, lineHeight: 1.3, top: 0.30 * 1350, fitBottom: 0.40 * 1350 })).toBe(86);
  });

  it("tanpa fitBottom (anak group) → null", () => {
    expect(charCapacity({ width: 500, fontSize: 40, lineHeight: 1.1, top: 100 })).toBeNull();
  });

  it("selalu memberi minimal satu baris walau budget mepet", () => {
    expect(charCapacity({ width: 400, fontSize: 100, lineHeight: 1.1, top: 0, fitBottom: 10 })).toBe(7);
  });
});
