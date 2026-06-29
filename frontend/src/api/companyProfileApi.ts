import { api } from "@/lib/apiClient";
import type { CompanyContact, CompanyProfile } from "@/types/company-profile";

export interface CompanyProfileCreate {
  business_name: string;
  industry: string;
  logo_url?: string;
  brand_colors?: string[];
  brand_font?: string;
  tagline?: string;
  contact?: CompanyContact;
  language_preference?: string;
}

export interface CompanyProfileUpdate {
  business_name?: string;
  industry?: string;
  logo_url?: string;
  brand_colors?: string[];
  brand_font?: string;
  tagline?: string;
  contact?: CompanyContact;
  language_preference?: string;
}

export const companyProfileApi = {
  get: (): Promise<CompanyProfile> =>
    api.get<CompanyProfile>("/api/v1/company-profile"),

  create: (data: CompanyProfileCreate): Promise<CompanyProfile> =>
    api.post<CompanyProfile>("/api/v1/company-profile", data),

  update: (data: CompanyProfileUpdate): Promise<CompanyProfile> =>
    api.patch<CompanyProfile>("/api/v1/company-profile", data),
};
