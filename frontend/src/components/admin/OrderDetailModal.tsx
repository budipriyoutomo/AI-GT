"use client";

import { ReactNode, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { adminApi, type AdminOrder } from "@/api/adminApi";
import { ORDER_STATUS_META, REVIEWABLE, formatDateTime, formatRupiah } from "./orderFormat";

type Mode = "idle" | "confirming" | "rejecting";

const MAX_REASON = 500;

interface OrderDetailModalProps {
  order: AdminOrder | null;
  onClose: () => void;
  onReviewed: (order: AdminOrder) => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "6px 0" }}>
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span style={{ textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

/** Bukti transfer adalah data pribadi: diambil lewat endpoint admin ber-auth
 *  lalu ditampilkan sebagai blob URL — tidak pernah lewat CDN/proxy publik. */
function ProofPreview({ orderId }: { orderId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    adminApi.proofBlob(orderId)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [orderId]);

  if (failed) return <div className="aigt-caption">Gagal memuat bukti transfer.</div>;
  if (!src) return <div className="aigt-caption">Memuat bukti transfer…</div>;
  return (
    <a href={src} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL lokal, bukan aset Next */}
      <img
        src={src}
        alt="Bukti transfer"
        style={{
          width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)", background: "var(--surface-sunken)",
        }}
      />
    </a>
  );
}

/** Pemanggil wajib memberi `key={order.id}` supaya mode/alasan ter-reset saat ganti order. */
export function OrderDetailModal({ order, onClose, onReviewed }: OrderDetailModalProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!order) return null;

  const meta = ORDER_STATUS_META[order.status];
  const reviewable = REVIEWABLE.includes(order.status);

  async function run(action: () => Promise<AdminOrder>, success: string) {
    setBusy(true);
    try {
      const updated = await action();
      toast({ title: success, variant: "success" });
      onReviewed(updated);
    } catch (err) {
      toast({
        title: "Gagal memproses order",
        desc: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const confirm = () => run(() => adminApi.confirmOrder(order.id), "Pembayaran disetujui, paket aktif.");
  const reject = () => run(() => adminApi.rejectOrder(order.id, reason.trim()), "Order ditolak.");

  let footer: ReactNode = null;
  if (reviewable && mode === "idle") {
    footer = (
      <>
        <Button variant="outline" onClick={() => setMode("rejecting")}>Tolak</Button>
        <Button onClick={() => setMode("confirming")}>Setujui</Button>
      </>
    );
  } else if (reviewable && mode === "confirming") {
    footer = (
      <>
        <Button variant="ghost" onClick={() => setMode("idle")} disabled={busy}>Batal</Button>
        <Button onClick={confirm} disabled={busy}>
          {busy ? "Memproses…" : `Ya, aktifkan ${order.item_name}`}
        </Button>
      </>
    );
  } else if (reviewable && mode === "rejecting") {
    footer = (
      <>
        <Button variant="ghost" onClick={() => setMode("idle")} disabled={busy}>Batal</Button>
        <Button variant="destructive" onClick={reject} disabled={busy || !reason.trim()}>
          {busy ? "Memproses…" : "Kirim penolakan"}
        </Button>
      </>
    );
  }

  return (
    <Modal open onClose={onClose} title="Detail Pembayaran" icon="receipt-text" footer={footer}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Row label="Status"><Badge variant={meta.variant}>{meta.label}</Badge></Row>
          <Row label="User">
            {order.user ? (
              <>
                <div style={{ fontWeight: 600 }}>{order.user.name}</div>
                <div>{order.user.email}</div>
              </>
            ) : "Akun sudah dihapus"}
          </Row>
          <Row label="Item">{order.item_name} ({order.kind === "plan" ? "paket" : "add-on"})</Row>
          <Row label="Harga">{formatRupiah(order.amount)}</Row>
          <Row label="Kode unik">{order.unique_code}</Row>
          <Row label="Total transfer">
            <strong style={{ fontSize: "var(--text-base)" }}>{formatRupiah(order.total_amount)}</strong>
          </Row>
          <Row label="Dibuat">{formatDateTime(order.created_at)}</Row>
          {order.paid_at && <Row label="Lunas">{formatDateTime(order.paid_at)}</Row>}
          {order.reviewed_at && (
            <Row label="Ditinjau">
              {formatDateTime(order.reviewed_at)}
              {order.reviewed_by && <div>oleh {order.reviewed_by.email}</div>}
            </Row>
          )}
          {order.rejection_reason && <Row label="Alasan ditolak">{order.rejection_reason}</Row>}
        </div>

        <div>
          <div className="aigt-h6" style={{ marginBottom: 8 }}>Bukti transfer</div>
          {order.has_proof
            ? <ProofPreview orderId={order.id} />
            : <div className="aigt-caption">User belum mengunggah bukti transfer. Cocokkan dengan mutasi rekening.</div>}
        </div>

        {reviewable && mode === "confirming" && (
          <div className="aigt-caption" role="alert">
            Pastikan {formatRupiah(order.total_amount)} sudah masuk di mutasi rekening.
            Paket user langsung aktif dan tidak bisa dibatalkan dari sini.
          </div>
        )}

        {reviewable && mode === "rejecting" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="aigt-h6">Alasan penolakan</span>
            <textarea
              aria-label="Alasan penolakan"
              value={reason}
              maxLength={MAX_REASON}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mis. nominal transfer tidak sesuai, bukti tidak terbaca…"
              style={{
                minHeight: 90, padding: "10px 12px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)", background: "var(--surface-sunken)",
                color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
                outline: "none", resize: "vertical",
              }}
            />
            <span className="aigt-caption">Alasan ini ditampilkan ke user.</span>
          </label>
        )}
      </div>
    </Modal>
  );
}
