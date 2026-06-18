"use client";

import { ReactNode, CSSProperties, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
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
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (!user) return null;

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
