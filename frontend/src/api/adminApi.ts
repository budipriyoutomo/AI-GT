import { api } from "@/lib/apiClient";
import type { TemplateConfig } from "@/types/template";

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: "admin" | "superadmin";
}

export interface AdminUserRef {
  id: string;
  email: string;
  name: string;
}

export type OrderStatus = "pending" | "awaiting_verification" | "paid" | "rejected" | "expired";

export interface AdminOrder {
  id: string;
  /** null bila akun pemilik sudah dihapus. */
  user: AdminUserRef | null;
  kind: "plan" | "addon";
  item_id: string;
  item_name: string;
  amount: number;
  unique_code: number;
  total_amount: number;
  status: OrderStatus;
  /** Bukti transfer dibaca lewat proofBlob(), bukan URL CDN publik. */
  has_proof: boolean;
  created_at: string;
  expires_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  reviewed_by: AdminUserRef | null;
  reviewed_at: string | null;
}

export interface AdminOrderList {
  items: AdminOrder[];
  total: number;
}

export interface ListOrdersParams {
  status: OrderStatus | "all";
  limit: number;
  offset: number;
}

export type MessageStatus = "new" | "read" | "handled";

export interface AdminMessage {
  id: string;
  name: string;
  email: string;
  category: string | null;
  message: string;
  status: MessageStatus;
  created_at: string;
  handled_by: AdminUserRef | null;
  handled_at: string | null;
}

export interface AdminMessageList {
  items: AdminMessage[];
  total: number;
  /** Jumlah pesan berstatus "new" lintas filter. */
  unread: number;
}

export interface ListMessagesParams {
  /** "open" = new + read (belum selesai). */
  status: MessageStatus | "open" | "all";
  limit: number;
  offset: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  is_active: boolean;
  plan_id: string;
  business_name: string | null;
  created_at: string;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  is_active: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  company_profile: { business_name: string; industry: string; logo_url: string | null } | null;
  subscription: {
    plan_id: string;
    plan_name: string;
    status: string;
    storage_addon_id: string | null;
    current_period_end: string | null;
  };
  /** -1 = tidak terbatas. */
  usage: { generate_used: number; generate_limit: number; history_used: number; history_limit: number };
}

export interface ListUsersParams {
  q: string;
  /** "" = semua paket. */
  plan: string;
  status: "all" | "active" | "suspended";
  limit: number;
  offset: number;
}

export interface AuditActorRef {
  /** null = akun admin sudah dihapus; email adalah salinan saat aksi terjadi. */
  id: string | null;
  email: string;
}

