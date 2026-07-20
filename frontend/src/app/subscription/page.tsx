"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "@/components/ui/toast";
import { billingApi, type Plan, type Addon, type Subscription } from "@/api/billingApi";
import { fmtPrice as fmt, formatPlanDate as formatDate, planFeatures } from "@/lib/billing";

/* ── Presentasi per paket (warna saja — harga/limit dari API) ── */
const PLAN_STYLE: Record<string, { color: string; tint: string; border: string; badge?: string }> = {
  starter:  { color: "var(--muted-foreground)", tint: "var(--surface-sunken)", border: "var(--border)" },
  pro:      { color: "var(--primary)", tint: "var(--tint-primary)", border: "color-mix(in oklch, var(--primary) 40%, transparent)" },
  business: { color: "var(--chart-4)", tint: "color-mix(in oklch, var(--chart-4) 10%, var(--card))", border: "color-mix(in oklch, var(--chart-4) 35%, transparent)" },
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddon, setSelectedAddon] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([billingApi.plans(), billingApi.subscription()])
      .then(([pl, s]) => { setPlans(pl.plans); setAddons(pl.addons); setSub(s); })
      .catch(() => toast({ title: "Gagal memuat data langganan", variant: "error" }))
      .finally(() => setLoading(false));
  }, []);

  async function startOrder(body: { plan_id?: string; addon_id?: string }, key: string) {
    setProcessing(key);
    try {
      const order = await billingApi.createOrder(body);
      router.push(`/payment?orderId=${order.id}`);
    } catch {
      toast({ title: "Gagal membuat order", variant: "error" });
      setProcessing(null);
    }
  }

  if (loading || !sub) {
    return (
      <Shell active="settings" title="Subscription">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "80px 0", color: "var(--muted-foreground)" }}>
          <Icon name="loader-2" size={20} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "var(--text-sm)" }}>Memuat paket…</span>
        </div>
      </Shell>
    );
  }

  const usage = sub.usage;
  const generatePct = usage.generate_limit > 0 ? Math.round((usage.generate_used / usage.generate_limit) * 100) : 0;
  const storagePct = usage.history_limit > 0 ? Math.round((usage.history_used / usage.history_limit) * 100) : 0;
  const activeStyle = PLAN_STYLE[sub.plan_id] ?? PLAN_STYLE.starter;

  return (
    <Shell active="settings" title="Subscription">
      <PageHead
        title="Paket & Langganan"
        subtitle="Kelola paket aktif, kuota generate, dan storage riwayat kamu."
      />

      {/* ── Status paket aktif ── */}
      <Card variant="elevated" padding={20} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto",
            padding: "12px 18px", background: activeStyle.tint,
            border: `1px solid ${activeStyle.border}`, borderRadius: "var(--radius-xl)",
          }}>
            <span style={{
              width: 42, height: 42, borderRadius: "var(--radius-lg)",
              background: activeStyle.color, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon name="crown" size={20} />
            </span>
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: 500 }}>Paket aktif</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 800, color: activeStyle.color, marginTop: 2 }}>{sub.plan_name}</div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 1 }}>
                {sub.current_period_end ? `Aktif hingga ${formatDate(sub.current_period_end)}` : "Paket gratis"}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="sparkles" size={12} style={{ color: "var(--primary)" }} />
                  Kuota generate bulan ini
                </span>
                <span className="aigt-mono" style={{ fontSize: 11, fontWeight: 600 }}>
                  {usage.generate_used} / {usage.generate_limit}
                </span>
              </div>
              <ProgressBar value={generatePct} color="primary" height={6} />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="database" size={12} style={{ color: "var(--muted-foreground)" }} />
                  Storage riwayat
                </span>
                <span className="aigt-mono" style={{ fontSize: 11, fontWeight: 600 }}>
                  {usage.history_used} / {usage.history_limit === -1 ? "∞" : `${usage.history_limit} slot`}
                </span>
              </div>
              <ProgressBar value={storagePct} color="primary" height={6} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "0 0 auto" }}>
            <Link href="/billing">
              <Button size="sm" variant="ghost" icon="file-text">Riwayat tagihan</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* ── Pilih paket ── */}
      <div style={{ marginBottom: 10 }}>
        <h2 className="aigt-h5" style={{ marginBottom: 4 }}>Pilih Paket</h2>
        <div style={{ height: 1, background: "var(--border)", marginBottom: 20 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {plans.map((plan) => {
          const style = PLAN_STYLE[plan.id] ?? PLAN_STYLE.starter;
          const isCurrent = plan.id === sub.plan_id;
          const isFree = plan.price <= 0;
          return (
            <div key={plan.id} style={{ position: "relative" }}>
              <Card
                variant="elevated"
                padding={20}
                style={{
                  border: `1.5px solid ${isCurrent ? style.border : "var(--border)"}`,
                  background: isCurrent ? style.tint : "var(--card)",
                  display: "flex", flexDirection: "column", gap: 0, height: "100%",
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: style.color, marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", color: "var(--foreground)" }}>{fmt(plan.price)}</span>
                    {!isFree && <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: 500 }}>/ bulan</span>}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, marginBottom: 20 }}>
                  {planFeatures(plan).map((f) => (
                    <div key={f.label} style={{
                      display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-xs)",
                      color: f.ok ? "var(--foreground)" : "var(--muted-foreground)", opacity: f.ok ? 1 : 0.5,
                    }}>
                      <Icon name={f.ok ? "check" : "x"} size={13} style={{ color: f.ok ? style.color : "var(--muted-foreground)", flexShrink: 0 }} />
                      {f.label}
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "9px 14px", borderRadius: "var(--radius-lg)",
                    background: "color-mix(in oklch, var(--primary) 10%, var(--card))",
                    border: "1px solid color-mix(in oklch, var(--primary) 25%, transparent)",
                    fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--primary)",
                  }}>
                    <Icon name="check-circle-2" size={14} />
                    Paket aktif
                  </div>
                ) : isFree ? (
                  <Button
                    size="sm" variant="outline" style={{ width: "100%" }}
                    onClick={() => toast({ title: "Downgrade ke Starter?", desc: "Hubungi support untuk proses ini.", variant: "warning" })}
                  >
                    Pilih Starter
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    style={{ width: "100%", background: style.color, borderColor: style.color }}
                    icon="arrow-up-circle"
                    disabled={processing === plan.id}
                    onClick={() => startOrder({ plan_id: plan.id }, plan.id)}
                  >
                    {processing === plan.id ? "Memproses…" : `Pilih ${plan.name}`}
                  </Button>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* ── Tambah Storage Add-on ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 className="aigt-h5">Tambah Storage</h2>
          <Badge variant="secondary" icon="database">Add-on</Badge>
        </div>
        <div style={{ height: 1, background: "var(--border)", marginBottom: 4 }} />
        <div className="aigt-caption" style={{ marginBottom: 20 }}>
          Tambah slot riwayat tanpa ganti paket. Add-on aktif selama paket Pro atau Business aktif.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 12 }}>
        {addons.map((addon) => {
          const isSelected = selectedAddon === addon.id;
          return (
            <button
              key={addon.id}
              onClick={() => setSelectedAddon(isSelected ? null : addon.id)}
              style={{
                padding: "18px 16px", borderRadius: "var(--radius-xl)", textAlign: "left",
                border: `1.5px solid ${isSelected ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                background: isSelected ? "var(--tint-primary)" : "var(--card)",
                cursor: "pointer", fontFamily: "var(--font-sans)",
                display: "flex", flexDirection: "column", gap: 8, transition: "all .15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  width: 34, height: 34, borderRadius: "var(--radius-md)",
                  background: isSelected ? "color-mix(in oklch, var(--primary) 15%, transparent)" : "var(--surface-sunken)",
                  border: `1px solid ${isSelected ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`,
                  color: isSelected ? "var(--primary)" : "var(--muted-foreground)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name="hard-drive" size={15} />
                </span>
                {isSelected && <Icon name="check-circle-2" size={17} style={{ color: "var(--primary)" }} />}
              </div>
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: isSelected ? "var(--primary)" : "var(--foreground)" }}>{addon.name}</div>
                <div className="aigt-caption" style={{ marginTop: 2 }}>+{addon.extra_slots} slot riwayat</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: isSelected ? "var(--primary)" : "var(--foreground)" }}>{fmt(addon.price)}</span>
                <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500 }}>/ bulan</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedAddon && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
          background: "var(--card)", border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)",
          borderRadius: "var(--radius-xl)", marginBottom: 12,
          boxShadow: "0 4px 24px color-mix(in oklch, var(--primary) 10%, transparent)",
        }}>
          <Icon name="database" size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: "var(--text-xs)", fontWeight: 500 }}>
            Add-on <strong style={{ color: "var(--primary)" }}>{addons.find((a) => a.id === selectedAddon)?.name}</strong> dipilih ·{" "}
            {fmt(addons.find((a) => a.id === selectedAddon)?.price ?? 0)} / bulan
          </div>
          <Button
            icon="building-2"
            disabled={processing === selectedAddon}
            onClick={() => startOrder({ addon_id: selectedAddon }, selectedAddon)}
          >
            {processing === selectedAddon ? "Memproses…" : "Bayar sekarang"}
          </Button>
          <button
            onClick={() => setSelectedAddon(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 4 }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {/* ── Info note ── */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px",
        background: "color-mix(in oklch, var(--info) 8%, var(--card))",
        border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)",
        borderRadius: "var(--radius-lg)", marginBottom: 32,
        fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.6,
      }}>
        <Icon name="info" size={13} style={{ color: "var(--info)", flexShrink: 0, marginTop: 1 }} />
        <div>
          Pembayaran lewat <strong style={{ color: "var(--foreground)" }}>transfer manual BCA</strong>. Paket aktif otomatis
          setelah bukti transfer diverifikasi tim kami. Pertanyaan tagihan: <strong style={{ color: "var(--foreground)" }}>support@aigt.id</strong>.
        </div>
      </div>
    </Shell>
  );
}
