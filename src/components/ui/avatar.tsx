interface AvatarProps {
  initials: string;
  size?: number;
  status?: "online" | "offline" | "away";
}

export function Avatar({ initials, size = 32, status }: AvatarProps) {
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold flex-none select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
      {status === "online" && (
        <span
          className="absolute bottom-0 right-0 block rounded-full bg-[var(--success)] border-2 border-[var(--card)]"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </span>
  );
}
