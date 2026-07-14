import { api } from "@/lib/apiClient";

export interface Plan {
  id: string;
  name: string;
  price: number;
  generate_limit: number;
  history_limit: number;
  profile_limit: number;
  thematic_image: boolean;
  watermark_free: boolean;
  priority_support: boolean;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  extra_slots: number;
}

export interface PlansResponse {
  plans: Plan[];
  addons: Addon[];
}

export interface Usage {
  generate_used: number;
  generate_limit: number;
  history_used: number;
  history_limit: number;
}

export interface Subscription {
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_end: string | null;
  storage_addon_id: string | null;
  usage: Usage;
}

export interface BankInstruction {
  bank_name: string;
  account_number: string;
  account_holder: string;
}

export interface Order {
  id: string;
  kind: "plan" | "addon";
  item_id: string;
  item_name: string;
  amount: number;
  unique_code: number;
  total_amount: number;
  status: string;
  proof_url: string | null;
  bank: BankInstruction;
  created_at: string;
  expires_at: string | null;
  paid_at: string | null;
}

export const billingApi = {
  plans: (): Promise<PlansResponse> => api.get<PlansResponse>("/api/v1/billing/plans"),

  subscription: (): Promise<Subscription> =>
    api.get<Subscription>("/api/v1/billing/subscription"),

  createOrder: (body: { plan_id?: string; addon_id?: string }): Promise<Order> =>
    api.post<Order>("/api/v1/billing/orders", body),

  orders: (): Promise<Order[]> => api.get<Order[]>("/api/v1/billing/orders"),

  order: (id: string): Promise<Order> => api.get<Order>(`/api/v1/billing/orders/${id}`),

  uploadProof: (id: string, file: File): Promise<Order> => {
    const form = new FormData();
    form.append("file", file);
    return api.upload<Order>(`/api/v1/billing/orders/${id}/proof`, form);
  },
};
