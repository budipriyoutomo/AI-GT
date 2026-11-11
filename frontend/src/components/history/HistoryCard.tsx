"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { projectsApi } from "@/api/projectsApi";
import { resolveAssetUrl } from "@/lib/assetUrl";
import type { Project } from "@/types/project";

const ACCENT_BY_INDEX = ["--chart-1", "--chart-3", "--chart-2", "--chart-4", "--chart-5"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function HistoryCard({
  project,
  onDelete,
  onRenamed,
}: {
  project: Project;
  onDelete: () => void;
  /** Dipanggil setelah PATCH sukses supaya induk bisa memperbarui daftarnya. */
  onRenamed: (id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const headline = project.final_config?.copy?.headline ?? project.title;
  const accent = ACCENT_BY_INDEX[parseInt(project.id.slice(-1), 16) % ACCENT_BY_INDEX.length];

  async function handleDelete() {
    try {
      await projectsApi.delete(project.id);
      toast({ title: "Konten dihapus", desc: project.title, variant: "info" });
      onDelete();
    } catch {
      toast({ title: "Gagal menghapus", variant: "error" });
    }
  }

  function startRename() {
    setDraft(project.title);
    setEditing(true);
  }

  function cancelRename() {
    setDraft(project.title);
    setEditing(false);
  }

  async function commitRename() {
    const title = draft.trim();
    // Kosong atau tak berubah → tidak ada yang perlu dikirim.
    if (!title || title === project.title) {
      cancelRename();
      return;
    }
    setSaving(true);
    try {
      await projectsApi.update(project.id, { title });
      setEditing(false);
      onRenamed(project.id, title);
      toast({ title: "Nama diperbarui", desc: title, variant: "success" });
    } catch {
      // Kembalikan ke judul lama — daftar induk belum tersentuh.
      cancelRename();
      toast({ title: "Gagal mengubah nama", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "relative" }} className="group">
      <Card variant="elevated" padding={12} hover style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative" }}>
          <div style={{
            aspectRatio: "4 / 3",
            borderRadius: "var(--radius-md)",
            background: `color-mix(in oklch, var(${accent}) 15%, var(--surface-sunken))`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            {(project.thumbnail_url || project.exported_image_url) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={resolveAssetUrl(project.thumbnail_url ?? project.exported_image_url)!}
                alt={headline}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: `var(${accent})` }}>Copy</div>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, color: `color-mix(in oklch, var(${accent}) 70%, var(--foreground))`, marginTop: 4 }}>{headline}</div>
                {project.final_config?.copy?.cta && (
                  <span style={{ display: "inline-block", marginTop: 8, padding: "3px 10px", borderRadius: 999, background: `var(${accent})`, color: "#fff", fontSize: 9, fontWeight: 700 }}>
                    {project.final_config.copy.cta}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto" style={{ position: "absolute", inset: "12px 12px auto 12px" }}>
            <Link href={`/editor?projectId=${project.id}`} style={{ display: "block" }}>
              <Button icon="pencil" style={{ width: "100%" }}>Edit di Canvas</Button>
            </Link>
          </div>
        </div>
        <div style={{ marginTop: 11 }}>
          {editing ? (
            <input
              ref={inputRef}
              aria-label="Nama konten"
              value={draft}
              disabled={saving}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void commitRename(); }
                if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
              }}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "4px 8px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--ring)", background: "var(--surface-sunken)",
                color: "var(--foreground)", fontSize: "var(--text-sm)",
                fontWeight: 600, fontFamily: "var(--font-sans)", outline: "none",
              }}
            />
          ) : (
            <div className="aigt-h6" style={{ fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.title}</div>
          )}
          <div className="aigt-mono" style={{ fontSize: 10, color: "var(--primary)", fontWeight: 600, marginTop: 3 }}>{project.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{formatDate(project.created_at)}</span>
            <button
              className="aigt-iconbtn"
              style={{ width: 26, height: 26 }}
              aria-label="Ubah nama"
              title="Ubah nama"
              onClick={startRename}
            >
              <Icon name="square-pen" size={14} />
            </button>
            <button
              className="aigt-iconbtn"
              style={{ width: 26, height: 26, color: "var(--destructive)" }}
              aria-label="Hapus konten"
              title="Hapus"
              onClick={handleDelete}
            >
              <Icon name="trash-2" size={14} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
