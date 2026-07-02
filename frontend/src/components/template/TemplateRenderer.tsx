"use client";

import { CSSProperties, Fragment, ReactNode } from "react";
import { SocialIcon } from "./SocialIcon";
import { adaptScheme, adaptBackground, adaptScrimGradient } from "@/lib/brandAdapt";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";
import type {
  TemplateConfig,
  TemplateElement,
  ColorScheme,
  TemplateBackground,
  ElementStyle,
  BrandTheme,
} from "@/types/template";

const pct = (n: number) => `${n * 100}%`;

// Map nama font template → CSS variable yang di-load di layout (next/font)
const FONT_STACK: Record<string, string> = {
  Poppins: "var(--font-poppins)",
  Montserrat: "var(--font-montserrat)",
  Inter: "var(--font-inter)",
  Anton: "var(--font-anton)",
  "Archivo Black": "var(--font-archivo-black)",
};
const fontStack = (family?: string) =>
  `${(family && FONT_STACK[family]) || `"${family ?? "Inter"}"`}, var(--font-inter), sans-serif`;

// fontSize ruang 1080px → cqw agar skala ikut lebar container (kartu kecil / canvas besar)
const cqw = (px?: number) => (px != null ? `${((px / 1080) * 100).toFixed(3)}cqw` : undefined);

function resolveColor(scheme: ColorScheme, role?: string): string {
  if (!role) return "inherit";
  if (role.startsWith("#")) return role;
  return scheme[role] ?? role;
}

// "4:5" → "4 / 5" (CSS aspect-ratio). `override` dipakai galeri agar semua box seragam;
// tanpa override → aspect asli template (dipakai di preview modal).
function aspectRatio(cfg: TemplateConfig, override?: string): string {
  const a = override ?? cfg.canvas?.aspect;
  return a ? a.replace(":", " / ") : "4 / 5";
}


// Hex → rgba(). Penting untuk fade scrim ke alpha-0 warna-sama (bukan keyword transparent).
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function backgroundStyle(bg: TemplateBackground | undefined): CSSProperties {
  if (!bg) return { backgroundColor: "#111111" };
  if (bg.type === "color") return { backgroundColor: bg.value ?? "#111111" };
  if (bg.type === "gradient") {
    const stops = bg.stops ?? [];
    const parts = stops.map(
      (c, i) => `${c} ${Math.round((i / Math.max(stops.length - 1, 1)) * 100)}%`,
    );
    if (bg.shape === "radial") {
      return { background: `radial-gradient(circle at ${bg.position ?? "50% 50%"}, ${parts.join(", ")})` };
    }
    return { background: `linear-gradient(${bg.direction ?? "to bottom"}, ${parts.join(", ")})` };
  }
  // image → fallback warna; <img> di-render terpisah dari thumbnailUrl
  return { backgroundColor: bg.fallback ?? "#111111" };
}

// Style teks (tanpa posisi) — dipakai standalone maupun di dalam group.
// brandFont: override font dari company profile, hanya diteruskan caller bila role elemen
// ada di font_brand_roles. Menang atas style.fontFamily template (kontrak README §5).
function buildTextStyle(el: TemplateElement, scheme: ColorScheme, brandFont?: string): CSSProperties {
  const s = el.style ?? {};
  const fontFamily = brandFont ?? s.fontFamily;
  // Dekorasi: outline (stroke), drop shadow, glossy (gradient fill via background-clip).
  const decor: CSSProperties = {};
  if (s.shadow) decor.textShadow = s.shadow;
  if (s.stroke) {
    decor.WebkitTextStroke = `${cqw(s.stroke.width)} ${s.stroke.color}`;
    decor.paintOrder = "stroke";
  }
  if (s.fillGradient) {
    // Stop bisa hex atau role → resolve lewat scheme (dipakai agar gradient teks ikut brand adapt).
    const stops = s.fillGradient.map((c) => resolveColor(scheme, c)).join(", ");
    // backgroundImage (bukan shorthand `background`) agar tak bentrok dgn backgroundClip (React warning).
    decor.backgroundImage = `linear-gradient(${s.fillGradientDirection ?? "180deg"}, ${stops})`;
    decor.WebkitBackgroundClip = "text";
    decor.backgroundClip = "text";
    decor.WebkitTextFillColor = "transparent";
    decor.color = "transparent";
  }
  // rotasi blok + skew geometri (CTA paralelogram) — komposisi di sekitar pusat blok
  const transforms: string[] = [];
  if (s.rotate != null) transforms.push(`rotate(${s.rotate}deg)`);
  if (s.skew != null) transforms.push(`skewX(${s.skew}deg)`);
  return {
    textAlign: (el.align as CSSProperties["textAlign"]) ?? "left",
    color: resolveColor(scheme, s.color),
    fontFamily: fontFamily ? fontStack(fontFamily) : undefined,
    fontSize: cqw(s.fontSize),
    fontWeight: s.weight ?? "400",
    fontStyle: s.italic ? "italic" : undefined,
    lineHeight: s.lineHeight ?? 1.1,
    letterSpacing: s.letterSpacing != null ? cqw(s.letterSpacing) : undefined,
    whiteSpace: "pre-line",
    transform: transforms.length ? transforms.join(" ") : undefined,
    transformOrigin: transforms.length ? "center" : undefined,
    ...decor,
  };
}

