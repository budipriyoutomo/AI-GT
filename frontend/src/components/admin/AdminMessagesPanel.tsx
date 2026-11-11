"use client";

import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { adminApi, type AdminMessage, type ListMessagesParams, type MessageStatus } from "@/api/adminApi";
import { contactCategoryLabel } from "@/lib/contactCategories";
import { AdminPager } from "./AdminPager";
import { formatDateTime } from "./orderFormat";

const PAGE_SIZE = 20;

type Result =
  | { key: string; state: "error" }
  | { key: string; state: "ready"; items: AdminMessage[]; total: number; unread: number };
type Load = { state: "loading" } | Result;

const STATUS_META: Record<MessageStatus, { variant: "info" | "secondary" | "success"; label: string }> = {
  new:     { variant: "info",      label: "Baru"    },
  read:    { variant: "secondary", label: "Dibaca"  },
  handled: { variant: "success",   label: "Selesai" },
};

function MessageRow({ msg, open, onToggle, onUpdate, busy }: {
  msg: AdminMessage;
  open: boolean;
  onToggle: () => void;
  onUpdate: (status: MessageStatus) => void;
  busy: boolean;
}) {
  const meta = STATUS_META[msg.status];
  const subject = encodeURIComponent(`Re: ${contactCategoryLabel(msg.category)} — AI-GT`);

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: "flex", width: "100%", gap: 12, alignItems: "flex-start", padding: "12px 16px",
          background: "transparent", border: 0, textAlign: "left", cursor: "pointer", color: "inherit",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: msg.status === "new" ? 700 : 600 }}>{msg.name}</span>
            <span className="aigt-caption">{msg.email}</span>
          </div>
          {!open && (
            <div className="aigt-caption" style={{ marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {msg.message}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <Badge variant="outline">{contactCategoryLabel(msg.category)}</Badge>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <span className="aigt-caption">{formatDateTime(msg.created_at)}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "var(--text-sm)", lineHeight: 1.6,
            padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)",
          }}>
            {msg.message}
          </div>
          {msg.status === "handled" && msg.handled_at && (
            <div className="aigt-caption">
              Ditandai selesai {formatDateTime(msg.handled_at)}
              {msg.handled_by && ` oleh ${msg.handled_by.email}`}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={`mailto:${msg.email}?subject=${subject}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px",
                borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
                color: "var(--foreground)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none",
              }}
            >
              <Icon name="mail" size={14} />
              Balas via email
            </a>
            {msg.status === "handled" ? (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onUpdate("read")}>Buka lagi</Button>
            ) : (
              <Button size="sm" disabled={busy} onClick={() => onUpdate("handled")}>Tandai selesai</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminMessagesPanel() {
  const [status, setStatus] = useState<ListMessagesParams["status"]>("open");
  const [offset, setOffset] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Hasil yang kuncinya tak cocok dengan request aktif = masih loading.
  const requestKey = `${status}:${offset}:${reloads}`;
  const load: Load = result && result.key === requestKey ? result : { state: "loading" };

  useEffect(() => {
    let alive = true;
    adminApi.listMessages({ status, limit: PAGE_SIZE, offset })
      .then(({ items, total, unread }) => {
        if (alive) setResult({ key: requestKey, state: "ready", items, total, unread });
      })
      .catch(() => { if (alive) setResult({ key: requestKey, state: "error" }); });
    return () => { alive = false; };
  }, [status, offset, requestKey]);

  const reload = () => setReloads((n) => n + 1);

  // Angka "Baru" dipertahankan dari hasil terakhir supaya tab tak berkedip saat loading.
  const unread = result?.state === "ready" ? result.unread : 0;
  const tabs = [
    { value: "open",    label: "Belum selesai" },
    { value: "new",     label: unread ? `Baru (${unread})` : "Baru" },
    { value: "handled", label: "Selesai" },
    { value: "all",     label: "Semua" },
  ];

  function changeStatus(v: string) {
    setStatus(v as ListMessagesParams["status"]);
    setOffset(0);
    setOpenId(null);
  }

  function toggle(msg: AdminMessage) {
    const next = openId === msg.id ? null : msg.id;
    setOpenId(next);
    if (next && msg.status === "new") {
      // Fire-and-forget: gagal menandai dibaca tidak perlu mengganggu admin.
      adminApi.updateMessage(msg.id, { status: "read", only_if_new: true }).then(reload).catch(() => {});
    }
  }

  async function update(msg: AdminMessage, next: MessageStatus) {
    setBusy(true);
    try {
      await adminApi.updateMessage(msg.id, { status: next });
      toast({ title: next === "handled" ? "Pesan ditandai selesai." : "Pesan dibuka lagi.", variant: "success" });
      reload();
    } catch (err) {
      toast({
        title: "Gagal memperbarui pesan",
        desc: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Tabs tabs={tabs} value={status} onChange={changeStatus} />

      <Card variant="elevated" padding={0}>
        {load.state === "loading" && <div className="aigt-caption" style={{ padding: 20 }}>Memuat pesan…</div>}

        {load.state === "error" && (
          <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <span className="aigt-caption">Gagal memuat pesan.</span>
            <Button size="sm" variant="outline" onClick={reload}>Coba lagi</Button>
          </div>
        )}

        {load.state === "ready" && load.items.length === 0 && (
          <div style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Icon name="inbox" size={28} style={{ opacity: 0.4 }} />
            <span className="aigt-caption">Tidak ada pesan di sini.</span>
          </div>
        )}

        {load.state === "ready" && load.items.map((m) => (
          <MessageRow
            key={m.id}
            msg={m}
            open={openId === m.id}
            onToggle={() => toggle(m)}
            onUpdate={(next) => update(m, next)}
            busy={busy}
          />
        ))}
      </Card>

      {load.state === "ready" && (
        <AdminPager offset={offset} pageSize={PAGE_SIZE} total={load.total} onChange={setOffset} />
      )}
    </div>
  );
}
