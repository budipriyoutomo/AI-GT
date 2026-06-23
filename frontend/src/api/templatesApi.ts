import { api } from "@/lib/apiClient";
import type { Template } from "@/types/template";

export const templatesApi = {
  list: (params?: { industry?: string; theme?: string }): Promise<Template[]> => {
    const q = new URLSearchParams();
    if (params?.industry) q.set("industry", params.industry);
    if (params?.theme) q.set("theme", params.theme);
    const qs = q.toString();
    return api.get<Template[]>(`/api/v1/templates${qs ? `?${qs}` : ""}`);
  },

  get: (id: string): Promise<Template> =>
    api.get<Template>(`/api/v1/templates/${id}`),
};