// Box treatment (CTA button / pill): teks dibungkus span inline-block berlatar yang hug-content,
// jadi lebar box ikut teks & posisi box tunduk pada textAlign div luar. Aktif bila style.background diisi.
function buildBoxStyle(s: ElementStyle, scheme: ColorScheme): CSSProperties | undefined {
  if (!s.background) return undefined;
  return {
    display: "inline-block",
    backgroundColor: resolveColor(scheme, s.background),
    borderRadius: s.radius != null ? cqw(s.radius) : undefined,
    padding: s.padding,             // em → ikut fontSize teks
  };
}

// Konten teks dengan style siap-pakai (posisi diatur pemanggil: absolute / flow di group).
function TextBody({ el, scheme, style }: { el: TemplateElement; scheme: ColorScheme; style: CSSProperties }) {
  const s = el.style ?? {};
  const value = el.value ?? "";
  let content: ReactNode = value;
  if (s.accentWords && value.includes(s.accentWords)) {
    const [before, after] = value.split(s.accentWords);
    content = (
      <>
        {before}
        <span style={{ color: resolveColor(scheme, s.accentColor), fontWeight: s.accentWeight ?? "700" }}>
          {s.accentWords}
        </span>
        {after}
      </>
    );
  }
  const box = buildBoxStyle(s, scheme);
  return <div style={style}>{box ? <span style={box}>{content}</span> : content}</div>;
}

// brand font berlaku untuk elemen hanya bila role-nya terdaftar di font_brand_roles.
type BrandFontCtx = { brandFont?: string; fontBrandRoles: Set<string> };
const roleBrandFont = (el: TemplateElement, ctx: BrandFontCtx): string | undefined =>
  el.role && ctx.brandFont && ctx.fontBrandRoles.has(el.role) ? ctx.brandFont : undefined;

function TextElement({ el, scheme, brand }: { el: TemplateElement; scheme: ColorScheme; brand: BrandFontCtx }) {
  const style: CSSProperties = {
    position: "absolute",
    left: pct(el.x),
    top: pct(el.y),
    width: pct(el.width),
    ...buildTextStyle(el, scheme, roleBrandFont(el, brand)),
  };
  return <TextBody el={el} scheme={scheme} style={style} />;
}

// Tagline perusahaan (data company profile, mirip slot `logo`). Beda dari `text` biasa:
// isinya BUKAN dari template/AI tapi dari company_profile.tagline. Kosong (mis. preview default) →
// pakai placeholder `value` template supaya layout tetap kelihatan. Styling penuh via buildTextStyle.
function TaglineElement({ el, scheme, brand }: { el: TemplateElement; scheme: ColorScheme; brand: BrandFontCtx }) {
  const companyTagline = DEFAULT_COMPANY_PROFILE.tagline;
  const withValue: TemplateElement = { ...el, value: companyTagline || el.value || "Tagline Perusahaan" };
  const style: CSSProperties = {
    position: "absolute",
    left: pct(el.x),
    top: pct(el.y),
    width: pct(el.width),
    ...buildTextStyle(el, scheme, roleBrandFont(el, brand)),
  };
  return <TextBody el={withValue} scheme={scheme} style={style} />;
}

