import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchAdminMe, type AdminSession } from "../api/endpoints";
import { getAdmin, saveAdmin } from "../state/session";

type AdminSessionContextValue = {
  session: AdminSession | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
};

const AdminSessionContext = createContext<AdminSessionContextValue>({
  session: null,
  loading: true,
  refreshSession: async () => {},
});

export function AdminSessionProvider(props: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const local = await getAdmin();
    if (!local?.token) {
      setSession(null);
      return;
    }
    try {
      const me = await fetchAdminMe();
      const merged: AdminSession = { ...local, ...me };
      await saveAdmin(merged);
      setSession(merged);
    } catch {
      setSession(local);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const local = await getAdmin();
      if (!active) return;
      if (!local) {
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(local);
      try {
        const me = await fetchAdminMe();
        const merged = { ...local, ...me };
        await saveAdmin(merged);
        if (active) setSession(merged);
      } catch {
        /* keep cached session */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({ session, loading, refreshSession }),
    [session, loading, refreshSession],
  );

  return (
    <AdminSessionContext.Provider value={value}>{props.children}</AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  return useContext(AdminSessionContext);
}
