// ============================================================================
// API Client
// ----------------------------------------------------------------------------
// Central fetch wrapper.
//
// TODO (BACKEND):
//   * Teammate's backend MUST enable CORS (`allow_origins=["*"]` or explicit
//     list including "http://localhost:19006" etc.) for the mobile Expo client.
//   * Teammate's backend MUST return the envelope `{ success, data, error }`
//     for every route. If the envelope is missing we still handle raw JSON.
//   * If admin routes are token-protected on teammate's side, the token from
//     /api/auth/admin/login is attached automatically as Authorization: Bearer.
//     If teammate's backend ignores the header, no change is needed here.
// ============================================================================

import { storage } from "@/src/utils/storage";
import { API_BASE_URL, API_PREFIX } from "@/src/config/env";

const ADMIN_TOKEN_KEY = "session:admin:token";

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function readToken(): Promise<string | null> {
  return (await storage.getItem<string | null>(ADMIN_TOKEN_KEY, null)) as
    | string
    | null;
}

export async function writeAdminToken(token: string | null) {
  if (token === null) {
    await storage.removeItem(ADMIN_TOKEN_KEY);
  } else {
    await storage.setItem(ADMIN_TOKEN_KEY, token);
  }
}

type ReqOpts = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  query?: Record<string, string | number | undefined | null>;
  /** Set false to skip attaching the admin bearer token. */
  auth?: boolean;
};

function buildUrl(path: string, query?: ReqOpts["query"]): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const full = `${API_BASE_URL}${API_PREFIX}${p}`;
  if (!query) return full;
  const pairs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    );
  return pairs.length ? `${full}?${pairs.join("&")}` : full;
}

export async function apiRequest<T = any>(
  path: string,
  opts: ReqOpts = {},
): Promise<T> {
  const { method = "GET", body, query, auth = true } = opts;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (auth) {
    const token = await readToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const url = buildUrl(path, query);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (netErr: any) {
    // Network failure — backend unreachable.
    throw new ApiError(
      "Backend not running — please start the FastAPI server (uvicorn server:app --host 0.0.0.0 --port 8000).",
      0,
      { networkError: true, message: netErr?.message },
    );
  }

  let payload: any = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!res.ok) {
    const msg =
      (payload && (payload.error || payload.detail || payload.message)) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, payload);
  }

  // Unwrap envelope { success, data, error } if present.
  if (payload && typeof payload === "object" && "success" in payload) {
    const env = payload as ApiEnvelope<T>;
    if (!env.success) {
      throw new ApiError(env.error || "Request failed", res.status, payload);
    }
    return env.data as T;
  }
  return payload as T;
}
