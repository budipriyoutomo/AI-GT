"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { TemplateLab } from "@/components/admin/TemplateLab";

/** A-6 — Template Lab: edit draft (JSON + metadata) dengan preview kedua renderer, lalu publish. */
export default function TemplateLabPage() {
  const { draftId } = useParams<{ draftId: string }>();
  return (
    <AdminShell active="templates" title="Template Lab">
      <TemplateLab draftId={draftId} />
    </AdminShell>
  );
}
