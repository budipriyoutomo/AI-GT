"use client";

import { useState } from "react";
import type { DailyGenerate } from "@/api/adminApi";

/**
 * Tren generate harian — kolom bertumpuk "berhasil" (bawah) + "gagal" (atas).
 * Warna = status (baik/buruk), memakai token --chart-good/--chart-bad yang sudah
 * divalidasi dataviz (CVD) untuk mode terang & gelap. Identitas tidak bergantung
 * pada warna saja: legenda + urutan tumpukan + tabel.
 */

const PLOT_HEIGHT = 160;
const MAX_BAR = 16;   // ≤ 24px — sisa slot dibiarkan jadi ruang kosong
const GAP = 2;        // celah permukaan antar-segmen

const SERIES = [
  { key: "completed", label: "Berhasil", color: "var(--chart-good)" },
  { key: "failed",    label: "Gagal",    color: "var(--chart-bad)" },
] as const;

function fmtDay(iso: string) {
  // Tanggal UTC dari backend — format tanpa menggeser zona.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Angka "bulat" ≥ max untuk sumbu Y (1, 2, 5 × 10ⁿ). */
function niceMax(max: number) {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 5, 10]) if (step * pow >= max) return step * pow;
  return 10 * pow;
}

export function GenerateTrendChart({ daily }: { daily: DailyGenerate[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const peak = Math.max(0, ...daily.map((d) => d.completed + d.failed));
  const top = niceMax(peak);
  const scale = (n: number) => (n / top) * PLOT_HEIGHT;
  const empty = peak === 0;

  const toggle = (
    <button
      type="button"
      onClick={() => setAsTable((v) => !v)}
      className="aigt-caption"
      style={{ background: "none", border: 0, cursor: "pointer", textDecoration: "underline", padding: 0 }}
    >
      {asTable ? "Lihat sebagai grafik" : "Lihat sebagai tabel"}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div data-testid="trend-legend" style={{ display: "flex", gap: 14 }}>
          {SERIES.map((s) => (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)" }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        {toggle}
      </div>

      {asTable ? (
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Tanggal (UTC)</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>Berhasil</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>Gagal</th>
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.date} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 8px" }}>{fmtDay(d.date)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{d.completed}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{d.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : empty ? (
        <div className="aigt-caption" style={{ height: PLOT_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
          Belum ada generate dalam 30 hari terakhir.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          {/* Sumbu Y: hanya nilai puncak & tengah — label lain dibawa tooltip/tabel. */}
          <div aria-hidden className="aigt-caption" style={{
            height: PLOT_HEIGHT, display: "flex", flexDirection: "column", justifyContent: "space-between",
            textAlign: "right", minWidth: 24, fontVariantNumeric: "tabular-nums",
          }}>
            <span style={{ lineHeight: 0 }}>{top}</span>
            <span style={{ lineHeight: 0 }}>{top / 2}</span>
            <span style={{ lineHeight: 0 }}>0</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              role="img"
              aria-label={`Tren generate harian 30 hari: total ${daily.reduce((n, d) => n + d.completed, 0)} berhasil, ${daily.reduce((n, d) => n + d.failed, 0)} gagal`}
              style={{
                position: "relative", height: PLOT_HEIGHT, display: "flex", alignItems: "flex-end",
                borderBottom: "1px solid var(--border)",
                // Gridline tengah & atas: hairline, satu langkah dari permukaan.
                backgroundImage: "linear-gradient(var(--border), var(--border)), linear-gradient(var(--border), var(--border))",
                backgroundSize: "100% 1px, 100% 1px",
                backgroundPosition: "0 0, 0 50%",
                backgroundRepeat: "no-repeat",
              }}
            >
              {daily.map((d, i) => {
                const hasFailed = d.failed > 0;
                const hasDone = d.completed > 0;
                return (
                  <div
                    key={d.date}
                    data-testid={`trend-col-${d.date}`}
                    tabIndex={0}
                    aria-label={`${fmtDay(d.date)}: ${d.completed} berhasil, ${d.failed} gagal`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    // Hit target = seluruh tinggi slot, lebih besar dari batangnya.
                    style={{
                      flex: 1, height: "100%", display: "flex", flexDirection: "column-reverse",
                      alignItems: "center", outline: "none", cursor: "default",
                      background: hover === i ? "color-mix(in oklch, var(--foreground) 4%, transparent)" : undefined,
                    }}
                  >
                    {hasDone && (
                      <div style={{
                        width: `min(${MAX_BAR}px, 70%)`, height: scale(d.completed), background: SERIES[0].color,
                        // Ujung data membulat hanya bila ia segmen teratas; dasar selalu siku.
                        borderRadius: hasFailed ? 0 : "4px 4px 0 0",
                      }} />
                    )}
                    {hasDone && hasFailed && <div style={{ height: GAP, flexShrink: 0 }} />}
                    {hasFailed && (
                      <div style={{
                        width: `min(${MAX_BAR}px, 70%)`, height: scale(d.failed), background: SERIES[1].color,
                        borderRadius: "4px 4px 0 0",
                      }} />
                    )}
                  </div>
                );
              })}

              {hover !== null && (
                <div
                  role="tooltip"
                  style={{
                    position: "absolute", top: 0, pointerEvents: "none", zIndex: 1,
                    // Jepit supaya tooltip tidak keluar dari tepi plot.
                    left: `clamp(0px, calc(${((hover + 0.5) / daily.length) * 100}% - 60px), calc(100% - 120px))`,
                    width: 120, padding: "6px 8px", borderRadius: "var(--radius-md)",
                    background: "var(--popover, var(--card))", border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-md)", fontSize: "var(--text-xs)", lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{fmtDay(daily[hover].date)}</div>
                  {SERIES.map((s) => (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                      {s.label}: {daily[hover][s.key]}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div aria-hidden className="aigt-caption" style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span>{fmtDay(daily[0].date)}</span>
              <span>{fmtDay(daily[Math.floor(daily.length / 2)].date)}</span>
              <span>{fmtDay(daily[daily.length - 1].date)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
