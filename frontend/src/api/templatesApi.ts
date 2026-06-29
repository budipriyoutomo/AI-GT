import { api } from "@/lib/apiClient";
import type { Template, TemplateListItem } from "@/types/template";

export const templatesApi = {
  // List membawa template_config penuh agar galeri bisa live-render element-based.
  list: (params?: { industry?: string; theme?: string }): Promise<TemplateListItem[]> => {
    const q = new URLSearchParams();
    if (params?.industry) q.set("industry", params.industry);
    if (params?.theme) q.set("theme", params.theme);
    const qs = q.toString();
    return api.get<TemplateListItem[]>(`/api/v1/templates${qs ? `?${qs}` : ""}`);
  },

  get: (id: string): Promise<Template> =>
    api.get<Template>(`/api/v1/templates/${id}`),
};
