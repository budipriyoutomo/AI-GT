"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, LoadErrorState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { TemplateRenderer } from "@/components/template/TemplateRenderer";
import { resolveTemplateConfig } from "@/lib/template/resolve";
import { adminApi, type AdminTemplate, type TemplateDraft } from "@/api/adminApi";
import { downloadJson } from "./downloadJson";
import { formatDateTime } from "./orderFormat";
import { TemplateMetaModal } from "./TemplateMetaModal";

type Data = { templates: AdminTemplate[]; drafts: TemplateDraft[] };
type Confirm =
  | { kind: "template"; item: AdminTemplate }
  | { kind: "draft"; item: TemplateDraft };

const cell = { padding: "8px 10px", textAlign: "left" as const, verticalAlign: "middle" as const };
const labLink = (id: string) => `/admin/templates/lab/${id}`;
const errMsg = (err: unknown) => (err instanceof Error ? err.message : undefined);

/** A-6 — daftar template live + draft Template Lab. */
export function AdminTemplatesPanel() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloads, setReloads] = useState(0);
  const [tab, setTab] = useState("live");
  const [editing, setEditing] = useState<AdminTemplate | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([adminApi.listTemplates(), adminApi.listDrafts()])
      .then(([t, d]) => { if (alive) { setData({ templates: t.items, drafts: d.items }); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [reloads]);

  const reload = () => setReloads((n) => n + 1);

  async function act(run: () => Promise<unknown>, success: string, failure: string) {
    setBusy(true);
    try {
      await run();
      toast({ title: success, variant: "success" });
      reload();
    } catch (err) {
      toast({ title: failure, desc: errMsg(err), variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function openDraft(sourceId?: string) {
    setBusy(true);
    try {
      const draft = await adminApi.createDraft(sourceId);
      router.push(labLink(draft.id));
    } catch (err) {
      toast({ title: "Gagal membuat draft", desc: errMsg(err), variant: "error" });
      setBusy(false);
    }
  }

  async function exportJson(t: AdminTemplate) {
    try {
      const { filename, content } = await adminApi.exportTemplate(t.id);
      downloadJson(filename, content);
    } catch (err) {
      toast({ title: "Gagal mengunduh JSON", desc: errMsg(err), variant: "error" });
    }
  }

  async function confirmDelete() {
    if (!confirm) return;
    const c = confirm;
    setConfirm(null);
    if (c.kind === "template") await act(() => adminApi.deleteTemplate(c.item.id), "Template dihapus", "Gagal menghapus template");
    else await act(() => adminApi.deleteDraft(c.item.id), "Draft dihapus", "Gagal menghapus draft");
  }

  if (failed) return <LoadErrorState title="Gagal memuat template" onRetry={() => { setFailed(false); reload(); }} />;
  if (!data) return <div className="aigt-caption">Memuat template…</div>;

  const sourceName = (id: string | null) => data.templates.find((t) => t.id === id)?.name;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "live", label: `Template live (${data.templates.length})` },
            { value: "drafts", label: `Draft (${data.drafts.length})` },
          ]}
        />
        <Button icon="plus" style={{ marginLeft: "auto" }} disabled={busy} onClick={() => openDraft()}>
          Template baru
        </Button>
      </div>

      {tab === "live" ? (
        data.templates.length === 0 ? (
          <EmptyState icon="layout-template" title="Belum ada template." desc="Buat dari kerangka lewat Template baru." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr className="aigt-caption">
                  <th style={cell}>Preview</th><th style={cell}>Nama</th><th style={cell}>Industri · tema</th>
                  <th style={cell}>Dipakai</th><th style={cell}>Status</th><th style={cell}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.templates.map((t) => (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ ...cell, width: 72 }}>
                      <div style={{ width: 56 }}>
                        <TemplateRenderer
                          cfg={resolveTemplateConfig({ templateConfig: t.template_config, profile: null, branded: false })}
                          thumbnailUrl={t.thumbnail_url}
                          backgroundUrl={t.background_url ?? ""}
                          aspect="4:5"
                        />
                      </div>
                    </td>
                    <td style={cell}>{t.name}</td>
                    <td style={cell}><span className="aigt-caption">{t.industry} · {t.theme}{t.copy_intent ? ` · ${t.copy_intent}` : ""}</span></td>
                    <td style={cell}>{t.usage_count}×</td>
                    <td style={cell}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <Badge variant={t.is_active ? "success" : "secondary"}>{t.is_active ? "Aktif" : "Nonaktif"}</Badge>
                        {t.is_premium && <Badge variant="warning">Premium</Badge>}
                      </div>
                    </td>
                    <td style={cell}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(t)}>Edit</Button>
                        <Button
                          size="sm" variant="outline" disabled={busy}
                          onClick={() => act(
                            () => adminApi.updateTemplate(t.id, { is_active: !t.is_active }),
                            t.is_active ? "Template dinonaktifkan" : "Template diaktifkan",
                            "Gagal mengubah status",
                          )}
                        >
                          {t.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => openDraft(t.id)}>Versi baru</Button>
                        <Button size="sm" variant="ghost" onClick={() => exportJson(t)}>Unduh JSON</Button>
                        <Button
                          size="sm" variant="ghost" disabled={busy || t.usage_count > 0}
                          title={t.usage_count > 0 ? "Sudah dipakai generate — nonaktifkan saja" : undefined}
                          onClick={() => setConfirm({ kind: "template", item: t })}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : data.drafts.length === 0 ? (
        <EmptyState icon="file-pen-line" title="Belum ada draft." desc="Draft muncul saat kamu membuat template baru atau versi baru." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr className="aigt-caption">
                <th style={cell}>Nama</th><th style={cell}>Versi baru dari</th><th style={cell}>Terakhir diubah</th><th style={cell} />
              </tr>
            </thead>
            <tbody>
              {data.drafts.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={cell}><Link href={labLink(d.id)} style={{ color: "var(--primary)", fontWeight: 600 }}>{d.name || "(tanpa nama)"}</Link></td>
                  <td style={cell}>{d.source_template_id ? (sourceName(d.source_template_id) ?? "template terhapus") : "—"}</td>
                  <td style={cell}>{formatDateTime(d.updated_at)}</td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    <Button
                      size="sm" variant="ghost" disabled={busy}
                      aria-label={`Hapus draft ${d.name}`}
                      onClick={() => setConfirm({ kind: "draft", item: d })}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <TemplateMetaModal template={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}

      {confirm && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title={confirm.kind === "template" ? "Hapus template?" : "Hapus draft?"}
          icon="trash-2"
          footer={
            <>
              <Button variant="outline" onClick={() => setConfirm(null)}>Batal</Button>
              <Button variant="destructive" onClick={confirmDelete}>Ya, hapus</Button>
            </>
          }
        >
          {confirm.kind === "template"
            ? `“${confirm.item.name}” akan dihapus permanen beserta gambarnya. Template ini belum pernah dipakai generate.`
            : `Draft “${confirm.item.name || "(tanpa nama)"}” akan dihapus. Template live tidak terpengaruh.`}
        </Modal>
      )}
    </div>
  );
}
