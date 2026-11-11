"use client";

import { Button } from "@/components/ui/button";

interface AdminPagerProps {
  offset: number;
  pageSize: number;
  total: number;
  onChange: (offset: number) => void;
}

/** Paginasi offset untuk list admin — tidak digambar kalau semua muat di satu halaman. */
export function AdminPager({ offset, pageSize, total, onChange }: AdminPagerProps) {
  if (total <= pageSize) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
      <span className="aigt-caption">
        {offset + 1}–{Math.min(offset + pageSize, total)} dari {total}
      </span>
      <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => onChange(offset - pageSize)}>
        Sebelumnya
      </Button>
      <Button size="sm" variant="outline" disabled={offset + pageSize >= total} onClick={() => onChange(offset + pageSize)}>
        Berikutnya
      </Button>
    </div>
  );
}
