import styled from 'styled-components';
import { textStyle } from '../../../theme';
import {
  HeaderInner as PipeHeaderInner,
  RowLabel as PipeRowLabel,
  CardTitle as PipeCardTitle,
  CardDiscount,
} from '../PipesFittingCategory/PipesFittingCategory.styles';

/**
 * Same shell, sidebar, grid and cards as the Pipes & Fittings category page —
 * only the pieces that differ (no filter row, longer labels) are restyled here.
 */
export {
  Screen,
  AppHeaderSlot,
  Header,
  BackSlot,
  SearchSlot,
  HeaderTitle,
  ToolbarHeading,
  HeaderIconButton,
  Centered,
  Sidebar,
  SidebarBrand,
  SidebarBrandText,
  SidebarBrandTitle,
  SidebarBrandMeta,
  SidebarNav,
  AllIcon,
  CountPill,
  SidebarGap,
  SidebarSectionLabel,
  SidebarAllRow,
  SidebarTypeRow,
  TypeThumb,
  Content,
  ContentHeading,
  ContentTitle,
  ContentSubtitle,
  ResultsBar,
  ResultsCount,
  Grid,
  StateMessage,
  StateIcon,
  StateTitle,
  StateSubtitle,
  Card,
  CardMedia,
  AddBadge,
  AddBadgeLabel,
  AddBadgeCount,
  CardBody,
  CardPrice,
  Rupee,
  PriceUnit,
} from '../PipesFittingCategory/PipesFittingCategory.styles';

/**
 * Mobile: [back · title · search] only (no filter row).
 * Web (≥ md): the toolbar holds just the heading.
 */
export const HeaderInner = styled(PipeHeaderInner)`
  grid-template-areas: 'back title search';

  ${({ theme }) => theme.media.md} {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'heading';
  }
`;

/** Category names wrap to two lines in the narrow mobile sidebar. */
export const RowLabel = styled(PipeRowLabel)`
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.15;

  ${({ theme }) => theme.media.md} {
    line-height: 1.25;
  }
`;

/** Catalogue numbers line (takes the pipes card's discount-line slot). */
export const CardCatalogueNos = styled(CardDiscount)`
  ${({ theme }) => textStyle(theme.typography.labelSmall)}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.success};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

/** Product family names are long — allow two lines. */
export const CardTitle = styled(PipeCardTitle)`
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

/** "From" prefix before a family's lowest price. */
export const PriceFrom = styled.span`
  ${({ theme }) => textStyle(theme.typography.labelSmall)}
  font-weight: 500;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  margin-right: 2px;
`;
