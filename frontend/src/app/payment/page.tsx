"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";

/* ── Types ─────────��───────────────────────────────────────── */

type PaymentMethod = "qris" | "transfer" | "card" | "ewallet";

const METHODS: { id: PaymentMethod; label: string; sub: string; icon: string }[] = [
  { id: "qris",     label: "QRIS",             sub: "Semua e-wallet & mobile banking",  icon: "scan-qr-code"  },
  { id: "transfer", label: "Transfer Bank",     sub: "BCA · Mandiri · BNI · BRI",         icon: "building-2"    },
  { id: "card",     label: "Kartu Kredit/Debit",sub: "Visa · Mastercard · JCB",           icon: "credit-card"   },
  { id: "ewallet",  label: "E-Wallet",          sub: "GoPay · OVO · DANA · ShopeePay",    icon: "wallet"        },
];

const PLAN_FEATURES: Record<string, string[]> = {
  business: ["300 generate / bulan", "Riwayat tidak terbatas", "10 profil bisnis", "Priority support", "Semua fitur Pro"],
  pro:      ["80 generate / bulan",  "50 slot riwayat", "3 profil bisnis", "Thematic image AI", "Export tanpa watermark"],
};

const ADDON_LABELS: Record<string, string> = {
  s50:  "+50 slot riwayat",
  s200: "+200 slot riwayat",
  s500: "+500 slot riwayat",
};

function fmt(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

/* ── Steps indicator ──────────��───────────────────────────── */

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: "Pilihan"    },
    { num: 2, label: "Pembayaran" },
    { num: 3, label: "Konfirmasi" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-xs)", marginBottom: 28 }}>
      {steps.map((s, i) => (
        <span key={s.num} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 999, flexShrink: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700,
              background: s.num < current ? "var(--success)" : s.num === current ? "var(--primary)" : "var(--muted)",
              color: s.num <= current ? "#fff" : "var(--muted-foreground)",
            }}>
              {s.num < current ? <Icon name="check" size={11} /> : s.num}
            </span>
            <span style={{
              fontWeight: s.num === current ? 600 : 400,
              color: s.num === current ? "var(--foreground)" : s.num < current ? "var(--foreground)" : "var(--muted-foreground)",
            }}>
              {s.label}
            </span>
          </span>
          {i < steps.length - 1 && <Icon name="chevron-right" size={13} style={{ color: "var(--muted-foreground)" }} />}
        </span>
      ))}
    </div>
  );
}

/* ── Page ────────────────��────────────────────────────────── */

