"use client";

import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { contactApi } from "@/api/contactApi";

const CATEGORIES = [
  { value: "support", label: "Dukungan Umum" },
  { value: "partnership", label: "Bisnis & Kemitraan" },
  { value: "privacy", label: "Privasi & Legal" },
];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("support");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Nama, email, dan pesan wajib diisi.");
      return;
    }
    setSending(true);
    try {
      await contactApi.send({ name: name.trim(), email: email.trim(), category, message: message.trim() });
      toast({ title: "Pesan terkirim", desc: "Tim kami akan membalas lewat email.", variant: "success" });
      setName(""); setEmail(""); setMessage(""); setCategory("support");
    } catch {
      setError("Gagal mengirim pesan. Coba lagi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 40 }}>
      <div style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>Kirim pesan langsung</div>
      <Input label="Nama" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" />
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>Kategori</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "10px 12px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)", background: "var(--surface-sunken)",
            color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>Pesan</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tulis pertanyaan atau masukanmu…"
          style={{
            minHeight: 120, padding: "10px 12px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)", background: "var(--surface-sunken)",
            color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)",
            outline: "none", resize: "vertical",
          }}
        />
      </div>
      {error && (
        <div style={{ color: "var(--destructive)", fontSize: "var(--text-xs)", fontWeight: 500 }}>{error}</div>
      )}
      <div>
        <Button type="submit" icon="send" disabled={sending}>
          {sending ? "Mengirim..." : "Kirim pesan"}
        </Button>
      </div>
    </form>
  );
}
