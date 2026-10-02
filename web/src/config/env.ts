function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

/** API origin, no /api suffix. Set VITE_BACKEND_URL in web/.env. */
export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_BACKEND_URL);

export const API_PREFIX = "/api";

/** True when admin runs on HTTPS but API is plain HTTP (browser will block fetch). */
export function isMixedContentRisk(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:" && API_BASE_URL.startsWith("http://");
}