export default function PaymentPage() {
  const params   = useSearchParams();
  const router   = useRouter();

  const type     = params.get("type")  ?? "plan";
  const item     = params.get("item")  ?? "business";
  const price    = Number(params.get("price") ?? 249000);
  const label    = params.get("label") ?? (type === "addon" ? (ADDON_LABELS[item] ?? "Add-on Storage") : `Paket ${item.charAt(0).toUpperCase() + item.slice(1)}`);

  const [method,  setMethod]  = useState<PaymentMethod>("qris");
  const [loading, setLoading] = useState(false);
  const [step,    setStep]    = useState<1 | 2 | 3>(2);

  const tax       = Math.round(price * 0.11);
  const total     = price + tax;
  const features  = type === "plan" ? (PLAN_FEATURES[item] ?? []) : [];

  function handlePay() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1800);
  }

  /* ── Step 3: success screen ── */
  if (step === 3) {
    return (
      <Shell active="settings" title="Pembayaran Berhasil">
        <div style={{
          maxWidth: 480, margin: "60px auto 0",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          textAlign: "center",
        }}>
          <span style={{
            width: 72, height: 72, borderRadius: 999,
            background: "var(--tint-success)",
            border: "2px solid color-mix(in oklch, var(--success) 30%, transparent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="check-circle-2" size={36} style={{ color: "var(--success)" }} />
          </span>

          <div>
            <h1 className="aigt-h4">Pembayaran Berhasil!</h1>
            <div className="aigt-caption" style={{ marginTop: 8, maxWidth: 360 }}>
              {type === "plan"
                ? `Paket ${label} kamu sudah aktif. Semua fitur baru bisa langsung digunakan.`
                : `${label} sudah ditambahkan ke akun kamu.`}
            </div>
          </div>

          <div style={{
            width: "100%", padding: "16px 20px",
            border: "1px solid var(--border)", borderRadius: "var(--radius-xl)",
            background: "var(--card)",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)" }}>
              <span style={{ color: "var(--muted-foreground)" }}>Item</span>
              <span style={{ fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)" }}>
              <span style={{ color: "var(--muted-foreground)" }}>Metode</span>
              <span style={{ fontWeight: 600 }}>{METHODS.find((m) => m.id === method)?.label}</span>
            </div>
            <div style={{ height: 1, background: "var(--border)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)" }}>
              <span style={{ color: "var(--muted-foreground)" }}>Total dibayar</span>
              <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "var(--text-sm)" }}>{fmt(total)}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <Button
              variant="outline"
              icon="file-text"
              style={{ flex: 1 }}
              onClick={() => { toast({ title: "Mengunduh invoice…", variant: "info" }); }}
            >
              Unduh Invoice
            </Button>
            <Button
              icon="layout-dashboard"
              style={{ flex: 1 }}
              onClick={() => router.push("/subscription")}
            >
              Ke Langganan
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ── Step 2: payment form ── */
  return (
    <Shell
      active="settings"
      title="Pembayaran"
      actions={
        <Link href="/subscription">
          <Button size="sm" variant="outline" icon="arrow-left">Kembali</Button>
        </Link>
      }
    >
      <Steps current={step} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

        {/* ── Left: payment method ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <Card variant="elevated" padding={20}>
            <div className="aigt-h5" style={{ marginBottom: 16 }}>Metode Pembayaran</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px", borderRadius: "var(--radius-lg)", textAlign: "left",
                      border: `1.5px solid ${active ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                      background: active ? "var(--tint-primary)" : "var(--card)",
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                      transition: "all .15s ease",
                    }}
                  >
                    <span style={{
                      width: 40, height: 40, borderRadius: "var(--radius-md)", flexShrink: 0,
                      background: active
                        ? "color-mix(in oklch, var(--primary) 15%, transparent)"
                        : "var(--surface-sunken)",
                      border: `1px solid ${active ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`,
                      color: active ? "var(--primary)" : "var(--muted-foreground)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name={m.icon as "wallet"} size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "var(--text-sm)", fontWeight: active ? 700 : 500,
                        color: active ? "var(--primary)" : "var(--foreground)",
                      }}>
                        {m.label}
                      </div>
                      <div className="aigt-caption" style={{ marginTop: 2 }}>{m.sub}</div>
                    </div>
                    <span style={{
                      width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                      border: `2px solid ${active ? "var(--primary)" : "var(--border)"}`,
                      background: active ? "var(--primary)" : "transparent",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {active && <Icon name="check" size={10} style={{ color: "#fff" }} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* QRIS preview */}
          {method === "qris" && (
            <Card variant="elevated" padding={20}>
              <div className="aigt-h5" style={{ marginBottom: 4 }}>Scan QR Code</div>
              <div className="aigt-caption" style={{ marginBottom: 16 }}>
                Buka aplikasi e-wallet atau mobile banking, lalu scan kode QR di bawah.
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 180, height: 180, borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)", background: "var(--surface-sunken)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <Icon name="scan-qr-code" size={64} style={{ color: "var(--muted-foreground)", opacity: .35 }} />
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>QR akan muncul setelah konfirmasi</span>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
                }}>
                  <Icon name="clock" size={12} />
                  Kode berlaku selama <strong style={{ color: "var(--foreground)" }}>15 menit</strong>
                </div>
              </div>
            </Card>
          )}

          {/* Transfer bank preview */}
          {method === "transfer" && (
            <Card variant="elevated" padding={20}>
              <div className="aigt-h5" style={{ marginBottom: 16 }}>Nomor Rekening Tujuan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { bank: "BCA",     no: "1234567890",   name: "PT AI-GT Indonesia" },
                  { bank: "Mandiri", no: "0987654321",   name: "PT AI-GT Indonesia" },
                  { bank: "BNI",     no: "5678901234",   name: "PT AI-GT Indonesia" },
                ].map((b) => (
                  <div key={b.bank} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border)", background: "var(--surface-sunken)",
                  }}>
                    <div>
                      <div style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>{b.bank}</div>
                      <div className="aigt-mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{b.no}</div>
                      <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>{b.name}</div>
                    </div>
                    <button
                      className="aigt-iconbtn"
                      onClick={() => toast({ title: `Nomor ${b.bank} disalin`, variant: "success" })}
                    >
                      <Icon name="copy" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="aigt-caption" style={{ marginTop: 12 }}>
                Transfer tepat sesuai jumlah tagihan. Akun aktif otomatis setelah verifikasi (maks. 1x24 jam).
              </div>
            </Card>
          )}

          {/* Card form */}
          {method === "card" && (
            <Card variant="elevated" padding={20}>
              <div className="aigt-h5" style={{ marginBottom: 16 }}>Detail Kartu</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>Nomor kartu</label>
                  <input
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none focus:border-[var(--ring)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>Berlaku hingga</label>
                    <input
                      placeholder="MM / YY"
                      maxLength={7}
                      className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none focus:border-[var(--ring)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>CVV</label>
                    <input
                      placeholder="•••"
                      maxLength={4}
                      type="password"
                      className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none focus:border-[var(--ring)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>Nama pemegang kartu</label>
                  <input
                    placeholder="Sesuai nama di kartu"
                    className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none focus:border-[var(--ring)]"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* E-wallet */}
          {method === "ewallet" && (
            <Card variant="elevated" padding={20}>
              <div className="aigt-h5" style={{ marginBottom: 16 }}>Pilih E-Wallet</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[
                  { id: "gopay",      label: "GoPay"      },
                  { id: "ovo",        label: "OVO"        },
                  { id: "dana",       label: "DANA"       },
                  { id: "shopeepay",  label: "ShopeePay"  },
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => toast({ title: `${w.label} dipilih`, variant: "info" })}
                    style={{
                      padding: "12px 14px", borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--border)", background: "var(--surface-sunken)",
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-xs)", fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "all .15s ease",
                    }}
                  >
                    <Icon name="wallet" size={14} style={{ color: "var(--primary)" }} />
                    {w.label}
                  </button>
                ))}
              </div>
            </Card>
          )}

        </div>

        {/* ── Right: order summary ── */}
        <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 14 }}>

          <Card variant="elevated" padding={20}>
            <div className="aigt-label" style={{ marginBottom: 14 }}>Ringkasan Pesanan</div>

            {/* Item */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: "var(--radius-lg)",
              border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
              background: "var(--tint-primary)", marginBottom: 16,
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: "var(--radius-md)", flexShrink: 0,
                background: "var(--primary)", color: "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={type === "addon" ? "database" : "crown"} size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>{label}</div>
                <div className="aigt-caption" style={{ marginTop: 2 }}>
                  {type === "plan" ? "Berlangganan bulanan" : "Add-on sekali bayar"}
                </div>
              </div>
              {type === "plan" && <Badge variant="info">Bulanan</Badge>}
            </div>

            {/* Features (plan only) */}
            {features.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                {features.map((f) => (
                  <div key={f} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    fontSize: "var(--text-xs)", color: "var(--foreground)",
                  }}>
                    <Icon name="check" size={12} style={{ color: "var(--success)", flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Price breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)" }}>
                <span style={{ color: "var(--muted-foreground)" }}>Subtotal</span>
                <span style={{ fontWeight: 500 }}>{fmt(price)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)" }}>
                <span style={{ color: "var(--muted-foreground)" }}>PPN 11%</span>
                <span style={{ fontWeight: 500 }}>{fmt(tax)}</span>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                paddingTop: 10, borderTop: "1px solid var(--border)",
                fontSize: "var(--text-sm)", fontWeight: 800,
              }}>
                <span>Total</span>
                <span style={{ color: "var(--primary)" }}>{fmt(total)}</span>
              </div>
            </div>
          </Card>

          {/* Pay button */}
          <Button
            icon={loading ? "loader-circle" : "lock"}
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
            onClick={handlePay}
          >
            {loading ? "Memproses pembayaran…" : `Bayar ${fmt(total)}`}
          </Button>

          {/* Security note */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 10, color: "var(--muted-foreground)",
          }}>
            <Icon name="shield-check" size={12} style={{ color: "var(--success)" }} />
            Transaksi aman · diproses via Midtrans
          </div>

        </div>
      </div>
    </Shell>
  );
}
