"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { LoadErrorState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { TemplateRenderer } from "@/components/template/TemplateRenderer";
import TemplateFabricCanvas from "@/components/editor/TemplateFabricCanvas";
import { buildCanvasSpec } from "@/lib/editor/canvas-spec";
import { resolveTemplateConfig, type BrandSource } from "@/lib/template/resolve";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";
import { adminApi, type TemplateDraft, type TemplateValidation } from "@/api/adminApi";
import type { TemplateConfig } from "@/types/template";
import { downloadJson } from "./downloadJson";
import { fieldStyle, pickMeta, TemplateMetaFields, type TemplateMeta } from "./TemplateMetaFields";

const VALIDATE_DEBOUNCE_MS = 400;
// Lebar dasar TemplateFabricCanvas = 800px pada zoom 1 → 0.4 ≈ 320px, sama dengan kolom preview CSS.
const FABRIC_ZOOM = 0.4;
const PREVIEW_WIDTH = 320;

/** Brand uji "jauh dari palet" (README template §5): preview harus BERUBAH saat diaktifkan. */
const SAMPLE_BRAND: BrandSource = {
  brand_colors: ["#7C3AED", "#F59E0B"],
  brand_font: "Poppins",
  logo_url: DEFAULT_COMPANY_PROFILE.logo_url,
  tagline: "Tagline brand uji",
};

type Parsed = { ok: true; config: Record<string, unknown> } | { ok: false; error: string };
type Checked = { text: string; result: TemplateValidation };

function parse(text: string): Parsed {
  try {
    const value = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "JSON tidak valid: harus berupa objek { … }." };
    }
    return { ok: true, config: value };
  } catch (err) {
    return { ok: false, error: `JSON tidak valid: ${err instanceof Error ? err.message : "periksa sintaks"}` };
  }
}

const toText = (config: unknown) => JSON.stringify(config, null, 2);

