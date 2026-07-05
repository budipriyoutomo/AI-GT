import { Icon } from "@/components/ui/icon";

const STEPS = [
  "Tujuan & Platform",
  "Pilih Template",
  "Isi Brief",
  "Generate",
];

interface FlowStepperProps {
  currentStep: number; // 1-based
}

export function FlowStepper({ currentStep }: FlowStepperProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done   = num < currentStep;
        const active = num === currentStep;
        return (
          <span key={num} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{
                width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)",
                background: done ? "var(--success)" : active ? "var(--primary)" : "var(--muted)",
                color: (done || active) ? "#fff" : "var(--muted-foreground)",
              }}>
                {done ? <Icon name="check" size={9} /> : num}
              </span>
              <span style={{
                fontSize: "var(--text-xs)",
                fontWeight: active ? 600 : 400,
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
                display: active ? undefined : "none",
              }}>
                {label}
              </span>
            </span>
            {i < STEPS.length - 1 && (
              <Icon name="chevron-right" size={11} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
            )}
          </span>
        );
      })}
    </div>
  );
}
