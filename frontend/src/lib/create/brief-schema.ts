import { z } from "zod";

export const contentBriefSchema = z.object({
  product: z.string().trim().min(1, "Produk / Layanan wajib diisi"),
  mainMessage: z.string().trim().min(1, "Pesan Utama wajib diisi"),
  promoDetail: z.string().optional(),
  additionalNotes: z.string().optional(),
  languageStyle: z.enum(["formal", "casual", "persuasive", "fun_playful", "inspiratif"], { error: "Pilih gaya bahasa" }),
  imageSource: z.enum(["upload", "generated", "none"]).nullable().optional(),
});

export type ContentBriefInput = z.infer<typeof contentBriefSchema>;
