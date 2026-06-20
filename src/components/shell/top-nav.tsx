import { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface TopNavProps {
  title: string;
  actions?: ReactNode;
}

export function TopNav({ title, actions }: TopNavProps) {
  return (
    <header className="aigt-top">
      <strong style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{title}</strong>
      <div style={{ flex: 1 }} />
      {actions}
      <button className="aigt-iconbtn" title="Notifikasi">
        <Icon name="bell" size={17} />
      </button>
      <ThemeToggle />
      <Avatar initials="RW" size={28} />
    </header>
  );
}
