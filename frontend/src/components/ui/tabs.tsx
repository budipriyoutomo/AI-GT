"use client";

interface Tab {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: (Tab | string)[];
  value: string;
  onChange: (value: string) => void;
}

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div className="aigt-tabs" role="tablist">
      {tabs.map((t) => {
        const v = typeof t === "string" ? t : t.value;
        const label = typeof t === "string" ? t : t.label;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={value === v}
            className={`aigt-tab${value === v ? " active" : ""}`}
            onClick={() => onChange(v)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
