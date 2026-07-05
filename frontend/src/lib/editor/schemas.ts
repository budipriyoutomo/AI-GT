import { z } from "zod";

export const copyResultSchema = z.object({
  copy: z.object({
    headline: z.string(),
    body: z.string(),
    cta: z.string(),
  }),
  typography: z.object({
    headline_font: z.string(),
    headline_size: z.number(),
    body_font: z.string(),
    body_size: z.number(),
    letter_spacing: z.number(),
  }),
  image_prompt: z.string(),
  image_source: z.enum(["none", "thematic", "upload"]),
  thematic_image_url: z.string().nullable(),
});

export const templateConfigSchema = z
  .object({
    color_scheme: z
      .record(z.string(), z.string())
      .refine((s) => "accent" in s && "primary" in s && "secondary" in s, {
        message: "color_scheme must contain accent, primary, and secondary",
      }),
    elements: z.array(z.unknown()),
  })
  .passthrough();
