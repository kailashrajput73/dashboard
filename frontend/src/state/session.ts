// Session persistence utilities. Keys are namespaced.

import { storage } from "@/src/utils/storage";
import type { AdminSession } from "@/src/api/endpoints";
import { writeAdminToken } from "@/src/api/client";

const K_ADMIN = "session:admin";

export async function saveAdmin(a: AdminSession) {
  await storage.setItem(K_ADMIN, JSON.stringify(a));
  await writeAdminToken(a.token);
}

export async function getAdmin(): Promise<AdminSession | null> {
  const raw = (await storage.getItem<string | null>(K_ADMIN, null)) as
    | string
    | null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export async function clearAdmin() {
  await storage.removeItem(K_ADMIN);
  await writeAdminToken(null);
}

export async function fullSignOut() {
  await clearAdmin();
}
