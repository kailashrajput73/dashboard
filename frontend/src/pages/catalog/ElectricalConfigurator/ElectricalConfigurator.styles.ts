import styled from 'styled-components';
import { textStyle } from '../../../theme';
import { Eyebrow as PipeEyebrow } from '../PipeConfigurator/PipeConfigurator.styles';

/**
 * Same split layout, dropdowns and cart card as the pipe configurator — only
 * the eyebrow (shown on mobile too) and the spec sheet are new.
 */
export {
  Screen,
  TopBar,
  TopBarInner,
  BackButton,
  TopBarContext,
  SearchPill,
  MobileCartSlot,
  Body,
  Media,
  Details,
  DetailsInner,
  BrandChip,
  Title,
  FieldGap,
  CartCard,
  CartInfo,
  CartLabel,
  CartPrice,
  CartUnit,
  CartSize,
  AddToCartButton,
} from '../PipeConfigurator/PipeConfigurator.styles';

/** Category caption + catalogue-number chip above the title (all widths). */
export const Eyebrow = styled(PipeEyebrow)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};

  ${({ theme }) => theme.media.md} {
    margin-bottom: ${({ theme }) => theme.spacing.space3}px;
    ${({ theme }) => textStyle(theme.typography.labelLarge)}
    font-weight: 700;
  }
`;

/** Caption above each dropdown (Flutter shows it on mobile too). */
export const FieldLabel = styled.span`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.space1}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};

  ${({ theme }) => theme.media.md} {
    margin-bottom: ${({ theme }) => theme.spacing.space2}px;
    ${({ theme }) => textStyle(theme.typography.labelLarge)}
    font-weight: 600;
  }
`;

// ── _SpecSheet ──────────────────────────────────────────────────────────

export const SpecSheet = styled.section`
  margin-top: ${({ theme }) => theme.spacing.space4}px;
  padding-bottom: ${({ theme }) => theme.spacing.space1}px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.divider};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  overflow: hidden;

  ${({ theme }) => theme.media.md} {
    margin-top: ${({ theme }) => theme.spacing.space8}px;
  }
`;

export const SpecTitle = styled.h2`
  margin: 0;
  padding: ${({ theme }) =>
    `${theme.spacing.space3}px ${theme.spacing.space3}px ${theme.spacing.space2}px`};
  ${({ theme }) => textStyle(theme.typography.titleSmall)}
  font-weight: 800;
  color: ${({ theme }) => theme.colors.onBackground};
`;

export const SpecRows = styled.dl`
  margin: 0;
`;

/** Zebra rows: surfaceContainer on even rows. */
export const SpecRow = styled.div<{ $striped: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: ${({ theme }) => `${theme.spacing.space2}px ${theme.spacing.space3}px`};
  background: ${({ theme, $striped }) => ($striped ? theme.colors.surfaceContainer : 'transparent')};

  dt,
  dd {
    margin: 0;
    ${({ theme }) => textStyle(theme.typography.bodySmall)}
  }

  dt {
    color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }

  dd {
    font-weight: 700;
    text-align: right;
    color: ${({ theme }) => theme.colors.onBackground};
  }

  ${({ theme }) => theme.media.md} {
    padding: ${({ theme }) => `${theme.spacing.space3}px ${theme.spacing.space4}px`};

    dt,
    dd {
      ${({ theme }) => textStyle(theme.typography.bodyMedium)}
    }

    dd {
      font-weight: 700;
    }
  }
`;
