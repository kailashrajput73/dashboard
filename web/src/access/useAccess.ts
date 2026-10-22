import { useMemo } from "react";
import { useAdminSession } from "./AdminSessionContext";
import type { AccessLevel, ModuleAccessMap, ModuleId } from "./modules";
import { ALL_MODULES, defaultModuleAccessForRole } from "./modules";

function resolvedAccess(session: ReturnType<typeof useAdminSession>["session"]): ModuleAccessMap {
  if (!session) {
    return Object.fromEntries(ALL_MODULES.map((m) => [m, "hidden"])) as ModuleAccessMap;
  }
  if (session.role === "admin") {
    return defaultModuleAccessForRole("admin");
  }
  if (session.moduleAccess) {
    return session.moduleAccess as ModuleAccessMap;
  }
  return defaultModuleAccessForRole(session.role ?? "staff");
}

export function useModuleAccess(module: ModuleId): AccessLevel {
  const { session } = useAdminSession();
  return useMemo(() => resolvedAccess(session)[module] ?? "hidden", [session, module]);
}

export function useCanReadModule(module: ModuleId): boolean {
  const level = useModuleAccess(module);
  return level === "read" || level === "write";
}

export function useCanWriteModule(module: ModuleId): boolean {
  return useModuleAccess(module) === "write";
}

export function useResolvedModuleAccess(): ModuleAccessMap {
  const { session } = useAdminSession();
  return useMemo(() => resolvedAccess(session), [session]);
}

export function useIsAdminRole(): boolean {
  const { session } = useAdminSession();
  return session?.role === "admin";
}
