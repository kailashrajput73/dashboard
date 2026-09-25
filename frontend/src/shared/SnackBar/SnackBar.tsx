import { useEffect } from 'react';
import { useTheme } from 'styled-components';
import { Container } from './SnackBar.styles';

interface SnackBarProps {
  message: string;
  onDismissed: () => void;
  /** Flutter `SnackBar.duration`; defaults to the theme's 4s. */
  durationMs?: number;
  /**
   * Web (≥ md) placement: `authPanel` sits in the right half beside the auth
   * brand panel; `center` is for full-width pages.
   */
  webAlign?: 'authPanel' | 'center';
}

/**
 * Flutter `ScaffoldMessenger.showSnackBar(SnackBar(content: Text(...)))`.
 * Auto-hides after the default SnackBar duration. Remount (new `key`) to show again.
 */
export function SnackBar({
  message,
  onDismissed,
  durationMs: durationOverride,
  webAlign = 'authPanel',
}: SnackBarProps) {
  const snackBarTheme = useTheme().components.snackBar;
  const durationMs = durationOverride ?? snackBarTheme.durationMs;

  useEffect(() => {
    const timer = setTimeout(onDismissed, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismissed]);

  return (
    <Container role="status" aria-live="polite" $webAlign={webAlign}>
      {message}
    </Container>
  );
}
