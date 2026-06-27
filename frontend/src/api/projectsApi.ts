import { api, getToken } from "@/lib/apiClient";
import type { Project } from "@/types/project";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ProjectUpdate {
  title?: string;
  final_config?: Record<string, unknown>;
}

export const projectsApi = {
  list: (): Promise<Project[]> => api.get<Project[]>("/api/v1/projects"),

  get: (id: string): Promise<Project> =>
    api.get<Project>(`/api/v1/projects/${id}`),

  update: (id: string, data: ProjectUpdate): Promise<Project> =>
    api.patch<Project>(`/api/v1/projects/${id}`, data),

  delete: (id: string): Promise<null> =>
    api.delete<null>(`/api/v1/projects/${id}`),

  thumbnail: async (id: string, file: Blob): Promise<Project> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file, "thumbnail.png");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/api/v1/projects/${id}/thumbnail`, {
      method: "POST",
      headers,
      body: formData,
    });
    const body = await res.json();
    if (!body.success) throw new Error(body.error?.message ?? "Thumbnail gagal");
    return body.data as Project;
  },

  export: async (id: string, file: Blob): Promise<Project> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file, "export.png");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/api/v1/projects/${id}/export`, {
      method: "POST",
      headers,
      body: formData,
    });
    const body = await res.json();
    if (!body.success) throw new Error(body.error?.message ?? "Export gagal");
    return body.data as Project;
  },
};
