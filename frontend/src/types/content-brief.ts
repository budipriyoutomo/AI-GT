export type LanguageStyle = "formal" | "casual" | "persuasive" | "fun_playful" | "inspiratif";
export type ImageSource = "upload" | "generated" | "none";

export interface ContentBrief {
  product: string;
  mainMessage: string;
  promoDetail?: string;
  additionalNotes?: string;
  languageStyle: LanguageStyle | null;
  imageSource: ImageSource | null;
}
