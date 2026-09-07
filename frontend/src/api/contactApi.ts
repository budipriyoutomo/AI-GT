import { api } from "@/lib/apiClient";

export interface ContactMessageInput {
  name: string;
  email: string;
  category?: string;
  message: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  category: string | null;
  message: string;
  created_at: string;
}

export const contactApi = {
  send: (data: ContactMessageInput): Promise<ContactMessage> =>
    api.post<ContactMessage>("/api/v1/contact", data),
};
