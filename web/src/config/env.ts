function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

/** API origin, no /api suffix. Set VITE_BACKEND_URL in web/.env. */
export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_BACKEND_URL);
