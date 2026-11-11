"use client";

import { ReactNode, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "@/components/ui/toast";
import { adminApi, type AdminUserDetail } from "@/api/adminApi";
import { formatDateTime } from "./orderFormat";
import { SubscriptionManager } from "./SubscriptionManager";

type Mode = "idle" | "suspending" | "deleting" | "subscription";

const MAX_REASON = 500;

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
  /** Dipanggil setelah suspend/unsuspend/hapus berhasil — induk memuat ulang daftar. */
  onChanged: () => void;
}

const fieldStyle = {
  padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
  background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)",
  fontFamily: "var(--font-sans)", outline: "none",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "6px 0" }}>
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span style={{ textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
        <span>{unlimited ? `${used} / ∞` : `${used} / ${limit}`}</span>
      </div>
      {!unlimited && <ProgressBar value={limit ? (used / limit) * 100 : 0} height={6} />}
    </div>
  );
}

export function UserDetailModal({ userId, onClose, onChanged }: UserDetailModalProps) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    adminApi.getUser(userId)
      .then((u) => { if (alive) setUser(u); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [userId]);

  async function run(action: () => Promise<AdminUserDetail | null>, success: string) {
    setBusy(true);
    try {
      const updated = await action();
      toast({ title: success, variant: "success" });
      setMode("idle");
      setReason("");
      if (updated) setUser(updated);
      onChanged();
      if (!updated) onClose();
    } catch (err) {
      toast({
        title: "Aksi gagal",
        desc: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  // Superadmin tak bisa ditindak dari panel; aturan lain (diri sendiri, admin vs
  // superadmin) ditegakkan backend dan muncul sebagai toast error.
  const manageable = user !== null && user.role !== "superadmin";
  const emailMatches = user !== null && confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  let footer: ReactNode = null;
  if (user && manageable && mode === "idle") {
    footer = (
      <>
        <Button variant="ghost" onClick={() => setMode("deleting")}>Hapus user</Button>
        <Button variant="outline" onClick={() => setMode("subscription")}>Kelola langganan</Button>
        {user.is_active ? (
          <Button variant="outline" onClick={() => setMode("suspending")}>Suspend</Button>
        ) : (
          <Button
            disabled={busy}
            onClick={() => run(() => adminApi.unsuspendUser(user.id), "User diaktifkan lagi.")}
          >
            Aktifkan lagi
          </Button>
        )}
      </>
    );
  } else if (user && mode === "suspending") {
    footer = (
      <>
        <Button variant="ghost" disabled={busy} onClick={() => setMode("idle")}>Batal</Button>
        <Button
          variant="destructive"
          disabled={busy || !reason.trim()}
          onClick={() => run(() => adminApi.suspendUser(user.id, reason.trim()), "User disuspend.")}
        >
          {busy ? "Memproses…" : "Suspend sekarang"}
        </Button>
      </>
    );
  } else if (user && mode === "deleting") {
    footer = (
      <>
        <Button variant="ghost" disabled={busy} onClick={() => setMode("idle")}>Batal</Button>
        <Button
          variant="destructive"
          disabled={busy || !emailMatches}
          onClick={() => run(() => adminApi.deleteUser(user.id, confirmEmail.trim()), "User dihapus.")}
        >
          {busy ? "Menghapus…" : "Hapus permanen"}
        </Button>
      </>
    );
  }

  return (
    <Modal open onClose={onClose} title="Detail User" icon="user" footer={footer}>
      {failed && <div className="aigt-caption">Gagal memuat detail user.</div>}
      {!failed && !user && <div className="aigt-caption">Memuat…</div>}

      {user && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Row label="Nama">{user.name}</Row>
            <Row label="Email">{user.email}</Row>
            <Row label="Role">{user.role}</Row>
            <Row label="Status">
              {user.is_active
                ? <Badge variant="success">Aktif</Badge>
                : <Badge variant="destructive">Disuspend</Badge>}
            </Row>
            {!user.is_active && user.suspended_at && (
              <Row label="Disuspend">{formatDateTime(user.suspended_at)}</Row>
            )}
            {!user.is_active && user.suspended_reason && <Row label="Alasan">{user.suspended_reason}</Row>}
            <Row label="Terdaftar">{formatDateTime(user.created_at)}</Row>
          </div>

          <div>
            <div className="aigt-h6" style={{ marginBottom: 4 }}>Profil bisnis</div>
            {user.company_profile ? (
              <>
                <Row label="Nama bisnis">{user.company_profile.business_name}</Row>
                <Row label="Industri">{user.company_profile.industry}</Row>
              </>
            ) : <div className="aigt-caption">Belum membuat profil bisnis.</div>}
          </div>

          <div>
            <div className="aigt-h6" style={{ marginBottom: 4 }}>Langganan</div>
            <Row label="Paket">{user.subscription.plan_name}</Row>
            {user.subscription.storage_addon_id && <Row label="Add-on">{user.subscription.storage_addon_id}</Row>}
            {user.subscription.current_period_end && (
              <Row label="Berlaku sampai">{formatDateTime(user.subscription.current_period_end)}</Row>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="aigt-h6">Pemakaian</div>
            <Usage label="Generate bulan ini" used={user.usage.generate_used} limit={user.usage.generate_limit} />
            <Usage label="Project tersimpan" used={user.usage.history_used} limit={user.usage.history_limit} />
          </div>

          {mode === "subscription" && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <SubscriptionManager
                user={user}
                onCancel={() => setMode("idle")}
                onUpdated={(updated) => {
                  setUser(updated);
                  setMode("idle");
                  onChanged();
                }}
              />
            </div>
          )}

          {mode === "suspending" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="aigt-h6">Alasan suspend</span>
              <textarea
                aria-label="Alasan suspend"
                value={reason}
                maxLength={MAX_REASON}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Mis. penyalahgunaan generate, laporan spam…"
                style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
              />
              <span className="aigt-caption">
                Hanya terlihat admin. User langsung ter-logout dan tidak bisa login sampai diaktifkan lagi.
              </span>
            </label>
          )}

          {mode === "deleting" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="aigt-h6">Ketik email user untuk konfirmasi</span>
              <input
                aria-label="Ketik email user untuk konfirmasi"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={user.email}
                autoComplete="off"
                style={fieldStyle}
              />
              <span className="aigt-caption" role="alert">
                Semua project, riwayat generate, profil, langganan, order, dan file milik user ini dihapus permanen.
                Tidak bisa dibatalkan.
              </span>
            </label>
          )}
        </div>
      )}
    </Modal>
  );
}