export interface AdminAuditLog {
  id: string;
  admin: AuditActorRef;
  action: string;
  target_type: string;
  target_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogList {
  items: AdminAuditLog[];
  total: number;
  /** Semua aksi yang sah (untuk dropdown filter). */
  actions: string[];
  /** Semua admin yang pernah beraksi — tidak ikut terfilter. */
  admins: AuditActorRef[];
}

export interface ListAuditLogsParams {
  /** "" = semua. date_* format YYYY-MM-DD (UTC, inklusif). */
  admin_id: string;
  action: string;
  date_from: string;
  date_to: string;
  limit: number;
  offset: number;
}

export interface DailyGenerate {
  /** YYYY-MM-DD (UTC). */
  date: string;
  completed: number;
  failed: number;
}

export interface AdminMetrics {
  users: { total: number; new_7d: number; new_30d: number; suspended: number };
  generate: {
    this_month: number;
    last_30d: { total: number; completed: number; failed: number; processing: number };
    /** 0–1; null bila belum ada session selesai (0/0 bukan 0%). */
    success_rate_30d: number | null;
  };
  revenue: { this_month: number; paid_orders_this_month: number };
  pending: { orders_awaiting_verification: number; messages_unread: number };
  /** 30 hari, urut lama → baru, berakhir hari ini. */
  daily: DailyGenerate[];
}

export interface AdminSession {
  id: string;
  user: AdminUserRef | null;
  template_name: string | null;
  status: string;
  goal: string | null;
  platform: string | null;
  error_reason: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ListSessionsParams {
  status: "failed" | "processing" | "completed" | "all";
  limit: number;
  offset: number;
}

export interface JobRun {
  id: string;
  job_name: string;
  trigger: "schedule" | "manual";
  triggered_by_email: string | null;
  status: "running" | "success" | "failed";
  result: Record<string, number> | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface JobOverview {
  jobs: {
    name: string;
    label: string;
    interval_minutes: number;
    last_run: JobRun | null;
    last_success: JobRun | null;
  }[];
  recent: JobRun[];
}

export interface StorageUsage {
  prefixes: { prefix: string; objects: number; bytes: number }[];
  /** user null = file yatim (akun sudah tidak ada). */
  top_users: { user_id: string; objects: number; bytes: number; user: AdminUserRef | null }[];
  total_objects: number;
  total_bytes: number;
  /** true = pemindaian berhenti di batas objek; angka di bawah nilai sebenarnya. */
  truncated: boolean;
  scanned_at: string;
}

export type CopyIntent = "promotion" | "story" | "brand";

export interface AdminTemplate {
  id: string;
  name: string;
  industry: string;
  theme: string;
  copy_intent: CopyIntent | null;
  content_type: string;
  thumbnail_url: string;
  background_url: string | null;
  /** Sudah ter-resolve (preset di-expand) — tidak pernah diubah setelah publish. */
  template_config: TemplateConfig;
  is_premium: boolean;
  is_active: boolean;
  created_at: string | null;
  /** >0 = sudah dipakai generate → tidak bisa dihapus, hanya dinonaktifkan. */
  usage_count: number;
}

/** Field template live yang boleh diubah. template_config sengaja tidak ada (AGENTS.md §10 #3). */
export type TemplateMetaPatch = Partial<Pick<AdminTemplate, "name" | "industry" | "theme" | "copy_intent" | "is_premium" | "is_active">>;

export interface TemplateDraft {
  id: string;
  name: string;
  industry: string;
  theme: string;
  copy_intent: CopyIntent | null;
  content_type: string;
  is_premium: boolean;
  /** MENTAH (preset belum di-expand) dan boleh belum valid selama diedit. */
  template_config: Record<string, unknown>;
  thumbnail_url: string | null;
  background_url: string | null;
  source_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TemplateDraftPatch = Partial<Pick<TemplateDraft, "name" | "industry" | "theme" | "copy_intent" | "is_premium" | "template_config">>;

export interface TemplateValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  resolved_config: TemplateConfig | null;
}

/** Satu file backend/scripts/seed_template_data/*.json. */
export interface TemplateExport {
  filename: string;
  content: Record<string, unknown>;
}

export const adminApi = {
  /** Sumber kebenaran otorisasi admin. Backend yang memutuskan, bukan frontend —
   *  guard sisi klien hanya menentukan apa yang digambar, tidak melindungi data. */
  ping: (): Promise<AdminIdentity> => api.get<AdminIdentity>("/api/v1/admin/ping"),

  listOrders: ({ status, limit, offset }: ListOrdersParams): Promise<AdminOrderList> => {
    const qs = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
    return api.get<AdminOrderList>(`/api/v1/admin/orders?${qs}`);
  },

  confirmOrder: (id: string): Promise<AdminOrder> =>
    api.post<AdminOrder>(`/api/v1/admin/orders/${id}/confirm`, {}),

  rejectOrder: (id: string, reason: string): Promise<AdminOrder> =>
    api.post<AdminOrder>(`/api/v1/admin/orders/${id}/reject`, { reason }),

  proofBlob: (id: string): Promise<Blob> => api.getBlob(`/api/v1/admin/orders/${id}/proof`),

  listMessages: ({ status, limit, offset }: ListMessagesParams): Promise<AdminMessageList> => {
    const qs = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
    return api.get<AdminMessageList>(`/api/v1/admin/messages?${qs}`);
  },

  /** only_if_new: auto-mark-read saat membuka pesan — tidak membuka ulang pesan yang sudah selesai. */
  updateMessage: (id: string, body: { status: MessageStatus; only_if_new?: boolean }): Promise<AdminMessage> =>
    api.patch<AdminMessage>(`/api/v1/admin/messages/${id}`, body),

  listUsers: ({ q, plan, status, limit, offset }: ListUsersParams): Promise<{ items: AdminUserListItem[]; total: number }> => {
    const qs = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
    if (q.trim()) qs.set("q", q.trim());
    if (plan) qs.set("plan", plan);
    return api.get(`/api/v1/admin/users?${qs}`);
  },

  getUser: (id: string): Promise<AdminUserDetail> => api.get<AdminUserDetail>(`/api/v1/admin/users/${id}`),

  suspendUser: (id: string, reason: string): Promise<AdminUserDetail> =>
    api.post<AdminUserDetail>(`/api/v1/admin/users/${id}/suspend`, { reason }),

  unsuspendUser: (id: string): Promise<AdminUserDetail> =>
    api.post<AdminUserDetail>(`/api/v1/admin/users/${id}/unsuspend`, {}),

  /** Backend mewajibkan confirm_email == email user (konfirmasi ganda di server). */
  deleteUser: (id: string, confirmEmail: string): Promise<null> =>
    api.delete<null>(`/api/v1/admin/users/${id}`, { confirm_email: confirmEmail }),

  /** Ganti paket (ke paket berbeda) selalu me-reset kuota di backend. */
  updateSubscription: (
    id: string,
    body: { plan_id?: string; extend_days?: number; reset_quota?: boolean },
  ): Promise<AdminUserDetail> => api.patch<AdminUserDetail>(`/api/v1/admin/users/${id}/subscription`, body),

  /** addonId null = cabut add-on. */
  grantAddon: (id: string, addonId: string | null): Promise<AdminUserDetail> =>
    api.post<AdminUserDetail>(`/api/v1/admin/users/${id}/grant-addon`, { addon_id: addonId }),

  getMetrics: (): Promise<AdminMetrics> => api.get<AdminMetrics>("/api/v1/admin/metrics"),

  listSessions: ({ status, limit, offset }: ListSessionsParams): Promise<{ items: AdminSession[]; total: number }> => {
    const qs = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
    return api.get(`/api/v1/admin/sessions?${qs}`);
  },

  listJobs: (): Promise<JobOverview> => api.get<JobOverview>("/api/v1/admin/storage/jobs"),

  /** Kegagalan job dilaporkan lewat `status` run (HTTP 200), bukan exception. */
  runJob: (name: string): Promise<JobRun> => api.post<JobRun>(`/api/v1/admin/storage/jobs/${name}/run`, {}),

  /** Memindai bucket on-demand — bisa beberapa detik. */
  getStorageUsage: (): Promise<StorageUsage> => api.get<StorageUsage>("/api/v1/admin/storage/usage"),

  listAuditLogs: ({ limit, offset, ...filters }: ListAuditLogsParams): Promise<AuditLogList> => {
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v);
    return api.get<AuditLogList>(`/api/v1/admin/audit-logs?${qs}`);
  },

