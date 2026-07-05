import { describe, it, expect } from "vitest";
import { getBriefCompletion } from "../brief-completion";
import type { ContentBrief } from "@/types/content-brief";

const base: ContentBrief = {
  product: "",
  mainMessage: "",
  languageStyle: null,
  imageSource: null,
};

describe("getBriefCompletion", () => {
  it("returns 0/3 when all required fields empty", () => {
    const result = getBriefCompletion(base);
    expect(result.filled).toBe(0);
    expect(result.total).toBe(3);
    expect(result.isComplete).toBe(false);
    expect(result.nextMissingLabel).toBe("Produk / Layanan");
  });

  it("returns 1/3 when only product filled", () => {
    const result = getBriefCompletion({ ...base, product: "Nasi Goreng Spesial" });
    expect(result.filled).toBe(1);
    expect(result.isComplete).toBe(false);
    expect(result.nextMissingLabel).toBe("Pesan Utama");
  });

  it("returns 2/3 when product and mainMessage filled", () => {
    const result = getBriefCompletion({ ...base, product: "Produk A", mainMessage: "Pesan B" });
    expect(result.filled).toBe(2);
    expect(result.isComplete).toBe(false);
    expect(result.nextMissingLabel).toBe("Gaya bahasa");
  });

  it("returns 3/3 and isComplete when all required fields filled", () => {
    const result = getBriefCompletion({ ...base, product: "Produk A", mainMessage: "Pesan B", languageStyle: "formal" });
    expect(result.filled).toBe(3);
    expect(result.total).toBe(3);
    expect(result.isComplete).toBe(true);
    expect(result.nextMissingLabel).toBeNull();
  });

  it("treats whitespace-only strings as empty", () => {
    const result = getBriefCompletion({ ...base, product: "   ", mainMessage: "\t" });
    expect(result.filled).toBe(0);
    expect(result.nextMissingLabel).toBe("Produk / Layanan");
  });

  it("optional fields (promoDetail, additionalNotes, imageSource) do not count toward total", () => {
    const result = getBriefCompletion({
      ...base,
      product: "X",
      mainMessage: "Y",
      languageStyle: "casual",
      promoDetail: "Diskon 50%",
      additionalNotes: "Catatan penting",
      imageSource: "upload",
    });
    expect(result.total).toBe(3);
    expect(result.filled).toBe(3);
    expect(result.isComplete).toBe(true);
  });

  it("nextMissingLabel follows order: product → mainMessage → languageStyle", () => {
    const step0 = getBriefCompletion(base);
    expect(step0.nextMissingLabel).toBe("Produk / Layanan");

    const step1 = getBriefCompletion({ ...base, product: "P" });
    expect(step1.nextMissingLabel).toBe("Pesan Utama");

    const step2 = getBriefCompletion({ ...base, product: "P", mainMessage: "M" });
    expect(step2.nextMissingLabel).toBe("Gaya bahasa");

    const step3 = getBriefCompletion({ ...base, product: "P", mainMessage: "M", languageStyle: "inspiratif" });
    expect(step3.nextMissingLabel).toBeNull();
  });
});
