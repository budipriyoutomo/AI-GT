/** Unduh objek sebagai file .json (format seed_template_data) lewat blob URL sementara. */
export function downloadJson(filename: string, content: unknown): void {
  const blob = new Blob([JSON.stringify(content, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
