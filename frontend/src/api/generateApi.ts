import { api } from "@/lib/apiClient";
import type { GenerateSession } from "@/types/generate-session";
import type { Project } from "@/types/project";

export interface CampaignData {
  content_brief?: string;
  image_source?: "upload" | "suggestion" | "none";
  image_prompt?: string;
  target_audience?: string;
  language_preference?: string;
}

export interface CreateSessionRequest {
  template_id: string;
  language_style: string;
  campaign_data?: CampaignData;
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

  generateImage: (prompt: string, projectId?: string): Promise<{ url: string | null }> =>
    api.post<{ url: string | null }>("/api/v1/generate/image", {
      prompt,
      ...(projectId ? { project_id: projectId } : {}),
    }),

  getImageSuggestions: (data: {
    content_brief: string;
    template_theme?: string;
    industry?: string;
    target_audience?: string;
    language_preference?: string;
  }): Promise<{ suggestions: string[] }> =>
    api.post<{ suggestions: string[] }>("/api/v1/generate/image-suggestions", data),
};
