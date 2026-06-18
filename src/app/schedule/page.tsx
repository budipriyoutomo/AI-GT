"use client";

import { useState, useMemo } from "react";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";

/* ─── Data ───────────────────────────────────────────────── */

type ScheduledItem = {
  id: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  title: string;
  kicker: string;
  platform: "instagram" | "whatsapp" | "facebook" | "tiktok";
  type: "Single" | "Carousel";
  accent: string;
  status: "Scheduled" | "Publishing" | "Done";
};

const SCHEDULED: ScheduledItem[] = [
  { id: "SCH-001", date: "2026-06-19", time: "09:00", title: "Flash Sale Weekend", kicker: "Flash Sale", platform: "instagram", type: "Single", accent: "--chart-1", status: "Scheduled" },
  { id: "SCH-002", date: "2026-06-20", time: "10:00", title: "Promo Senin Hemat 15%", kicker: "Monday Deal", platform: "whatsapp", type: "Single", accent: "--chart-2", status: "Scheduled" },
  { id: "SCH-003", date: "2026-06-20", time: "18:00", title: "Quote Sore: Nikmati Prosesnya", kicker: "Daily Quote", platform: "instagram", type: "Single", accent: "--chart-4", status: "Scheduled" },
  { id: "SCH-004", date: "2026-06-22", time: "09:00", title: "Diskon Mingguan 20%", kicker: "Weekend Sale", platform: "instagram", type: "Carousel", accent: "--chart-3", status: "Scheduled" },
  { id: "SCH-005", date: "2026-06-25", time: "12:00", title: "Highlight Menu Terbaru", kicker: "New Arrival", platform: "facebook", type: "Single", accent: "--chart-5", status: "Scheduled" },
  { id: "SCH-006", date: "2026-06-26", time: "08:00", title: "Morning Brew Quote", kicker: "Good Morning", platform: "instagram", type: "Single", accent: "--chart-1", status: "Scheduled" },
  { id: "SCH-007", date: "2026-06-28", time: "11:00", title: "Reminder: Promo Akhir Bulan", kicker: "Last Chance", platform: "whatsapp", type: "Single", accent: "--chart-2", status: "Scheduled" },
  { id: "SCH-008", date: "2026-07-01", time: "09:00", title: "Selamat Datang Juli 🎉", kicker: "New Month", platform: "instagram", type: "Carousel", accent: "--chart-4", status: "Scheduled" },
  { id: "SCH-009", date: "2026-07-03", time: "15:00", title: "Promo Kopi Spesial Juli", kicker: "Special Offer", platform: "instagram", type: "Single", accent: "--chart-3", status: "Scheduled" },
];

/* ─── Helpers ────────────────────────────────────────────── */

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "var(--chart-4)",
  whatsapp: "var(--chart-2)",
  facebook: "var(--chart-1)",
  tiktok: "var(--chart-5)",
};

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: { date: string; day: number; cur: boolean }[] = [];

  // leading cells from prev month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: toKey(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, daysInPrev - i), day: daysInPrev - i, cur: false });
  }
  // current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toKey(year, month, d), day: d, cur: true });
  }
  // trailing cells
  const rem = 7 - (cells.length % 7);
  if (rem < 7) {
    for (let d = 1; d <= rem; d++) {
      cells.push({ date: toKey(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, d), day: d, cur: false });
    }
  }
  return cells;
}

/* ─── Sub-components ─────────────────────────────────────── */

function PlatformDot({ platform }: { platform: string }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
      background: PLATFORM_COLOR[platform] ?? "var(--primary)",
      display: "inline-block",
    }} />
  );
}

function EventChip({ item }: { item: ScheduledItem }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "2px 5px", borderRadius: "var(--radius-sm)",
      background: `color-mix(in oklch, ${PLATFORM_COLOR[item.platform]} 15%, transparent)`,
      fontSize: 10, fontWeight: 500, lineHeight: 1.4,
      overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
      color: "var(--foreground)", cursor: "default",
    }}>
      <PlatformDot platform={item.platform} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.time} {item.title}</span>
    </div>
  );
}

