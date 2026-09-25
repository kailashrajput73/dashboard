import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Flutter `Navigator.of(context).maybePop()` — goes back only when there is
 * an in-app entry to return to (React Router keeps the stack index in
 * `history.state.idx`); a directly opened URL stays put, like the root route.
 */
export function useMaybePop(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
  }, [navigate]);
}
