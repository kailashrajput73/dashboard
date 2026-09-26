// ============================================================================
// API BASE URL — single place the admin app calls the backend
// ============================================================================
//
// Requests go to: `${API_BASE_URL}/api/...`  (see API_PREFIX in client.ts)
//
// Local Expo (web): set EXPO_PUBLIC_BACKEND_URL in frontend/.env or edit DEFAULT below.
//   Then restart: npx expo start --web --clear
//
// Vercel / production:
//   1) Project → Settings → Environment Variables
//      EXPO_PUBLIC_BACKEND_URL = https://your-api-domain.com   (HTTPS required!)
//   2) Redeploy the frontend
//
// Why HTTPS matters:
//   Admin on https://….vercel.app cannot call http://IP — browsers block it (mixed content).
//   Put nginx + SSL on the VPS (https://api.yourdomain.com) or use a TLS proxy.
//
// VPS without SSL yet:
//   Test from Expo on your laptop: http://localhost:8081 with API http://IP (same as below).
//
// ============================================================================

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "http://127.0.0.1:8001";
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

/** Override via frontend/.env: EXPO_PUBLIC_BACKEND_URL=http://187.127.148.44 */
const DEFAULT_BACKEND_URL = "http://187.127.148.44";

export const API_BASE_URL: string = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL,
);

export const API_PREFIX = "/api";

/** True when admin runs on HTTPS but API is plain HTTP (browser will block fetch). */
export function isMixedContentRisk(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:" && API_BASE_URL.startsWith("http://");
}
