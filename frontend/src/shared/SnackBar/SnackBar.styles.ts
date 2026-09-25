import styled from 'styled-components';
import { textStyle } from '../../theme';

/** SnackBar(behavior: floating) — bottom of the screen, above content */
export const Container = styled.div<{ $webAlign: 'authPanel' | 'center' }>`
  position: fixed;
  left: 50%;
  bottom: ${({ theme }) => theme.components.snackBar.marginBottom}px;
  transform: translateX(-50%);
  width: calc(
    min(100%, ${({ theme }) => theme.layout.authMaxWidth}px) -
      ${({ theme }) => theme.components.snackBar.marginX * 2}px
  );
  padding: ${({ theme }) =>
    `${theme.components.snackBar.paddingY}px ${theme.components.snackBar.paddingX}px`};
  background: ${({ theme }) => theme.components.snackBar.background};
  border-radius: ${({ theme }) => theme.components.snackBar.radius}px;
  box-shadow: ${({ theme }) => theme.components.snackBar.shadow};
  ${({ theme }) => textStyle(theme.typography.bodyMedium)}
  color: ${({ theme }) => theme.components.snackBar.foreground};

  /* Web (≥ md): auth screens sit in the right half beside the brand panel. */
  ${({ theme }) => theme.media.md} {
    left: ${({ $webAlign }) => ($webAlign === 'authPanel' ? '75%' : '50%')};
  }
`;
