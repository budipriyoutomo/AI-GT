"use client";

import { useTheme } from "@/components/theme-provider";
import { Icon } from "./icon";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="aigt-iconbtn"
      onClick={toggle}
      title={theme === "dark" ? "Mode terang" : "Mode gelap"}
      aria-label="Ubah tema"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}
