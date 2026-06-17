import { ReactNode } from "react";

interface PageHeadProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHead({ title, subtitle, actions }: PageHeadProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 20 }}>
      <div style={{ flex: 1 }}>
        <h1 className="aigt-h1">{title}</h1>
        {subtitle && (
          <p className="aigt-caption" style={{ margin: "6px 0 0", fontSize: "var(--text-sm)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 8, flex: "none" }}>{actions}</div>
      )}
    </div>
  );
}
