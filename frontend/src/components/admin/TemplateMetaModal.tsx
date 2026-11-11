"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { adminApi, type AdminTemplate, type TemplateMetaPatch } from "@/api/adminApi";
import { pickMeta, TemplateMetaFields, type TemplateMeta } from "./TemplateMetaFields";

interface TemplateMetaModalProps {
  template: AdminTemplate;
  onClose: () => void;
  /** Dipanggil setelah simpan/upload berhasil — induk memuat ulang daftar. */
  onSaved: () => void;
}

const IMAGE_SLOTS = [
  { kind: "thumbnail" as const, label: "Upload thumbnail", desc: "Foreground / kartu galeri (element image source \"thumbnail\")." },
  { kind: "background" as const, label: "Upload gambar latar", desc: "Foto latar full-bleed (background source \"background\")." },
];

/** Metadata & gambar template live. template_config sengaja tidak bisa diubah di sini (AGENTS.md §10 #3). */
export function TemplateMetaModal({ template, onClose, onSaved }: TemplateMetaModalProps) {
  const [meta, setMeta] = useState<TemplateMeta>(() => pickMeta(template));
  const [current, setCurrent] = useState(template);
  const [busy, setBusy] = useState(false);

  async function save() {
    const original = pickMeta(current);
    const patch: TemplateMetaPatch = {};
    for (const key of Object.keys(meta) as (keyof TemplateMeta)[]) {
      const v = typeof meta[key] === "string" ? (meta[key] as string).trim() : meta[key];
      if (v !== original[key]) (patch as Record<string, unknown>)[key] = v;
    }
    if (Object.keys(patch).length === 0) { onClose(); return; }
    setBusy(true);
    try {
      await adminApi.updateTemplate(template.id, patch);
      toast({ title: "Template diperbarui", variant: "success" });
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: "Gagal menyimpan", desc: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function upload(kind: "thumbnail" | "background", file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      setCurrent(await adminApi.uploadTemplateImage(template.id, kind, file));
      toast({ title: "Gambar diunggah", variant: "success" });
      onSaved();
    } catch (err) {
      toast({ title: "Gagal upload", desc: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${template.name}`}
      icon="layout-template"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
          <Button onClick={save} disabled={busy}>Simpan</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <TemplateMetaFields value={meta} onChange={setMeta} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {IMAGE_SLOTS.map((slot) => {
            const url = slot.kind === "thumbnail" ? current.thumbnail_url : current.background_url;
            return (
              <div key={slot.kind} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>
                  {slot.label}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    onChange={(e) => upload(slot.kind, e.target.files?.[0])}
                    style={{ display: "block", marginTop: 4, fontWeight: 400 }}
                  />
                </label>
                <span className="aigt-caption">{slot.desc} {url ? `Sekarang: ${url}` : "Belum ada."}</span>
              </div>
            );
          })}
        </div>

        <p className="aigt-caption" style={{ margin: 0 }}>
          Desain (template_config) template live tidak bisa diubah. Pakai &ldquo;Versi baru&rdquo; untuk membuat
          draft dari template ini, lalu publish sebagai template baru.
        </p>
      </div>
    </Modal>
  );
}