// Group: anak teks mengalir vertikal dengan gap TETAP → jarak headline↔body proporsional
// berapa pun panjang teksnya. anchor "bottom" = cluster tumbuh ke atas dari garis y.
function GroupElement({ el, scheme, brand }: { el: TemplateElement; scheme: ColorScheme; brand: BrandFontCtx }) {
  const style: CSSProperties = {
    position: "absolute",
    left: pct(el.x),
    width: pct(el.width),
    display: "flex",
    flexDirection: "column",
    gap: cqw(el.gap ?? 16),
  };
  if (el.anchor === "bottom") style.bottom = pct(1 - el.y);
  else style.top = pct(el.y);
  return (
    <div style={style}>
      {(el.children ?? []).map((child, i) => (
        <TextBody key={i} el={child} scheme={scheme} style={{ width: "100%", ...buildTextStyle(child, scheme, roleBrandFont(child, brand)) }} />
      ))}
    </div>
  );
}

function FooterElement({ el, scheme }: { el: TemplateElement; scheme: ColorScheme }) {
  const s = el.style ?? {};
  const contact = DEFAULT_COMPANY_PROFILE.contact as Record<string, string>;
  // Latar: gradient (menang) atau warna solid. Gradient default horizontal ("to right").
  const bgFill: CSSProperties = s.backgroundGradient
    ? { backgroundImage: `linear-gradient(${s.backgroundGradientDirection ?? "to right"}, ${s.backgroundGradient.map((c) => resolveColor(scheme, c)).join(", ")})` }
    : { backgroundColor: s.backgroundColor ? resolveColor(scheme, s.backgroundColor) : "transparent" };
  return (
    <div
      style={{
        position: "absolute",
        left: pct(el.x),
        top: pct(el.y),
        width: pct(el.width),
        height: pct(el.height ?? 0.06),
        ...bgFill,
        opacity: s.opacity ?? 1,
        // Default pill (999px). radius:0 → bar full-bleed sudut siku (mis. footer nempel dasar edge-to-edge).
        borderRadius: s.radius != null ? cqw(s.radius) : "999px",
        display: "flex",
        alignItems: "center",
        // Default kiri (flex-start) demi kompat template lama; align "center"/"right" → konten di-tengah/kanan.
        justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
        gap: "2.5%",
        padding: "0 3%",
        color: resolveColor(scheme, s.color),
        fontSize: cqw(s.fontSize ?? 20),
      }}
    >
      {(el.slots ?? []).map((slot) => (
        <span key={slot} style={{ display: "inline-flex", alignItems: "center", gap: "0.4em", whiteSpace: "nowrap" }}>
          <SocialIcon slot={slot} />
          {contact[slot] && <span>{contact[slot]}</span>}
        </span>
      ))}
    </div>
  );
}

function ScrimElement({ el, brandColors, brandTheme }: { el: TemplateElement; brandColors?: string[] | null; brandTheme?: BrandTheme }) {
  const gradient = adaptScrimGradient(el.gradient, brandColors, brandTheme);
  if (!gradient) return null;
  const css = `linear-gradient(${gradient.direction}, ${gradient.stops
    .map((st) => `${hexToRgba(st.color, st.alpha)} ${st.position}%`)
    .join(", ")})`;
  return (
    <div
      style={{
        position: "absolute",
        left: pct(el.x),
        top: pct(el.y),
        width: pct(el.width),
        height: pct(el.height ?? 1),
        background: css,
        pointerEvents: "none",
      }}
    />
  );
}

function ImageElement({
  el,
  thumbnailUrl,
  backgroundUrl,
}: {
  el: TemplateElement;
  thumbnailUrl: string;
  backgroundUrl: string;
}) {
  // Foreground dari thumbnail_url ("thumbnail") atau foto latar dari background_url ("background").
  // Sumber lain / URL kosong → jangan render (hindari img rusak).
  const src = el.source === "background" ? backgroundUrl : el.source === "thumbnail" ? thumbnailUrl : "";
  if (!src) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt=""
      style={{
        position: "absolute",
        left: pct(el.x),
        top: pct(el.y),
        width: pct(el.width),
        height: pct(el.height ?? 0.3),
        objectFit: (el.fit as CSSProperties["objectFit"]) ?? "cover",
        borderRadius: el.radius ? cqw(el.radius) : 0,
        // produk transparan (contain) → drop-shadow biar "float" & aesthetic
        filter: el.fit === "contain" ? "drop-shadow(0 6px 12px rgba(0,0,0,0.32))" : undefined,
      }}
    />
  );
}