function ScheduleRow({ item, onEdit }: { item: ScheduledItem; onEdit: (item: ScheduledItem) => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      background: "var(--card)",
    }}>
      {/* time */}
      <div style={{
        width: 48, flexShrink: 0, textAlign: "center",
        fontSize: "var(--text-xs)", fontWeight: 700,
        fontFamily: "var(--font-mono)", color: "var(--primary)",
      }}>
        {item.time}
      </div>
      {/* divider */}
      <div style={{ width: 1, height: 32, background: "var(--border)", flexShrink: 0 }} />
      {/* info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.title}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <Badge variant="secondary" icon={item.platform}>{PLATFORM_LABEL[item.platform]}</Badge>
          <Badge variant="outline">{item.type}</Badge>
        </div>
      </div>
      {/* status */}
      <Badge variant={item.status === "Done" ? "success" : item.status === "Publishing" ? "info" : "warning"} dot>
        {item.status === "Done" ? "Selesai" : item.status === "Publishing" ? "Sedang tayang" : "Terjadwal"}
      </Badge>
      {/* actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button className="aigt-iconbtn" title="Edit" onClick={() => onEdit(item)}>
          <Icon name="pencil" size={14} />
        </button>
        <button
          className="aigt-iconbtn"
          title="Batalkan jadwal"
          onClick={() => toast({ title: "Jadwal dibatalkan", desc: item.title, variant: "warning" })}
        >
          <Icon name="trash-2" size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

const TODAY = "2026-06-19";

export default function SchedulePage() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5); // June = 5 (0-indexed)
  const [selected, setSelected] = useState<string>(TODAY);
  const [editItem, setEditItem] = useState<ScheduledItem | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const cells = useMemo(() => buildCalendar(year, month), [year, month]);

  // Map date → items
  const byDate = useMemo(() => {
    const map: Record<string, ScheduledItem[]> = {};
    for (const item of SCHEDULED) {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    }
    return map;
  }, []);

  // Items for list view: all scheduled sorted by date+time
  const listGroups = useMemo(() => {
    const sorted = [...SCHEDULED].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const groups: { label: string; date: string; items: ScheduledItem[] }[] = [];
    for (const item of sorted) {
      const last = groups[groups.length - 1];
      if (last?.date === item.date) {
        last.items.push(item);
      } else {
        const d = new Date(item.date + "T00:00:00");
        const label = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        groups.push({ label, date: item.date, items: [item] });
      }
    }
    return groups;
  }, []);

  const selectedItems = byDate[selected] ?? [];
  const selectedLabel = selected
    ? new Date(selected + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  }

  return (
    <Shell
      active="schedule"
      title="Jadwal"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: "inline-flex", gap: 2, padding: 3, background: "var(--surface-sunken)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
            {(["calendar", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="aigt-iconbtn"
                style={{
                  width: 30, height: 30,
                  background: view === v ? "var(--card)" : "transparent",
                  color: view === v ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: view === v ? "var(--shadow-xs)" : undefined,
                  borderRadius: "var(--radius-md)",
                }}
                title={v === "calendar" ? "Tampilan kalender" : "Tampilan daftar"}
              >
                <Icon name={v === "calendar" ? "calendar-days" : "list"} size={15} />
              </button>
            ))}
          </div>
          <Button icon="plus" onClick={() => setNewModalOpen(true)}>Jadwalkan konten</Button>
        </div>
      }
    >
      <PageHead
        title="Jadwal Konten"
        subtitle={`${SCHEDULED.length} konten terjadwal · ${SCHEDULED.filter(s => s.status === "Done").length} sudah tayang`}
      />

      {/* ── CALENDAR VIEW ─────────────────────────────────── */}
      {view === "calendar" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

          {/* Calendar */}
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", background: "var(--card)", overflow: "hidden" }}>
            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <button className="aigt-iconbtn" onClick={prevMonth}><Icon name="chevron-left" size={16} /></button>
              <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: "var(--text-base)" }}>
                {MONTH_NAMES[month]} {year}
              </span>
              <button className="aigt-iconbtn" onClick={nextMonth}><Icon name="chevron-right" size={16} /></button>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "8px 12px 4px" }}>
              {DAY_NAMES.map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: "var(--text-2xs)", fontWeight: 600, color: "var(--muted-foreground)", padding: "4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, padding: "0 12px 12px" }}>
              {cells.map((cell) => {
                const events = byDate[cell.date] ?? [];
                const isToday = cell.date === TODAY;
                const isSelected = cell.date === selected;
                const hasEvents = events.length > 0;

                return (
                  <div
                    key={cell.date}
                    onClick={() => setSelected(cell.date)}
                    style={{
                      minHeight: 72, borderRadius: "var(--radius-md)", padding: "6px 6px 4px",
                      background: isSelected ? "var(--tint-primary)" : isToday ? "color-mix(in oklch, var(--primary) 6%, transparent)" : "transparent",
                      border: isSelected ? "1.5px solid color-mix(in oklch, var(--primary) 40%, transparent)" : "1.5px solid transparent",
                      cursor: "pointer", transition: "background 0.12s ease",
                      opacity: cell.cur ? 1 : 0.35,
                    }}
                  >
                    {/* Day number */}
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "var(--text-xs)", fontWeight: isToday ? 700 : 500,
                      background: isToday ? "var(--primary)" : "transparent",
                      color: isToday ? "var(--primary-foreground)" : isSelected ? "var(--primary)" : "var(--foreground)",
                      marginBottom: 4,
                    }}>
                      {cell.day}
                    </div>

                    {/* Event chips (max 2, then "+N more") */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {events.slice(0, 2).map((ev) => (
                        <EventChip key={ev.id} item={ev} />
                      ))}
                      {events.length > 2 && (
                        <div style={{ fontSize: 10, color: "var(--primary)", fontWeight: 600, paddingLeft: 2 }}>
                          +{events.length - 2} lagi
                        </div>
                      )}
                      {hasEvents && events.length === 0 && (
                        <PlatformDot platform="instagram" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", background: "var(--card)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>{selectedLabel || "Pilih tanggal"}</div>
              <div className="aigt-caption" style={{ marginTop: 2 }}>
                {selectedItems.length === 0 ? "Tidak ada konten terjadwal" : `${selectedItems.length} konten`}
              </div>
            </div>

            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
              {selectedItems.length === 0 ? (
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, color: "var(--muted-foreground)", padding: "24px 0",
                }}>
                  <Icon name="calendar-off" size={28} style={{ opacity: 0.35 }} />
                  <div style={{ fontSize: "var(--text-xs)", textAlign: "center" }}>Belum ada konten terjadwal<br />untuk tanggal ini</div>
                  <Button size="sm" variant="outline" icon="plus" onClick={() => setNewModalOpen(true)}>
                    Jadwalkan
                  </Button>
                </div>
              ) : (
                selectedItems.map((item) => (
                  <div key={item.id} style={{
                    padding: "10px 12px", borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border)", background: "var(--surface-sunken)",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: "var(--text-xs)", fontWeight: 700, fontFamily: "var(--font-mono)",
                        color: "var(--primary)", flexShrink: 0,
                      }}>{item.time}</span>
                      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <PlatformDot platform={item.platform} />
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{PLATFORM_LABEL[item.platform]}</span>
                      <Badge variant="outline" style={{ fontSize: 10 }}>{item.type}</Badge>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                        <button className="aigt-iconbtn" style={{ width: 24, height: 24 }} onClick={() => setEditItem(item)}>
                          <Icon name="pencil" size={12} />
                        </button>
                        <button
                          className="aigt-iconbtn"
                          style={{ width: 24, height: 24 }}
                          onClick={() => toast({ title: "Jadwal dibatalkan", desc: item.title, variant: "warning" })}
                        >
                          <Icon name="trash-2" size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedItems.length > 0 && (
              <div style={{ padding: "0 12px 12px" }}>
                <Button size="sm" variant="outline" icon="plus" style={{ width: "100%" }} onClick={() => setNewModalOpen(true)}>
                  Tambah ke tanggal ini
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────── */}
      {view === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
          {listGroups.map((group) => (
            <div key={group.date}>
              {/* Date label */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "var(--radius-md)", flexShrink: 0,
                  background: group.date === TODAY ? "var(--primary)" : "var(--secondary)",
                  color: group.date === TODAY ? "var(--primary-foreground)" : "var(--foreground)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, lineHeight: 1.2,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>
                    {new Date(group.date + "T00:00:00").getDate()}
                  </span>
                  <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8 }}>
                    {MONTH_NAMES[new Date(group.date + "T00:00:00").getMonth()].slice(0, 3)}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>{group.label}</div>
                  <div className="aigt-caption">{group.items.length} konten terjadwal</div>
                </div>
                {group.date === TODAY && (
                  <Badge variant="info" dot>Hari ini</Badge>
                )}
              </div>

              {/* Events */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 46 }}>
                {group.items.map((item) => (
                  <ScheduleRow key={item.id} item={item} onEdit={setEditItem} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: Edit jadwal ────────────────────────────── */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Jadwal"
        icon="calendar-clock"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditItem(null)}>Batal</Button>
            <Button onClick={() => { toast({ title: "Jadwal diperbarui", variant: "success" }); setEditItem(null); }}>
              Simpan
            </Button>
          </>
        }
      >
        {editItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "10px 12px", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", fontWeight: 600 }}>
              {editItem.title}
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "block", marginBottom: 6 }}>Tanggal tayang</label>
              <input
                type="date"
                defaultValue={editItem.date}
                style={{
                  width: "100%", height: 36, padding: "0 12px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                  background: "var(--surface-sunken)", color: "var(--foreground)",
                  fontSize: "var(--text-sm)", outline: "none", fontFamily: "var(--font-sans)",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "block", marginBottom: 6 }}>Jam tayang</label>
              <input
                type="time"
                defaultValue={editItem.time}
                style={{
                  width: "100%", height: 36, padding: "0 12px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                  background: "var(--surface-sunken)", color: "var(--foreground)",
                  fontSize: "var(--text-sm)", outline: "none", fontFamily: "var(--font-mono)",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Badge variant="secondary" icon={editItem.platform}>{PLATFORM_LABEL[editItem.platform]}</Badge>
              <Badge variant="outline">{editItem.type}</Badge>
              <Badge variant="warning" dot>Terjadwal</Badge>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: Jadwalkan konten baru ─────────────────── */}
      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Jadwalkan Konten"
        icon="calendar-plus"
        footer={
          <>
            <Button variant="outline" onClick={() => setNewModalOpen(false)}>Batal</Button>
            <Button onClick={() => { toast({ title: "Konten dijadwalkan!", variant: "success" }); setNewModalOpen(false); }}>
              Jadwalkan
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            padding: "10px 14px", border: "1px dashed color-mix(in oklch, var(--primary) 40%, var(--border))",
            borderRadius: "var(--radius-md)", background: "var(--tint-primary)",
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          }}>
            <Icon name="image-plus" size={18} style={{ color: "var(--primary)" }} />
            <div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--primary)" }}>Pilih konten dari Riwayat</div>
              <div className="aigt-caption">Atau generate konten baru terlebih dahulu</div>
            </div>
            <Icon name="chevron-right" size={14} style={{ color: "var(--primary)", marginLeft: "auto" }} />
          </div>

          <div>
            <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "block", marginBottom: 6 }}>Tanggal tayang</label>
            <input
              type="date"
              defaultValue={selected || TODAY}
              style={{
                width: "100%", height: 36, padding: "0 12px",
                border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                background: "var(--surface-sunken)", color: "var(--foreground)",
                fontSize: "var(--text-sm)", outline: "none", fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "block", marginBottom: 6 }}>Jam tayang</label>
            <input
              type="time"
              defaultValue="09:00"
              style={{
                width: "100%", height: 36, padding: "0 12px",
                border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                background: "var(--surface-sunken)", color: "var(--foreground)",
                fontSize: "var(--text-sm)", outline: "none", fontFamily: "var(--font-mono)",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "block", marginBottom: 8 }}>Platform</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["instagram", "whatsapp", "facebook", "tiktok"] as const).map((p) => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked={p === "instagram"} style={{ accentColor: "var(--primary)" }} />
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>{PLATFORM_LABEL[p]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
