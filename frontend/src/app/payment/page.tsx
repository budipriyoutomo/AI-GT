"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { billingApi, type Order } from "@/api/billingApi";

function fmt(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  function copy() {
    navigator.clipboard?.writeText(value);
    toast({ title: "Disalin", desc: value, variant: "info" });
  }
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
      background: "var(--surface-sunken)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, fontFamily: mono ? "var(--font-mono)" : undefined, letterSpacing: mono ? ".02em" : undefined }}>{value}</div>
      </div>
      <Button size="sm" variant="ghost" icon="copy" onClick={copy}>Salin</Button>
    </div>
  );
}

function PaymentInner() {
  const params = useSearchParams();
  const orderId = params.get("orderId");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(!!orderId);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!orderId) return;
    billingApi.order(orderId)
      .then(setOrder)
      .catch(() => toast({ title: "Order tidak ditemukan", variant: "error" }))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handleProof(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !order) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({ title: "Format tidak didukung", desc: "PNG, JPG, atau WEBP.", variant: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Ukuran terlalu besar", desc: "Maksimal 5 MB.", variant: "error" });
      return;
    }
    setUploading(true);
    try {
      const updated = await billingApi.uploadProof(order.id, file);
      setOrder(updated);
      toast({ title: "Bukti transfer terkirim", desc: "Menunggu verifikasi tim kami.", variant: "success" });
    } catch {
      toast({ title: "Gagal mengunggah bukti", variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "80px 0", color: "var(--muted-foreground)" }}>
        <Icon name="loader-2" size={20} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: "var(--text-sm)" }}>Memuat instruksi pembayaran…</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0", color: "var(--muted-foreground)" }}>
        <Icon name="receipt-text" size={36} style={{ opacity: 0.4 }} />
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Order tidak ditemukan.</div>
        <Link href="/subscription"><Button size="sm" icon="arrow-left">Kembali ke paket</Button></Link>
      </div>
    );
  }

  const isPaid = order.status === "paid";
  const isAwaiting = order.status === "awaiting_verification";

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Ringkasan order */}
      <Card variant="elevated" padding={20}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>{order.item_name}</div>
          <Badge variant={isPaid ? "success" : isAwaiting ? "warning" : "secondary"} dot>
            {isPaid ? "Lunas" : isAwaiting ? "Menunggu verifikasi" : "Menunggu pembayaran"}
          </Badge>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "var(--text-xs)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted-foreground)" }}>Harga</span>
            <span>{fmt(order.amount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted-foreground)" }}>Kode unik</span>
            <span className="aigt-mono">{order.unique_code}</span>
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontWeight: 700 }}>Total transfer</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>{fmt(order.total_amount)}</span>
          </div>
        </div>
      </Card>

      {isPaid ? (
        <Card variant="elevated" padding={24}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <span style={{ width: 48, height: 48, borderRadius: 999, background: "var(--success)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="check" size={24} />
            </span>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>Pembayaran terkonfirmasi</div>
            <div className="aigt-caption">Paket kamu sudah aktif. Terima kasih!</div>
            <Link href="/subscription"><Button size="sm" icon="arrow-left">Kembali ke paket</Button></Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Instruksi transfer BCA */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Icon name="building-2" size={16} style={{ color: "var(--primary)" }} />
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>Transfer ke {order.bank.bank_name}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CopyRow label="Nomor rekening" value={order.bank.account_number} mono />
              <CopyRow label="Atas nama" value={order.bank.account_holder} />
              <CopyRow label="Nominal transfer (tepat, termasuk kode unik)" value={String(order.total_amount)} mono />
            </div>
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, padding: "10px 12px",
              background: "color-mix(in oklch, var(--info) 8%, var(--card))",
              border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)",
              borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.6,
            }}>
              <Icon name="info" size={13} style={{ color: "var(--info)", flexShrink: 0, marginTop: 1 }} />
              <div>Transfer <strong style={{ color: "var(--foreground)" }}>tepat {fmt(order.total_amount)}</strong> (angka di belakang = kode unik) agar mudah kami cocokkan. Lalu unggah bukti transfer di bawah.</div>
            </div>
          </Card>

          {/* Upload bukti */}
          <Card variant="elevated" padding={20}>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: 12 }}>Unggah bukti transfer</div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleProof} />
            {isAwaiting ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 12, padding: 14,
                border: "1px solid color-mix(in oklch, var(--warning) 30%, transparent)",
                background: "color-mix(in oklch, var(--warning) 8%, var(--card))",
                borderRadius: "var(--radius-lg)",
              }}>
                <Icon name="clock" size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: "var(--text-xs)", lineHeight: 1.6 }}>
                  Bukti transfer terkirim. Tim kami akan verifikasi & aktifkan paket dalam 1×24 jam.
                </div>
                <Button size="sm" variant="ghost" icon="refresh-cw" disabled={uploading} onClick={() => fileRef.current?.click()}>Ganti</Button>
              </div>
            ) : (
              <div
                onClick={() => { if (!uploading) fileRef.current?.click(); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 28,
                  border: "1.5px dashed color-mix(in oklch, var(--primary) 40%, var(--border))",
                  borderRadius: "var(--radius-lg)", background: "var(--surface-sunken)",
                  cursor: uploading ? "wait" : "pointer", textAlign: "center",
                }}
              >
                <span style={{ width: 40, height: 40, borderRadius: "var(--radius-lg)", background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="upload-cloud" size={20} />
                </span>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{uploading ? "Mengunggah…" : "Klik untuk unggah bukti transfer"}</div>
                <div className="aigt-caption">PNG, JPG atau WEBP · maks 5 MB</div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Shell active="settings" title="Pembayaran">
      <Suspense fallback={null}>
        <PaymentInner />
      </Suspense>
    </Shell>
  );
}
