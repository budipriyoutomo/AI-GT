"use client";

import { useState } from "react";
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

/* ── Data ─────────────────────────────────────────────────── */

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: null,
    priceLabel: "Gratis",
    period: "",
    desc: "Untuk kamu yang baru mulai eksplorasi AI content.",
    color: "var(--muted-foreground)",
    tint: "var(--surface-sunken)",
    border: "var(--border)",
    features: [
      { label: "20 generate / bulan",         ok: true  },
      { label: "20 slot riwayat",              ok: true  },
      { label: "1 profil bisnis",              ok: true  },
      { label: "Galeri template dasar",        ok: true  },
      { label: "Thematic image AI",            ok: false },
      { label: "Export tanpa watermark",       ok: false },
      { label: "Tambah storage add-on",        ok: false },
      { label: "Priority support",             ok: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99000,
    priceLabel: "Rp 99.000",
    period: "/ bulan",
    desc: "Paling populer untuk UMKM aktif yang rutin posting.",
    color: "var(--primary)",
    tint: "var(--tint-primary)",
    border: "color-mix(in oklch, var(--primary) 40%, transparent)",
    badge: "Paket kamu",
    features: [
      { label: "80 generate / bulan",          ok: true  },
      { label: "50 slot riwayat",              ok: true  },
      { label: "3 profil bisnis",              ok: true  },
      { label: "Galeri template lengkap",      ok: true  },
      { label: "Thematic image AI",            ok: true  },
      { label: "Export tanpa watermark",       ok: true  },
      { label: "Tambah storage add-on",        ok: true  },
      { label: "Priority support",             ok: false },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 249000,
    priceLabel: "Rp 249.000",
    period: "/ bulan",
    desc: "Untuk agensi dan brand dengan volume konten tinggi.",
    color: "var(--chart-4)",
    tint: "color-mix(in oklch, var(--chart-4) 10%, var(--card))",
    border: "color-mix(in oklch, var(--chart-4) 35%, transparent)",
    features: [
      { label: "300 generate / bulan",         ok: true  },
      { label: "Riwayat tidak terbatas",       ok: true  },
      { label: "10 profil bisnis",             ok: true  },
      { label: "Galeri template lengkap",      ok: true  },
      { label: "Thematic image AI",            ok: true  },
      { label: "Export tanpa watermark",       ok: true  },
      { label: "Tambah storage add-on",        ok: true  },
      { label: "Priority support",             ok: true  },
    ],
  },
];

const STORAGE_ADDONS = [
  { id: "s50",  label: "+50 slot",  price: "Rp 15.000", period: "/ bulan", desc: "Untuk kebutuhan ringan" },
  { id: "s200", label: "+200 slot", price: "Rp 45.000", period: "/ bulan", desc: "Paling populer"         },
  { id: "s500", label: "+500 slot", price: "Rp 90.000", period: "/ bulan", desc: "Stok konten 1 tahun+"   },
];

const CURRENT_PLAN   = "pro";
const GENERATE_USED  = 52;
const GENERATE_LIMIT = 80;
const STORAGE_USED   = 12;
const STORAGE_LIMIT  = 50;

/* ── Page ─────────────────────────────────────────────────── */

const ADDON_PRICES: Record<string, number> = { s50: 15000, s200: 45000, s500: 90000 };
const PLAN_PRICES:  Record<string, number> = { business: 249000, pro: 99000 };

export default function SubscriptionPage() {
  const router = useRouter();
  const [selectedAddon, setSelectedAddon] = useState<string | null>(null);

  const generatePct = Math.round((GENERATE_USED / GENERATE_LIMIT) * 100);
  const storagePct  = Math.round((STORAGE_USED  / STORAGE_LIMIT)  * 100);

  return (
    <Shell active="settings" title="Subscription">
      <PageHead
        title="Paket & Langganan"
        subtitle="Kelola paket aktif, kuota generate, dan storage riwayat kamu."
      />

      {/* ── Status paket aktif ── */}
      <Card variant="elevated" padding={20} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>

          {/* Plan badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto",
            padding: "12px 18px",
            background: "var(--tint-primary)",
            border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)",
            borderRadius: "var(--radius-xl)",
          }}>
            <span style={{
              width: 42, height: 42, borderRadius: "var(--radius-lg)",
              background: "var(--primary)", color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon name="crown" size={20} />
            </span>
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: 500 }}>Paket aktif</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--primary)", marginTop: 2 }}>Pro</div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 1 }}>Aktif hingga 30 Juli 2026</div>
            </div>
          </div>

          {/* Quotas */}
          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="sparkles" size={12} style={{ color: "var(--primary)" }} />
                  Kuota generate bulan ini
                </span>
                <span className="aigt-mono" style={{ fontSize: 11, fontWeight: 600 }}>
                  {GENERATE_USED} / {GENERATE_LIMIT}
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
                  {STORAGE_USED} / {STORAGE_LIMIT} slot
                </span>
              </div>
              <ProgressBar value={storagePct} color="primary" height={6} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "0 0 auto" }}>
            <Link href="/billing">
              <Button size="sm" variant="ghost" icon="file-text">
                Riwayat tagihan
              </Button>
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
        {PLANS.map((plan) => {
          const isCurrent = plan.id === CURRENT_PLAN;
          return (
            <div key={plan.id} style={{ position: "relative" }}>
              {plan.badge && (
                <div style={{
                  position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                  zIndex: 2, whiteSpace: "nowrap",
                }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 12px", borderRadius: 999,
                    background: plan.color, color: "#fff",
                    fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
                  }}>
                    <Icon name="check-circle-2" size={11} />
                    {plan.badge}
                  </span>
                </div>
              )}
              <Card
                variant="elevated"
                padding={20}
                style={{
                  border: `1.5px solid ${isCurrent ? plan.border : "var(--border)"}`,
                  background: isCurrent ? plan.tint : "var(--card)",
                  display: "flex", flexDirection: "column", gap: 0, height: "100%",
                }}
              >
                {/* Header */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: plan.color, marginBottom: 4 }}>
                    {plan.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", color: "var(--foreground)" }}>
                      {plan.priceLabel}
                    </span>
                    {plan.period && (
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: 500 }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <div className="aigt-caption" style={{ marginTop: 6 }}>{plan.desc}</div>
                </div>

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, marginBottom: 20 }}>
                  {plan.features.map((f) => (
                    <div key={f.label} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: "var(--text-xs)",
                      color: f.ok ? "var(--foreground)" : "var(--muted-foreground)",
                      opacity: f.ok ? 1 : 0.5,
                    }}>
                      <Icon
                        name={f.ok ? "check" : "x"}
                        size={13}
                        style={{ color: f.ok ? plan.color : "var(--muted-foreground)", flexShrink: 0 }}
                      />
                      {f.label}
                    </div>
                  ))}
                </div>

                {/* CTA */}
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
                ) : plan.id === "starter" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    style={{ width: "100%" }}
                    onClick={() => toast({ title: "Downgrade ke Starter?", desc: "Hubungi support untuk proses ini.", variant: "warning" })}
                  >
                    Pilih Starter
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    style={{ width: "100%", background: plan.color, borderColor: plan.color }}
                    icon="arrow-up-circle"
                    onClick={() => router.push(`/payment?type=plan&item=${plan.id}&price=${PLAN_PRICES[plan.id] ?? 0}`)}
                  >
                    Upgrade ke {plan.name}
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
        {STORAGE_ADDONS.map((addon) => {
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
                display: "flex", flexDirection: "column", gap: 8,
                transition: "all .15s ease",
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
                {isSelected && (
                  <Icon name="check-circle-2" size={17} style={{ color: "var(--primary)" }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: isSelected ? "var(--primary)" : "var(--foreground)" }}>
                  {addon.label}
                </div>
                <div className="aigt-caption" style={{ marginTop: 2 }}>{addon.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: isSelected ? "var(--primary)" : "var(--foreground)" }}>
                  {addon.price}
                </span>
                <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500 }}>{addon.period}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedAddon && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 18px",
          background: "var(--card)",
          border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)",
          borderRadius: "var(--radius-xl)",
          marginBottom: 12,
          boxShadow: "0 4px 24px color-mix(in oklch, var(--primary) 10%, transparent)",
        }}>
          <Icon name="database" size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: "var(--text-xs)", fontWeight: 500 }}>
            Add-on <strong style={{ color: "var(--primary)" }}>
              {STORAGE_ADDONS.find((a) => a.id === selectedAddon)?.label}
            </strong> dipilih ·{" "}
            {STORAGE_ADDONS.find((a) => a.id === selectedAddon)?.price}{" "}
            {STORAGE_ADDONS.find((a) => a.id === selectedAddon)?.period}
          </div>
          <Button
            icon="credit-card"
            onClick={() => {
              if (!selectedAddon) return;
              const addon = STORAGE_ADDONS.find((a) => a.id === selectedAddon);
              router.push(
                `/payment?type=addon&item=${selectedAddon}&price=${ADDON_PRICES[selectedAddon] ?? 0}&label=${encodeURIComponent(addon?.label ?? "Add-on Storage")}`
              );
              setSelectedAddon(null);
            }}
          >
            Bayar sekarang
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
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "12px 16px",
        background: "color-mix(in oklch, var(--info) 8%, var(--card))",
        border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)",
        borderRadius: "var(--radius-lg)",
        marginBottom: 32,
        fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.6,
      }}>
        <Icon name="info" size={13} style={{ color: "var(--info)", flexShrink: 0, marginTop: 1 }} />
        <div>
          Pembayaran diproses via Midtrans. Paket diperbarui otomatis setelah pembayaran dikonfirmasi.
          Untuk pertanyaan tagihan, hubungi <strong style={{ color: "var(--foreground)" }}>support@aigt.id</strong>.
        </div>
      </div>

    </Shell>
  );
}
