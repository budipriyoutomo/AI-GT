"use client";

import { useRef, useState } from "react";
import { Button } from "./button";
import { Icon } from "./icon";
import { toast } from "./toast";
import { companyProfileApi } from "@/api/companyProfileApi";
import { ApiClientError } from "@/lib/apiClient";
import { resolveAssetUrl } from "@/lib/assetUrl";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

const ERROR_MESSAGES: Record<string, string> = {
  FILE_TOO_LARGE: "Ukuran file maksimum 2 MB.",
  INVALID_FILE_TYPE: "Format file tidak didukung. Gunakan PNG, JPG, atau WEBP.",
  STORAGE_UPLOAD_FAILED: "Gagal mengunggah logo. Coba lagi.",
};
const DEFAULT_ERROR_MESSAGE = "Gagal mengunggah logo. Coba lagi.";

type LogoUploadFieldProps = {
  value: string | null;
  onChange: (logoUrl: string | null) => void;
  disabled?: boolean;
};

export function LogoUploadField({ value, onChange, disabled }: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const preview = resolveAssetUrl(value);
  const busy = disabled || status === "uploading";

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setStatus("error");
      setError(ERROR_MESSAGES.INVALID_FILE_TYPE);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setStatus("error");
      setError(ERROR_MESSAGES.FILE_TOO_LARGE);
      return;
    }

    setStatus("uploading");
    try {
      const { logo_url } = await companyProfileApi.uploadLogo(file);
      setStatus("idle");
      onChange(logo_url);
      toast({ title: "Logo terunggah", variant: "success" });
    } catch (err) {
      setStatus("error");
      const code = err instanceof ApiClientError ? err.code : undefined;
      setError((code && ERROR_MESSAGES[code]) ?? DEFAULT_ERROR_MESSAGE);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after "Ganti"
    if (file) handleFile(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onFileChange}
        style={{ display: "none" }}
        disabled={disabled}
      />
      {preview ? (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 14, padding: 16,
            border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--card)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Logo bisnis"
            style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", objectFit: "contain", background: "var(--surface-sunken)" }}
          />
          <div style={{ flex: 1 }}>
            <div className="aigt-h6">Logo bisnis</div>
            {status === "uploading" && <div className="aigt-caption">Mengunggah…</div>}
          </div>
          <Button type="button" variant="ghost" size="sm" icon="upload-cloud" disabled={busy} onClick={() => inputRef.current?.click()}>
            Ganti
          </Button>
          <Button type="button" variant="ghost" size="sm" icon="trash-2" disabled={busy} onClick={() => onChange(null)}>
            Hapus
          </Button>
        </div>
      ) : (
        <div
          onClick={() => !busy && inputRef.current?.click()}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 28,
            border: "1.5px dashed color-mix(in oklch, var(--primary) 40%, var(--border))",
            borderRadius: "var(--radius-lg)", background: "var(--surface-sunken)",
            cursor: busy ? "default" : "pointer", textAlign: "center", opacity: busy ? 0.6 : 1,
          }}
        >
          <span style={{ width: 40, height: 40, borderRadius: "var(--radius-lg)", background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="upload-cloud" size={20} />
          </span>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
            {status === "uploading" ? "Mengunggah…" : "Tarik logo ke sini atau klik untuk unggah"}
          </div>
          <div className="aigt-caption">PNG, JPG atau WEBP · maks 2 MB</div>
        </div>
      )}
      {error && (
        <div style={{ color: "var(--destructive)", fontSize: "var(--text-xs)", marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
