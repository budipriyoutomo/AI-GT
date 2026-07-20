import { describe, it, expect } from "vitest";
import { buildFooterContact, EMPTY_CONTACT } from "../footer-contact";

describe("buildFooterContact", () => {
  it("memetakan address ke slot location", () => {
    const out = buildFooterContact({ contact: null, address: "Jl. Merdeka No. 12" });
    expect(out?.location).toBe("Jl. Merdeka No. 12");
  });

  it("mempertahankan field contact lain apa adanya", () => {
    const out = buildFooterContact({
      contact: { ...EMPTY_CONTACT, instagram: "@toko", whatsapp: "0812" },
      address: "Jl. Braga",
    });
    expect(out?.instagram).toBe("@toko");
    expect(out?.whatsapp).toBe("0812");
    expect(out?.location).toBe("Jl. Braga");
  });

  it("null bila profil tak punya contact maupun address", () => {
    expect(buildFooterContact({ contact: null, address: null })).toBeNull();
    expect(buildFooterContact(null)).toBeNull();
  });

  it("address kosong tidak menimpa location jadi string kosong", () => {
    const out = buildFooterContact({ contact: { ...EMPTY_CONTACT, instagram: "@toko" }, address: "" });
    expect(out?.location).toBeUndefined();
  });
});
