/** Label katalog paket & add-on untuk panel admin — selaras dengan backend `billing_plans`. */
export const PLAN_LABELS: Record<string, string> = { starter: "Starter", pro: "Pro", business: "Business" };
export const PLAN_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_LABELS).map(([id, label]) => [label, id]),
);
export const FREE_PLAN_ID = "starter";

export const ADDON_LABELS: Record<string, string> = { s50: "+50 slot", s200: "+200 slot", s500: "+500 slot" };
export const NO_ADDON = "Tanpa add-on";
export const ADDON_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(ADDON_LABELS).map(([id, label]) => [label, id]),
);