// Garis dekoratif (mis. rule di atas/bawah subtitle) — bisa ikut rotasi agar paralel teks miring.
function RuleElement({ el, scheme }: { el: TemplateElement; scheme: ColorScheme }) {
  const s = el.style ?? {};
  return (
    <div
      style={{
        position: "absolute",
        left: pct(el.x),
        top: pct(el.y),
        width: pct(el.width),
        height: cqw(s.thickness ?? 4),
        backgroundColor: resolveColor(scheme, s.color ?? "accent"),
        borderRadius: cqw(2),
        transform: s.rotate != null ? `rotate(${s.rotate}deg)` : undefined,
        transformOrigin: "center",
      }}
    />
  );
}

function LogoElement({ el }: { el: TemplateElement }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={DEFAULT_COMPANY_PROFILE.logo_url}
      alt=""
      style={{
        position: "absolute",
        left: pct(el.x),
        top: pct(el.y),
        width: pct(el.width),
        height: pct(el.height ?? 0.08),
        objectFit: "contain",
      }}
    />
  );
}

export function TemplateRenderer({
  cfg,
  thumbnailUrl,
  backgroundUrl = "",
  brandColors,
  brandFont,
  aspect,
}: {
  cfg: TemplateConfig;
  thumbnailUrl: string;
  backgroundUrl?: string;        // foto latar full-bleed (source:"background"); kosong → pakai fallback warna
  brandColors?: string[] | null; // diset → preview brand-adapted; kosong → original
  brandFont?: string | null;     // diset → role di font_brand_roles pakai font ini
  aspect?: string;               // override aspect (mis. galeri "4:5"); kosong → aspect asli
}) {
  const brandTheme = cfg.brand_theme;
  const background = adaptBackground(cfg.background, brandColors, brandTheme);
  const scheme = adaptScheme(cfg.color_scheme ?? ({} as ColorScheme), brandColors, background, brandTheme);
  const isImageBg = background?.type === "image";
  // "background" → background_url; selain itu (termasuk legacy tanpa source) → thumbnail_url.
  const bgImageSrc = background?.source === "background" ? backgroundUrl : thumbnailUrl;

  // Font brand hanya aktif saat preview branded (brandColors terisi) & brand_font ada.
  const isBranded = !!brandColors && brandColors.length > 0;
  const brand: BrandFontCtx = {
    brandFont: isBranded && brandFont ? brandFont : undefined,
    fontBrandRoles: new Set(brandTheme?.font_brand_roles ?? []),
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: aspectRatio(cfg, aspect),
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        fontFamily: fontStack(cfg.font?.family),
        containerType: "inline-size" as CSSProperties["containerType"],
        ...backgroundStyle(background),
      }}
    >
      {isImageBg && bgImageSrc && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={bgImageSrc}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {(cfg.elements ?? []).map((el, i) => {
        switch (el.type) {
          case "logo":
            return <LogoElement key={i} el={el} />;
          case "text":
            return <TextElement key={i} el={el} scheme={scheme} brand={brand} />;
          case "tagline":
            return <TaglineElement key={i} el={el} scheme={scheme} brand={brand} />;
          case "footer":
            return <FooterElement key={i} el={el} scheme={scheme} />;
          case "scrim":
            return <ScrimElement key={i} el={el} brandColors={brandColors} brandTheme={brandTheme} />;
          case "image":
            return <ImageElement key={i} el={el} thumbnailUrl={thumbnailUrl} backgroundUrl={backgroundUrl} />;
          case "group":
            return <GroupElement key={i} el={el} scheme={scheme} brand={brand} />;
          case "rule":
            return <RuleElement key={i} el={el} scheme={scheme} />;
          default:
            return <Fragment key={i} />;
        }
      })}
    </div>
  );
}
