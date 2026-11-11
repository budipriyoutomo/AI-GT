import { ReactNode } from "react";
import { Card } from "./card";
import { Icon } from "./icon";
import { Button } from "./button";

interface EmptyStateProps {
  icon: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}

/** Wadah kosong standar untuk daftar (Dashboard, History, Templates). */
export function EmptyState({ icon, title, desc, action }: EmptyStateProps) {
  return (
    <Card variant="sunken" padding={40} style={{ textAlign: "center", color: "var(--muted-foreground)" }}>
      <Icon name={icon} size={32} style={{ opacity: 0.4 }} />
      <p style={{ marginTop: 10, fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--foreground)" }}>{title}</p>
      {desc && <p style={{ marginTop: 4, fontSize: "var(--text-xs)" }}>{desc}</p>}
      {action && <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>{action}</div>}
    </Card>
  );
}

interface LoadErrorStateProps {
  title: string;
  onRetry: () => void;
}

/** Gagal memuat daftar — dibedakan dari "kosong" supaya user tidak mengira datanya hilang. */
export function LoadErrorState({ title, onRetry }: LoadErrorStateProps) {
  return (
    <div role="alert">
      <EmptyState
        icon="cloud-off"
        title={title}
        desc="Periksa koneksi internet kamu, lalu coba lagi."
        action={<Button size="sm" variant="outline" icon="rotate-cw" onClick={onRetry}>Coba lagi</Button>}
      />
    </div>
  );
}
