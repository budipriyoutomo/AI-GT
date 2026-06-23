import { api, setToken, clearToken } from "@/lib/apiClient";
import type { User } from "@/types/user";

interface AuthTokenResponse {
  access_token: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthTokenResponse> => {
    const data = await api.post<AuthTokenResponse>("/api/v1/auth/login", {
      email,
      password,
    });
    setToken(data.access_token);
    return data;
  },

  register: async (
    name: string,
    email: string,
    password: string,
  ): Promise<AuthTokenResponse> => {
    const data = await api.post<AuthTokenResponse>("/api/v1/auth/register", {
      name,
      email,
      password,
    });
    setToken(data.access_token);
    return data;
  },

  getMe: (): Promise<User> => api.get<User>("/api/v1/auth/me"),

  logout: (): void => clearToken(),
};
