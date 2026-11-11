"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { adminApi, type AdminUserDetail } from "@/api/adminApi";
import {
  ADDON_BY_LABEL, ADDON_LABELS, FREE_PLAN_ID, NO_ADDON, PLAN_BY_LABEL, PLAN_LABELS,
} from "./planLabels";

interface SubscriptionManagerProps {
  user: AdminUserDetail;
  onUpdated: (user: AdminUserDetail) => void;
  onCancel: () => void;
}

const MAX_EXTEND_DAYS = 365;

const fieldStyle = {
  height: 36, padding: "0 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
  background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)",
};

/** A-5 — ubah paket / perpanjang / reset kuota, dan beri add-on, untuk satu user. */
export function SubscriptionManager({ user, onUpdated, onCancel }: SubscriptionManagerProps) {
  const current = user.subscription;
  const [planId, setPlanId] = useState(current.plan_id);
  const [extendDays, setExtendDays] = useState("");
  const [resetQuota, setResetQuota] = useState(false);
  const [addonId, setAddonId] = useState<string | null>(current.storage_addon_id);
  const [busy, setBusy] = useState(false);

  const planChanged = planId !== current.plan_id;
  // Keputusan produk: ganti paket SELALU me-reset kuota — dicerminkan di UI, ditegakkan backend.
  const effectiveReset = planChanged || resetQuota;
  const canExtend = planId !== FREE_PLAN_ID;
  const days = canExtend && extendDays ? Number(extendDays) : null;
  const daysValid = days === null || (Number.isInteger(days) && days >= 1 && days <= MAX_EXTEND_DAYS);
  const hasChange = planChanged || effectiveReset || days !== null;

  async function run(action: () => Promise<AdminUserDetail>, success: string) {
    setBusy(true);
    try {
      const updated = await action();
      toast({ title: success, variant: "success" });
      onUpdated(updated);
    } catch (err) {
      toast({ title: "Gagal mengubah langganan", desc: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  function saveSubscription() {
    const body: { plan_id?: string; extend_days?: number; reset_quota?: boolean } = {};
    if (planChanged) body.plan_id = planId;
    if (days !== null) body.extend_days = days;
    if (effectiveReset) body.reset_quota = true;
    run(() => adminApi.updateSubscription(user.id, body), "Langganan diperbarui.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="aigt-h6">Paket & kuota</div>
        <Select
          aria-label="Paket"
          options={Object.values(PLAN_LABELS)}
          value={PLAN_LABELS[planId] ?? planId}
          onChange={(e) => setPlanId(PLAN_BY_LABEL[e.target.value] ?? planId)}
        />
        {canExtend && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="aigt-caption">Perpanjang (hari)</span>
            <input
              aria-label="Perpanjang (hari)"
              type="number"
              min={1}
              max={MAX_EXTEND_DAYS}
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              placeholder="Kosongkan bila tidak diperpanjang"
              style={fieldStyle}
            />
            {!daysValid && <span className="aigt-caption" role="alert">Isi 1–{MAX_EXTEND_DAYS} hari.</span>}
          </label>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={effectiveReset}
            disabled={planChanged}
            onChange={(e) => setResetQuota(e.target.checked)}
          />
          <span>Reset kuota generate bulan ini</span>
        </label>
        {planChanged && (
          <span className="aigt-caption">Ganti paket otomatis me-reset kuota generate bulan ini.</span>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Batal</Button>
          <Button disabled={busy || !hasChange || !daysValid} onClick={saveSubscription}>
            {busy ? "Menyimpan…" : "Simpan langganan"}
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <div className="aigt-h6">Add-on storage (gratis)</div>
        <Select
          aria-label="Add-on storage"
          options={[NO_ADDON, ...Object.values(ADDON_LABELS)]}
          value={addonId ? (ADDON_LABELS[addonId] ?? addonId) : NO_ADDON}
          onChange={(e) => setAddonId(ADDON_BY_LABEL[e.target.value] ?? null)}
        />
        <span className="aigt-caption">Untuk kompensasi atau trial — tidak membuat order pembayaran.</span>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="outline"
            disabled={busy || addonId === current.storage_addon_id}
            onClick={() => run(() => adminApi.grantAddon(user.id, addonId), addonId ? "Add-on diberikan." : "Add-on dicabut.")}
          >
            Terapkan add-on
          </Button>
        </div>
      </div>
    </div>
  );
}
