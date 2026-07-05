import { describe, it, expect } from "vitest";
import { contentBriefSchema } from "../brief-schema";

describe("contentBriefSchema", () => {
  const valid = {
    product: "Nasi Goreng Spesial",
    mainMessage: "Enak dan terjangkau",
    languageStyle: "formal" as const,
  };

  it("accepts valid required-only input", () => {
    expect(contentBriefSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts valid input with all optional fields", () => {
    const result = contentBriefSchema.safeParse({
      ...valid,
      promoDetail: "Diskon 50%",
      additionalNotes: "Target usia 20-35",
      imageSource: "generated",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty product", () => {
    const result = contentBriefSchema.safeParse({ ...valid, product: "" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only product", () => {
    const result = contentBriefSchema.safeParse({ ...valid, product: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects empty mainMessage", () => {
    const result = contentBriefSchema.safeParse({ ...valid, mainMessage: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing languageStyle", () => {
    const { languageStyle: _, ...without } = valid;
    const result = contentBriefSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejects invalid languageStyle value", () => {
    const result = contentBriefSchema.safeParse({ ...valid, languageStyle: "aggressive" });
    expect(result.success).toBe(false);
  });

  it("accepts null imageSource (optional field)", () => {
    const result = contentBriefSchema.safeParse({ ...valid, imageSource: null });
    expect(result.success).toBe(true);
  });

  it("accepts omitted imageSource", () => {
    const result = contentBriefSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