  listTemplates: (status: "all" | "active" | "inactive" = "all"): Promise<{ items: AdminTemplate[] }> =>
    api.get(`/api/v1/admin/templates?status=${status}`),

  updateTemplate: (id: string, patch: TemplateMetaPatch): Promise<AdminTemplate> =>
    api.patch<AdminTemplate>(`/api/v1/admin/templates/${id}`, patch),

  uploadTemplateImage: (id: string, kind: "thumbnail" | "background", file: File): Promise<AdminTemplate> => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<AdminTemplate>(`/api/v1/admin/templates/${id}/image?kind=${kind}`, form);
  },

  deleteTemplate: (id: string): Promise<null> => api.delete<null>(`/api/v1/admin/templates/${id}`),

  exportTemplate: (id: string): Promise<TemplateExport> => api.get(`/api/v1/admin/templates/${id}/export`),

  validateTemplate: (template_config: unknown): Promise<TemplateValidation> =>
    api.post<TemplateValidation>("/api/v1/admin/templates/validate", { template_config }),

  listDrafts: (): Promise<{ items: TemplateDraft[] }> => api.get("/api/v1/admin/template-drafts"),

  /** sourceTemplateId = "versi baru" dari template live; kosong = mulai dari kerangka. */
  createDraft: (sourceTemplateId?: string): Promise<TemplateDraft> =>
    api.post<TemplateDraft>("/api/v1/admin/template-drafts", sourceTemplateId ? { source_template_id: sourceTemplateId } : {}),

  getDraft: (id: string): Promise<TemplateDraft> => api.get(`/api/v1/admin/template-drafts/${id}`),

  updateDraft: (id: string, patch: TemplateDraftPatch): Promise<TemplateDraft> =>
    api.patch<TemplateDraft>(`/api/v1/admin/template-drafts/${id}`, patch),

  deleteDraft: (id: string): Promise<null> => api.delete<null>(`/api/v1/admin/template-drafts/${id}`),

  publishDraft: (id: string, deactivateSource: boolean): Promise<AdminTemplate> =>
    api.post<AdminTemplate>(`/api/v1/admin/template-drafts/${id}/publish`, { deactivate_source: deactivateSource }),

  exportDraft: (id: string): Promise<TemplateExport> => api.get(`/api/v1/admin/template-drafts/${id}/export`),
};
