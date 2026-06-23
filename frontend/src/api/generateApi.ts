import { api } from "@/lib/apiClient";
import type { GenerateSession } from "@/types/generate-session";
import type { Project } from "@/types/project";

export interface CreateSessionRequest {
  template_id: string;
  language_style: string;
  thematic_image_theme?: string;
  campaign_data?: Record<string, unknown>;
}

export const generateApi = {
  createSession: (data: CreateSessionRequest): Promise<GenerateSession> =>
    api.post<GenerateSession>("/api/v1/generate/session", data),

  getSession: (sessionId: string): Promise<GenerateSession> =>
    api.get<GenerateSession>(`/api/v1/generate/session/${sessionId}`),

  selectVariant: (sessionId: string, variantId: string): Promise<Project> =>
    api.post<Project>(`/api/v1/generate/session/${sessionId}/select`, {
      variant_id: variantId,
    }),
};
