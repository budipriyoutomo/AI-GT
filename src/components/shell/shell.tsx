import { ReactNode, CSSProperties } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

interface ShellProps {
  active: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  contentStyle?: CSSProperties;
}

export function Shell({ active, title, actions, children, contentStyle }: ShellProps) {
  return (
    <div className="aigt-app">
      <Sidebar active={active} />
      <div className="aigt-main">
        <TopNav title={title} actions={actions} />
        <div className="aigt-content" style={contentStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}
