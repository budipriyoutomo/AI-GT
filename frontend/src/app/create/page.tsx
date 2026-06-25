"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PosterThumb } from "@/components/poster-thumb";
import { toast } from "@/components/ui/toast";
import { generateApi } from "@/api/generateApi";
import { templatesApi } from "@/api/templatesApi";
import type { Template } from "@/types/template";

const LOCKED_ELEMENTS = [
  { label: "Layout & komposisi", icon: "layout-grid" },
  { label: "Background",         icon: "image"       },
  { label: "Color scheme",       icon: "palette"     },
];

const IMAGE_SOURCES = [
  { id: "upload",     label: "Upload Image",      icon: "upload",    desc: "Gunakan foto atau aset brand milikmu sendiri"           },
  { id: "suggestion", label: "Image Suggestion",  icon: "sparkles",  desc: "AI pilihkan gambar yang relevan dengan kontenmu"        },
  { id: "none",       label: "Tanpa Gambar",       icon: "ban",       desc: "Hanya copy dan typography, tanpa elemen visual tambahan" },
] as const;

type ImageSource = typeof IMAGE_SOURCES[number]["id"];

const GAYA_BAHASA = [
  { id: "formal",      label: "Formal",        icon: "briefcase",   desc: "Kalimat lengkap, profesional, tidak ada singkatan"         },
  { id: "casual",      label: "Casual",        icon: "smile",       desc: "Sapaan akrab, kalimat pendek, pakai \"kamu\""              },
  { id: "persuasive",  label: "Persuasive",    icon: "trending-up", desc: "Social proof, angka konkret, urgensi tinggi"               },
  { id: "fun",         label: "Fun & Playful", icon: "zap",         desc: "Wordplay, emoji, tone ringan dan menghibur"                },
  { id: "inspiratif",  label: "Inspiratif",    icon: "star",        desc: "Quote-driven, emosional, motivatif"                        },
];