/** A-6 — editor draft: metadata + JSON template_config + preview di KEDUA renderer (AGENTS.md §6). */
export function TemplateLab({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloads, setReloads] = useState(0);
  const [meta, setMeta] = useState<TemplateMeta | null>(null);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<Checked | null>(null);
  // Preview tetap menampilkan config valid terakhir saat JSON sedang diketik/rusak.
  const [lastResolved, setLastResolved] = useState<TemplateConfig | null>(null);
  const [branded, setBranded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deactivateSource, setDeactivateSource] = useState(false);

  useEffect(() => {
    let alive = true;
    adminApi.getDraft(draftId)
      .then((d) => {
        if (!alive) return;
        setDraft(d);
        setMeta(pickMeta(d));
        setText(toText(d.template_config));
        setFailed(false);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [draftId, reloads]);

  const parsed = useMemo(() => parse(text), [text]);
  const loaded = draft !== null;

  useEffect(() => {
    if (!loaded || !parsed.ok) return;
    let alive = true;
    const timer = setTimeout(() => {
      adminApi.validateTemplate(parsed.config)
        .then((result) => {
          if (!alive) return;
          setChecked({ text, result });
          if (result.resolved_config) setLastResolved(result.resolved_config);
        })
        .catch((err) => {
          if (!alive) return;
          setChecked({ text, result: { valid: false, errors: [`Validasi gagal: ${err instanceof Error ? err.message : "coba lagi"}`], warnings: [], resolved_config: null } });
        });
    }, VALIDATE_DEBOUNCE_MS);
    return () => { alive = false; clearTimeout(timer); };
  }, [loaded, parsed, text]);

  const current = checked?.text === text ? checked.result : null;
  const canPublish = parsed.ok && !!current?.valid && !busy;

  const preview = useMemo(() => {
    if (!lastResolved || !draft) return null;
    const cfg = resolveTemplateConfig({ templateConfig: lastResolved, profile: branded ? SAMPLE_BRAND : null, branded });
    const contact = DEFAULT_COMPANY_PROFILE.contact;
    return {
      cfg,
      spec: buildCanvasSpec({
        cfg,
        thumbnailUrl: draft.thumbnail_url,
        backgroundUrl: draft.background_url,
        contact,
      }),
    };
  }, [lastResolved, draft, branded]);

  async function save(): Promise<TemplateDraft | null> {
    if (!meta || !parsed.ok) return null;
    setBusy(true);
    try {
      const saved = await adminApi.updateDraft(draftId, { ...meta, template_config: parsed.config });
      setDraft(saved);
      return saved;
    } catch (err) {
      toast({ title: "Gagal menyimpan draft", desc: err instanceof Error ? err.message : undefined, variant: "error" });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveClicked() {
    if (await save()) toast({ title: "Draft disimpan", variant: "success" });
  }

  async function exportJson() {
    if (!(await save())) return;
    try {
      const { filename, content } = await adminApi.exportDraft(draftId);
      downloadJson(filename, content);
    } catch (err) {
      toast({ title: "Gagal mengunduh JSON", desc: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  }

  async function publish() {
    setPublishing(false);
    if (!(await save())) return;
    setBusy(true);
    try {
      const t = await adminApi.publishDraft(draftId, deactivateSource);
      toast({ title: "Template dipublish", desc: `${t.name} sudah tampil di galeri user.`, variant: "success" });
      router.push("/admin/templates");
    } catch (err) {
      toast({ title: "Gagal publish", desc: err instanceof Error ? err.message : undefined, variant: "error" });
      setBusy(false);
    }
  }

  if (failed) {
    return <LoadErrorState title="Gagal memuat draft template" onRetry={() => { setFailed(false); setReloads((n) => n + 1); }} />;
  }
  if (!draft || !meta) return <div className="aigt-caption">Memuat draft…</div>;

  const dirty = text !== toText(draft.template_config)
    || JSON.stringify(meta) !== JSON.stringify(pickMeta(draft));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Link href="/admin/templates" className="aigt-caption">← Semua template</Link>
        {draft.source_template_id && <Badge variant="info">Versi baru</Badge>}
        {dirty && <Badge variant="warning">Belum disimpan</Badge>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" icon="download" disabled={busy || !parsed.ok} onClick={exportJson}>Unduh JSON</Button>
          <Button variant="outline" disabled={busy || !parsed.ok} onClick={saveClicked}>Simpan draft</Button>
          <Button icon="upload" disabled={!canPublish} onClick={() => setPublishing(true)}>Publish</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, alignItems: "start" }}>
        <Card variant="elevated" padding={16}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <TemplateMetaFields value={meta} onChange={setMeta} />
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--text-xs)", fontWeight: 600 }}>
              template_config (JSON)
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                rows={24}
                style={{ ...fieldStyle, fontFamily: "var(--font-mono, monospace)", fontSize: 12, lineHeight: 1.5, resize: "vertical" }}
              />
            </label>
            <span className="aigt-caption">
              Preset (palette, background.preset, brand_theme.preset, stylePreset) di-expand saat publish —
              aturan lengkap di backend/scripts/seed_template_data/README.md.
            </span>
            <ValidationList parsed={parsed} result={current} />
          </div>
        </Card>

        <Card variant="elevated" padding={16}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div className="aigt-h6">Preview</div>
              <div style={{ marginLeft: "auto" }}>
                <Switch label="Uji brand (warna kontras)" checked={branded} onChange={setBranded} />
              </div>
            </div>
            {preview ? (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <figure style={{ margin: 0, width: PREVIEW_WIDTH }}>
                  <TemplateRenderer
                    cfg={preview.cfg}
                    thumbnailUrl={draft.thumbnail_url ?? ""}
                    backgroundUrl={draft.background_url ?? ""}
                  />
                  <figcaption className="aigt-caption" style={{ marginTop: 6 }}>Galeri &amp; preview (CSS)</figcaption>
                </figure>
                <figure style={{ margin: 0, width: PREVIEW_WIDTH }}>
                  <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                    <TemplateFabricCanvas spec={preview.spec} zoom={FABRIC_ZOOM} />
                  </div>
                  <figcaption className="aigt-caption" style={{ marginTop: 6 }}>Editor &amp; export PNG (Fabric, auto-fit)</figcaption>
                </figure>
              </div>
            ) : (
              <div className="aigt-caption">Preview muncul setelah config valid.</div>
            )}
            <span className="aigt-caption">
              Gambar mengikuti template asal; upload thumbnail/latar dilakukan per template setelah publish.
            </span>
          </div>
        </Card>
      </div>

      {publishing && (
        <Modal
          open
          onClose={() => setPublishing(false)}
          title="Publish template?"
          icon="upload"
          footer={
            <>
              <Button variant="outline" onClick={() => setPublishing(false)}>Batal</Button>
              <Button onClick={publish}>Ya, publish</Button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span>&ldquo;{meta.name}&rdquo; langsung tampil di galeri semua user. Desainnya tidak bisa diubah setelah publish.</span>
            {draft.source_template_id && (
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={deactivateSource} onChange={(e) => setDeactivateSource(e.target.checked)} />
                Nonaktifkan template asal (disembunyikan dari galeri, riwayat user tetap utuh)
              </label>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ValidationList({ parsed, result }: { parsed: Parsed; result: TemplateValidation | null }) {
  if (!parsed.ok) return <Message tone="error" items={[parsed.error]} />;
  if (!result) return <span className="aigt-caption">Memvalidasi…</span>;
  return (
    <>
      {result.valid
        ? <Message tone="ok" items={["Config valid — siap dipublish."]} />
        : <Message tone="error" items={result.errors} />}
      {result.warnings.length > 0 && <Message tone="warning" items={result.warnings} />}
    </>
  );
}

const TONE = {
  ok: "var(--success)",
  warning: "var(--warning)",
  error: "var(--destructive)",
};

function Message({ tone, items }: { tone: keyof typeof TONE; items: string[] }) {
  return (
    <ul
      role={tone === "error" ? "alert" : undefined}
      style={{
        margin: 0, padding: "8px 12px 8px 26px", fontSize: "var(--text-xs)",
        borderLeft: `3px solid ${TONE[tone]}`, background: `color-mix(in oklch, ${TONE[tone]} 8%, var(--card))`,
        borderRadius: "var(--radius-md)",
      }}
    >
      {items.map((m) => <li key={m}>{m}</li>)}
    </ul>
  );
}