const LANG_TO_PREFERENCE: Record<string, string> = {
  Indonesia: "id",
  English: "en",
  Campur: "id",
};

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");

  const [template, setTemplate] = useState<Template | null>(null);
  const [content, setContent]   = useState("");
  const [imageSrc, setImageSrc] = useState<ImageSource>("none");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageSuggestions,   setImageSuggestions]   = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedPrompt,     setSelectedPrompt]     = useState<string | null>(null);
  const [gaya, setGaya]         = useState<string | null>(null);
  const [lang, setLang]         = useState("Indonesia");
  const [targetAudiens, setTargetAudiens] = useState("Anak muda (18–25)");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (templateId) {
      templatesApi.get(templateId).then(setTemplate).catch(() => {});
    }
  }, [templateId]);

  const selectedGaya    = GAYA_BAHASA.find((g) => g.id === gaya);
  const selectedImgSrc  = IMAGE_SOURCES.find((s) => s.id === imageSrc);
  const canGenerate     = gaya !== null && !!templateId &&
    (imageSrc !== "suggestion" || selectedPrompt !== null);

  async function handleGenerate() {
    if (!canGenerate || !templateId) return;
    setGenerating(true);
    try {
      const session = await generateApi.createSession({
        template_id: templateId,
        language_style: gaya!,
        campaign_data: {
          content_brief: content || undefined,
          image_source: imageSrc,
          image_prompt: selectedPrompt || undefined,
          target_audience: targetAudiens,
          language_preference: LANG_TO_PREFERENCE[lang] ?? "id",
        },
      });
      router.push(`/generate?sessionId=${session.id}`);
    } catch (err) {
      toast({
        title: "Gagal memulai generate",
        desc: err instanceof Error ? err.message : "Coba lagi",
        variant: "error",
      });
      setGenerating(false);
    }
  }

  return (
    <Shell
      active="templates"
      title="Konfigurasi Generate"
      actions={
        <Link href="/templates">
          <Button size="sm" variant="outline" icon="arrow-left">Galeri Template</Button>
        </Link>
      }
    >
      <PageHead
        title="Konfigurasi konten"
        subtitle="Template sudah dipilih. Isi brief konten, pilih sumber gambar, dan atur gaya bahasa sebelum generate."
      />

      {/* Breadcrumb stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: "var(--text-xs)" }}>
        {[
          { num: 1, label: "Template dipilih", done: true  },
          { num: 2, label: "Konfigurasi",      done: false, active: true },
          { num: 3, label: "Generate",         done: false },
        ].map((s, i, arr) => (
          <span key={s.num} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                background: s.done ? "var(--success)" : s.active ? "var(--primary)" : "var(--muted)",
                color: s.done || s.active ? "#fff" : "var(--muted-foreground)",
              }}>
                {s.done ? <Icon name="check" size={11} /> : s.num}
              </span>
              <span style={{ fontWeight: s.active ? 600 : 400, color: s.active ? "var(--foreground)" : s.done ? "var(--foreground)" : "var(--muted-foreground)" }}>
                {s.label}
              </span>
            </span>
            {i < arr.length - 1 && <Icon name="chevron-right" size={13} style={{ color: "var(--muted-foreground)" }} />}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Left: template preview + integrity ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <Card variant="elevated" padding={16}>
            <div className="aigt-label" style={{ marginBottom: 10 }}>Template dipilih</div>
            {template?.thumbnail_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={template.thumbnail_url}
                alt={template.name}
                style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: "var(--radius-md)" }}
              />
            ) : (
              <PosterThumb
                title={template?.name ?? (templateId ? "Memuat…" : "Template")}
                kicker={template?.theme ?? template?.industry ?? ""}
                cta={null}
                accent="--chart-1"
                ratio="4 / 5"
              />
            )}
            <div style={{ marginTop: 12 }}>
              <div className="aigt-h6">{template?.name ?? (templateId ? "Memuat template…" : "Pilih template dulu")}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                {template?.content_type && <Badge variant="secondary">{template.content_type}</Badge>}
                {template?.industry && <Badge variant="secondary">{template.industry}</Badge>}
                {template?.theme && <Badge variant="info">{template.theme}</Badge>}
              </div>
            </div>

            {/* Template integrity box */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Icon name="lock" size={13} style={{ color: "var(--muted-foreground)" }} />
                <span className="aigt-label">Elemen terkunci</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {LOCKED_ELEMENTS.map((el) => (
                  <div key={el.label} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
                    padding: "6px 10px",
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                  }}>
                    <Icon name={el.icon as "image"} size={12} style={{ flex: "none" }} />
                    <span style={{ flex: 1 }}>{el.label}</span>
                    <Icon name="lock" size={11} style={{ opacity: 0.45 }} />
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 10, padding: "8px 10px",
                background: "color-mix(in oklch, var(--info) 8%, var(--card))",
                border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)",
                borderRadius: "var(--radius-md)",
                fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.55,
              }}>
                AI hanya generate <strong style={{ color: "var(--foreground)" }}>copy</strong>,{" "}
                <strong style={{ color: "var(--foreground)" }}>typography</strong>, dan{" "}
                <strong style={{ color: "var(--foreground)" }}>thematic image</strong>.
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right: configuration ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Section A: Konten */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <span style={{
                width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0,
                background: "var(--tint-primary)", color: "var(--primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="file-text" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aigt-h5">Konten</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>
                  Jelaskan produk, promo, atau pesan utama yang ingin kamu sampaikan. AI akan gunakan ini sebagai dasar generate copy.
                </div>
              </div>
              <Badge variant="secondary" style={{ flexShrink: 0 }}>Opsional</Badge>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contoh: Promo diskon 50% untuk semua menu minuman setiap hari Senin–Rabu, berlaku hingga akhir bulan. Target pelanggan setia yang sering order via online."
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 12px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface-sunken)",
                color: "var(--foreground)",
                fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
                lineHeight: 1.6, resize: "vertical", outline: "none",
                transition: "border-color .15s ease, box-shadow .15s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--ring)";
                e.target.style.boxShadow = "0 0 0 3px color-mix(in oklch, var(--ring) 35%, transparent)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted-foreground)", textAlign: "right" }}>
              {content.length} karakter
            </div>
          </Card>

          {/* Section B: Gaya Bahasa */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <span style={{
                width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0,
                background: "var(--tint-primary)", color: "var(--primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="type" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aigt-h5">Gaya Bahasa</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>
                  Menentukan tone copy dan arah typography yang di-generate AI.
                </div>
              </div>
              <Badge variant={gaya ? "success" : "warning"} style={{ flexShrink: 0 }}>
                {gaya ? "Dipilih" : "Wajib"}
              </Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GAYA_BAHASA.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGaya(g.id)}
                  style={{
                    padding: "12px 14px", borderRadius: "var(--radius-lg)",
                    border: `1px solid ${gaya === g.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: gaya === g.id ? "var(--tint-primary)" : "var(--card)",
                    cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 12,
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: "var(--radius-md)", flexShrink: 0,
                    background: gaya === g.id
                      ? "color-mix(in oklch, var(--primary) 15%, transparent)"
                      : "var(--surface-sunken)",
                    border: `1px solid ${gaya === g.id ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`,
                    color: gaya === g.id ? "var(--primary)" : "var(--muted-foreground)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={g.icon as "star"} size={15} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "var(--text-sm)", fontWeight: gaya === g.id ? 600 : 500,
                      color: gaya === g.id ? "var(--primary)" : "var(--foreground)",
                    }}>
                      {g.label}
                    </div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>{g.desc}</div>
                  </div>
                  {gaya === g.id && (
                    <Icon name="check-circle-2" size={17} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Section C: Preferensi Konten */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <span style={{
                width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0,
                background: "var(--tint-primary)", color: "var(--primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="sliders-horizontal" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aigt-h5">Preferensi Konten</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>
                  Bahasa, audiens, dan platform yang akan digunakan AI saat generate.
                </div>
              </div>
              <Badge variant="secondary" style={{ flexShrink: 0 }}>Opsional</Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 8, display: "block" }}>Bahasa konten</label>
                <div style={{ display: "inline-flex", gap: 3, padding: 3, background: "var(--surface-sunken)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                  {["Indonesia", "English", "Campur"].map((l) => (
                    <button
                      key={l} type="button"
                      onClick={() => setLang(l)}
                      style={{
                        padding: "7px 14px", border: "none", cursor: "pointer",
                        fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", fontWeight: 500,
                        background: lang === l ? "var(--card)" : "transparent",
                        color: lang === l ? "var(--foreground)" : "var(--muted-foreground)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: lang === l ? "var(--shadow-xs)" : undefined,
                        transition: "all .15s ease",
                      }}
                    >{l}</button>
                  ))}
                </div>
              </div>

              <Select
                label="Target audiens"
                value={targetAudiens}
                onChange={(e) => setTargetAudiens(e.target.value)}
                options={["Anak muda (18–25)", "Keluarga", "Profesional (25–40)", "Umum"]}
              />

              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 8, display: "block" }}>Platform default</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                  <Switch label="Instagram" defaultChecked />
                  <Switch label="WhatsApp Story" defaultChecked />
                  <Switch label="TikTok" />
                  <Switch label="Facebook" />
                </div>
              </div>
            </div>
          </Card>

          {/* Section D: Sumber Gambar */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <span style={{
                width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0,
                background: "var(--tint-primary)", color: "var(--primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="image" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aigt-h5">Sumber Gambar</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>
                  Pilih bagaimana elemen visual akan ditambahkan ke kontenmu.
                </div>
              </div>
              <Badge variant="secondary" style={{ flexShrink: 0 }}>Opsional</Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {IMAGE_SOURCES.map((src) => (
                <button
                  key={src.id}
                  onClick={() => {
                    setImageSrc(src.id);
                    setUploadedFile(null);
                    setImageSuggestions([]);
                    setSelectedPrompt(null);
                  }}
                  style={{
                    padding: "12px 14px", borderRadius: "var(--radius-lg)",
                    border: `1px solid ${imageSrc === src.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: imageSrc === src.id ? "var(--tint-primary)" : "var(--card)",
                    cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 12,
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: "var(--radius-md)", flexShrink: 0,
                    background: imageSrc === src.id
                      ? "color-mix(in oklch, var(--primary) 15%, transparent)"
                      : "var(--surface-sunken)",
                    border: `1px solid ${imageSrc === src.id ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`,
                    color: imageSrc === src.id ? "var(--primary)" : "var(--muted-foreground)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={src.icon as "upload"} size={15} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "var(--text-sm)", fontWeight: imageSrc === src.id ? 600 : 500,
                      color: imageSrc === src.id ? "var(--primary)" : "var(--foreground)",
                    }}>
                      {src.label}
                    </div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>{src.desc}</div>
                  </div>
                  {imageSrc === src.id && (
                    <Icon name="check-circle-2" size={17} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>

            {/* Upload zone — hanya muncul jika pilih "upload" */}
            {imageSrc === "upload" && (
              <div style={{ marginTop: 12 }}>
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "24px 16px", cursor: "pointer",
                  border: `2px dashed ${uploadedFile ? "var(--success)" : "color-mix(in oklch, var(--primary) 35%, transparent)"}`,
                  borderRadius: "var(--radius-lg)",
                  background: uploadedFile
                    ? "color-mix(in oklch, var(--success) 6%, var(--card))"
                    : "color-mix(in oklch, var(--primary) 4%, var(--card))",
                  transition: "all .15s ease",
                }}>
                  <Icon
                    name={uploadedFile ? "check-circle-2" : "upload-cloud"}
                    size={24}
                    style={{ color: uploadedFile ? "var(--success)" : "var(--primary)" }}
                  />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: uploadedFile ? "var(--success)" : "var(--foreground)" }}>
                      {uploadedFile ? uploadedFile.name : "Klik untuk upload gambar"}
                    </div>
                    {!uploadedFile && (
                      <div className="aigt-caption" style={{ marginTop: 3 }}>PNG, JPG, WEBP — maks. 5 MB</div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {uploadedFile && (
                  <button
                    onClick={() => setUploadedFile(null)}
                    style={{
                      marginTop: 8, background: "none", border: "none", cursor: "pointer",
                      fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <Icon name="x" size={12} /> Hapus gambar
                  </button>
                )}
              </div>
            )}

            {/* Image Suggestion prompts — muncul hanya jika pilih "suggestion" */}
            {imageSrc === "suggestion" && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="aigt-label">Saran prompt gambar</span>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={loadingSuggestions ? "loader-2" : "sparkles"}
                    disabled={!content.trim() || loadingSuggestions}
                    onClick={async () => {
                      setLoadingSuggestions(true);
                      setSelectedPrompt(null);
                      try {
                        const result = await generateApi.getImageSuggestions({
                          content_brief: content,
                          template_theme: template?.theme,
                          industry: template?.industry,
                          target_audience: targetAudiens,
                          language_preference: LANG_TO_PREFERENCE[lang] ?? "id",
                        });
                        setImageSuggestions(result.suggestions);
                      } catch {
                        toast({ title: "Gagal membuat saran prompt", variant: "error" });
                      } finally {
                        setLoadingSuggestions(false);
                      }
                    }}
                  >
                    {loadingSuggestions ? "Membuat saran…" : imageSuggestions.length ? "Buat Ulang" : "Buat Saran"}
                  </Button>
                </div>

                {!content.trim() && (
                  <div style={{
                    padding: "12px 14px", borderRadius: "var(--radius-lg)",
                    border: "1px dashed var(--border)",
                    background: "var(--surface-sunken)",
                    fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <Icon name="info" size={13} style={{ flexShrink: 0 }} />
                    Isi brief konten di atas dulu agar saran prompt bisa dibuat.
                  </div>
                )}

                {imageSuggestions.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {imageSuggestions.map((prompt, i) => {
                      const isSelected = selectedPrompt === prompt;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedPrompt(isSelected ? null : prompt)}
                          style={{
                            padding: "11px 14px", borderRadius: "var(--radius-lg)", textAlign: "left",
                            border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                            background: isSelected ? "var(--tint-primary)" : "var(--card)",
                            cursor: "pointer", fontFamily: "var(--font-sans)",
                            display: "flex", alignItems: "flex-start", gap: 10,
                            transition: "all .15s ease",
                          }}
                        >
                          <span style={{
                            width: 20, height: 20, borderRadius: 999, flexShrink: 0, marginTop: 1,
                            background: isSelected ? "var(--primary)" : "var(--surface-sunken)",
                            border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {isSelected && <Icon name="check" size={11} style={{ color: "#fff" }} />}
                            {!isSelected && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                                {i + 1}
                              </span>
                            )}
                          </span>
                          <span style={{
                            flex: 1, fontSize: "var(--text-xs)", lineHeight: 1.55,
                            color: isSelected ? "var(--primary)" : "var(--foreground)",
                            fontWeight: isSelected ? 600 : 400,
                          }}>
                            {prompt}
                          </span>
                          {isSelected && (
                            <Icon name="check-circle-2" size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
                          )}
                        </button>
                      );
                    })}
                    {!selectedPrompt && (
                      <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>
                        Pilih salah satu prompt untuk melanjutkan.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ── Generate CTA bar ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 18px",
            background: "var(--card)",
            border: `1px solid ${canGenerate ? "color-mix(in oklch, var(--primary) 30%, transparent)" : "var(--border)"}`,
            borderRadius: "var(--radius-xl)",
            position: "sticky", bottom: 16,
            boxShadow: canGenerate ? "0 4px 24px color-mix(in oklch, var(--primary) 12%, transparent)" : "var(--shadow-sm)",
            transition: "all .2s ease",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {canGenerate ? (
                <>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="check-circle-2" size={15} style={{ color: "var(--success)" }} />
                    Siap generate
                  </div>
                  <div className="aigt-caption" style={{ marginTop: 3 }}>
                    <span style={{ color: "var(--primary)", fontWeight: 500 }}>{selectedGaya?.label}</span>
                    {" · "}
                    <span>{selectedImgSrc?.label ?? "Tanpa gambar"}</span>
                    {content && <> · <span style={{ fontStyle: "italic" }}>Brief diisi</span></>}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                  {imageSrc === "suggestion" && !selectedPrompt && gaya
                    ? "Pilih satu prompt gambar untuk melanjutkan"
                    : "Pilih gaya bahasa untuk melanjutkan"}
                </div>
              )}
            </div>
            <Button
              icon="sparkles"
              disabled={!canGenerate || generating}
              onClick={handleGenerate}
            >
              {generating ? "Memulai…" : "Generate"}
            </Button>
          </div>

        </div>
      </div>
    </Shell>
  );
}
