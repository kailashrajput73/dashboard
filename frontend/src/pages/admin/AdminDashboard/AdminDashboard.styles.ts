import styled, { css, keyframes } from 'styled-components';
import type { DefaultTheme } from 'styled-components';
import { textStyle, withAlpha } from '../../../theme';

const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const resetButton = css`
  appearance: none;
  border: 0;
  margin: 0;
  padding: 0;
  font: inherit;
  cursor: pointer;
  background: none;
`;

const grow = keyframes`
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Status tone → [ink, wash]. Status colours always ship with an icon + label. */
export type Tone = 'good' | 'info' | 'warning' | 'serious' | 'critical' | 'neutral';

export const toneColor = (theme: DefaultTheme, tone: Tone) =>
  ({
    good: theme.colors.success,
    info: theme.colors.info,
    warning: theme.colors.warning,
    serious: theme.colors.secondary,
    critical: theme.colors.error,
    neutral: theme.colors.outline,
  })[tone];

// ── Shell: StorefrontHeader, side menu + content, StorefrontFooter ──────

export const Shell = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

export const ShellBody = styled.div`
  ${({ theme }) => theme.media.md} {
    display: grid;
    grid-template-columns: ${({ theme }) => theme.layout.shellSidebarWidth}px minmax(0, 1fr);
  }
`;

export const Main = styled.main`
  min-width: 0;
  padding: ${({ theme }) => `${theme.spacing.space5}px ${theme.spacing.space4}px`};

  ${({ theme }) => theme.media.md} {
    padding: ${({ theme }) => `${theme.spacing.space6}px ${theme.spacing.space8}px`};
  }
`;

// ── Page head ───────────────────────────────────────────────────────────

export const PageHead = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
  margin-bottom: ${({ theme }) => theme.spacing.space6}px;

  ${({ theme }) => theme.media.lg} {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`;

export const HeadText = styled.div`
  min-width: 0;
`;

export const Title = styled.h1`
  margin: 0;
  ${({ theme }) => textStyle(theme.typography.headlineMedium)}
`;

export const Greeting = styled.p`
  margin: ${({ theme }) => theme.spacing.space1}px 0 0;
  ${({ theme }) => textStyle(theme.typography.bodyMedium)}
`;

export const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
`;

export const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => `${theme.spacing.space1}px ${theme.spacing.space3}px`};
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.divider};
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  color: ${({ theme }) => theme.colors.onSurface};

  i {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export const MetaText = styled.span`
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
`;

export const QuickActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const QuickAction = styled.button<{ $primary?: boolean }>`
  ${resetButton}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  height: ${({ theme }) => theme.components.minInteractiveDimension - 8}px;
  padding: 0 ${({ theme }) => theme.spacing.space4}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  font-weight: 600;
  color: ${({ theme, $primary }) => ($primary ? theme.colors.onPrimary : theme.colors.onSurface)};
  background: ${({ theme, $primary }) => ($primary ? theme.colors.primary : theme.colors.surface)};
  border: 1px solid
    ${({ theme, $primary }) => ($primary ? theme.colors.primary : theme.colors.outlineVariant)};
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  ${focusRing}

  i {
    font-size: 14px;
    color: ${({ theme, $primary }) => ($primary ? theme.colors.onPrimary : theme.colors.primary)};
  }

  &:hover:not(:disabled) {
    background: ${({ theme, $primary }) =>
      $primary ? theme.colors.primaryPressed : theme.colors.surfaceContainer};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ── KPI tiles ───────────────────────────────────────────────────────────

export const KpiGrid = styled.ul`
  list-style: none;
  margin: 0 0 ${({ theme }) => theme.spacing.space5}px;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing.space3}px;

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(
      auto-fill,
      minmax(${({ theme }) => theme.layout.adminKpiMinWidth}px, 1fr)
    );
    gap: ${({ theme }) => theme.spacing.space4}px;
  }
`;

export const KpiTile = styled.li<{ $index: number }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => theme.spacing.space4}px;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.divider};
  animation: ${fadeUp} 0.35s ${({ theme }) => theme.motion.easeOutCubic} both;
  animation-delay: ${({ $index }) => $index * 30}ms;

  ${({ theme }) => theme.media.md} {
    padding: ${({ theme }) => theme.spacing.space5}px;
  }
`;

export const KpiTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const KpiLabel = styled.span`
  min-width: 0;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-size: 13px;
`;

export const KpiIcon = styled.span`
  width: ${({ theme }) => theme.layout.adminThumbSize}px;
  height: ${({ theme }) => theme.layout.adminThumbSize}px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => withAlpha(theme.colors.primary, 0.08)};

  i {
    font-size: 14px;
  }
`;

export const KpiValue = styled.span`
  ${({ theme }) => textStyle(theme.typography.headlineSmall)}
  font-weight: 700;

  ${({ theme }) => theme.media.md} {
    font-size: 28px;
    line-height: 1.2;
  }
`;

export const KpiFoot = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px ${({ theme }) => theme.spacing.space2}px;
`;

/** Delta chip — colour = direction × whether up is good; arrow icon carries direction too. */
export const Delta = styled.span<{ $good: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px ${({ theme }) => theme.spacing.space1 + 2}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $good }) => ($good ? theme.colors.success : theme.colors.error)};
  background: ${({ theme, $good }) =>
    $good ? theme.colors.successContainer : theme.colors.errorContainer};

  i {
    font-size: 10px;
  }
`;

export const KpiCaption = styled.span`
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
`;

// ── Card grid ───────────────────────────────────────────────────────────

/** 1 col on phones, 2 at md, a 12-col grid at lg. */
export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing.space4}px;

  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${({ theme }) => theme.spacing.space5}px;
  }

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
`;

export const Card = styled.section<{ $md?: 1 | 2; $lg: number }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.space4}px;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.divider};

  ${({ theme }) => theme.media.md} {
    grid-column: span ${({ $md = 2 }) => $md};
    padding: ${({ theme }) => `${theme.spacing.space5}px ${theme.spacing.space6}px`};
  }

  ${({ theme }) => theme.media.lg} {
    grid-column: span ${({ $lg }) => $lg};
  }
`;

export const CardHead = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space3}px;
  margin-bottom: ${({ theme }) => theme.spacing.space4}px;
`;

export const CardTitle = styled.h2`
  margin: 0;
  ${({ theme }) => textStyle(theme.typography.titleMedium)}
`;

export const CardSubtitle = styled.p`
  margin: 2px 0 0;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
`;

export const TextButton = styled.button`
  ${resetButton}
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  padding: ${({ theme }) => `${theme.spacing.space1}px ${theme.spacing.space2}px`};
  border-radius: ${({ theme }) => theme.radius.sm}px;
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  ${focusRing}

  i {
    font-size: 12px;
  }

  &:hover {
    background: ${({ theme }) => withAlpha(theme.colors.primary, 0.08)};
  }
`;

export const SmallButton = styled.button<{ $filled?: boolean }>`
  ${resetButton}
  flex-shrink: 0;
  height: 30px;
  padding: 0 ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme, $filled }) => ($filled ? theme.colors.onPrimary : theme.colors.primary)};
  background: ${({ theme, $filled }) =>
    $filled ? theme.colors.primary : withAlpha(theme.colors.primary, 0.08)};
  transition: background 0.15s ease;
  ${focusRing}

  &:hover {
    background: ${({ theme, $filled }) =>
      $filled ? theme.colors.primaryPressed : withAlpha(theme.colors.primary, 0.14)};
  }
`;

// ── Status chip (icon + label + tone) ───────────────────────────────────

export const StatusChip = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  padding: 2px ${({ theme }) => theme.spacing.space2}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme, $tone }) => toneColor(theme, $tone)};
  background: ${({ theme, $tone }) => withAlpha(toneColor(theme, $tone), 0.1)};

  i {
    font-size: 11px;
  }
`;

// ── Revenue trend chart (inline SVG) ────────────────────────────────────

export const ChartFrame = styled.div`
  position: relative;
  height: ${({ theme }) => theme.layout.adminChartHeight}px;
  touch-action: pan-y;

  svg {
    display: block;
    overflow: visible;
    border-radius: ${({ theme }) => theme.radius.sm}px;
    ${focusRing}
  }
`;

export const AxisText = styled.text`
  font-family: ${({ theme }) => theme.fontFamily.body};
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: ${({ theme }) => theme.colors.outline};
`;

export const EndLabel = styled.text`
  font-family: ${({ theme }) => theme.fontFamily.display};
  font-size: 12px;
  font-weight: 700;
  fill: ${({ theme }) => theme.colors.onSurface};
`;

export const Tooltip = styled.div`
  position: absolute;
  top: 0;
  z-index: 2;
  width: ${({ theme }) => theme.layout.adminTooltipWidth}px;
  padding: ${({ theme }) => `${theme.spacing.space2}px ${theme.spacing.space3}px`};
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.divider};
  box-shadow: ${({ theme }) => theme.elevation.level2};
  pointer-events: none;
`;

export const TooltipTitle = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.space1}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
`;

export const TooltipRow = styled.p`
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space2}px;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}

  strong {
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.onSurface};
  }
`;

export const TrendSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing.space1}px ${({ theme }) => theme.spacing.space3}px;
  margin: -${({ theme }) => theme.spacing.space2}px 0 ${({ theme }) => theme.spacing.space3}px;
`;

export const TrendValue = styled.span`
  ${({ theme }) => textStyle(theme.typography.headlineSmall)}
  font-weight: 700;
`;

// ── Tables ──────────────────────────────────────────────────────────────

export const TableScroll = styled.div`
  overflow-x: auto;
  margin: 0 -${({ theme }) => theme.spacing.space4}px;
  padding: 0 ${({ theme }) => theme.spacing.space4}px;

  ${({ theme }) => theme.media.md} {
    margin: 0 -${({ theme }) => theme.spacing.space6}px;
    padding: 0 ${({ theme }) => theme.spacing.space6}px;
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  ${({ theme }) => textStyle(theme.typography.bodyMedium)}
  color: ${({ theme }) => theme.colors.onSurface};

  th {
    padding: ${({ theme }) => `${theme.spacing.space2}px ${theme.spacing.space2}px`};
    ${({ theme }) => textStyle(theme.typography.labelMedium)}
    font-weight: 600;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid ${({ theme }) => theme.colors.divider};
  }

  td {
    padding: ${({ theme }) => `${theme.spacing.space3}px ${theme.spacing.space2}px`};
    vertical-align: middle;
    border-bottom: 1px solid ${({ theme }) => theme.colors.divider};
  }

  th:first-child,
  td:first-child {
    padding-left: 0;
  }

  th:last-child,
  td:last-child {
    padding-right: 0;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr {
    transition: background 0.15s ease;
  }

  tbody tr:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

export const NumCell = styled.td`
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

export const NumHead = styled.th`
  text-align: right !important;
`;

export const Rank = styled.span`
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => withAlpha(theme.colors.primary, 0.08)};
`;

export const ProductCell = styled.div`
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const ProductName = styled.span`
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  font-weight: 600;
`;

export const ProductMeta = styled.span`
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
`;

export const TrendText = styled.span<{ $good: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 600;
  color: ${({ theme, $good }) => ($good ? theme.colors.success : theme.colors.error)};

  i {
    font-size: 10px;
  }
`;

// ── Horizontal bars (category sales, users by role) ─────────────────────

export const BarList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const BarRow = styled.li<{ $noThumb?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $noThumb }) => ($noThumb ? 'minmax(0, 1fr)' : 'auto minmax(0, 1fr)')};
  align-items: center;
  column-gap: ${({ theme }) => theme.spacing.space3}px;
  row-gap: ${({ theme }) => theme.spacing.space1}px;
  padding: ${({ theme }) => theme.spacing.space1}px;
  margin: -${({ theme }) => theme.spacing.space1}px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

export const BarThumb = styled.img`
  grid-row: span 2;
  width: ${({ theme }) => theme.layout.adminThumbSize}px;
  height: ${({ theme }) => theme.layout.adminThumbSize}px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  background: ${({ theme }) => theme.colors.surfaceContainer};
  mix-blend-mode: multiply;
`;

export const BarLabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space2}px;
  min-width: 0;
`;

export const BarName = styled.span`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
`;

export const BarValue = styled.span`
  flex-shrink: 0;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-variant-numeric: tabular-nums;

  strong {
    color: ${({ theme }) => theme.colors.onSurface};
    font-weight: 700;
  }
`;

/** Track = a lighter step of the bar hue; data end is 4px rounded. */
export const BarTrack = styled.div`
  height: ${({ theme }) => theme.layout.adminBarThickness}px;
  border-radius: ${({ theme }) => theme.radius.xs}px;
  background: ${({ theme }) => withAlpha(theme.colors.primary, 0.08)};
  overflow: hidden;
`;

export const BarFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => $pct}%;
  height: 100%;
  border-radius: 0 ${({ theme }) => theme.radius.xs}px ${({ theme }) => theme.radius.xs}px 0;
  background: ${({ theme }) => theme.colors.primary};
  transform-origin: left;
  animation: ${grow} 0.6s ${({ theme }) => theme.motion.easeOutCubic} both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// ── Stock alerts ────────────────────────────────────────────────────────

export const AlertList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

export const AlertItem = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing.space2}px ${({ theme }) => theme.spacing.space3}px;
  padding: ${({ theme }) => theme.spacing.space3}px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.divider};

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
`;

export const AlertText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const AlertSide = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const AlertMeterRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const Meter = styled.div<{ $pct: number; $tone: Tone }>`
  flex: 1;
  height: ${({ theme }) => theme.layout.adminMeterHeight}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme, $tone }) => withAlpha(toneColor(theme, $tone), 0.14)};
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
    height: 100%;
    border-radius: inherit;
    background: ${({ theme, $tone }) => toneColor(theme, $tone)};
  }
`;

export const MeterText = styled.span`
  flex-shrink: 0;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
  font-variant-numeric: tabular-nums;

  strong {
    color: ${({ theme }) => theme.colors.onSurface};
  }
`;

// ── Quotations ──────────────────────────────────────────────────────────

export const StatPair = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing.space3}px;
  margin-bottom: ${({ theme }) => theme.spacing.space4}px;
`;

export const MiniStat = styled.div<{ $tone: Tone }>`
  padding: ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme, $tone }) => withAlpha(toneColor(theme, $tone), 0.07)};
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const MiniStatLabel = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 600;

  i {
    font-size: 11px;
    color: ${({ theme, $tone }) => toneColor(theme, $tone)};
  }
`;

export const MiniStatValue = styled.span`
  ${({ theme }) => textStyle(theme.typography.titleLarge)}
  font-weight: 700;
`;

export const MiniStatCaption = styled.span`
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
`;

export const ConversionRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  margin-bottom: ${({ theme }) => theme.spacing.space4}px;
`;

export const RowList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

export const RowItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: ${({ theme }) => theme.spacing.space3}px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.divider};
`;

export const RowText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const RowTitle = styled.span<{ $wrap?: boolean }>`
  overflow: hidden;
  white-space: ${({ $wrap }) => ($wrap ? 'normal' : 'nowrap')};
  text-overflow: ellipsis;
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  font-weight: 600;
`;

export const RowMeta = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
`;

export const RowSide = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.space1}px;
`;

export const RowAmount = styled.span`
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

export const PartnerCell = styled.div`
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

// ── Dispatch status stack ───────────────────────────────────────────────

/** Stacked bar — 2px surface gaps between segments, 4px rounded outer ends. */
export const Stack = styled.div`
  display: flex;
  gap: 2px;
  height: ${({ theme }) => theme.layout.adminStackHeight}px;
  margin-bottom: ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.xs}px;
  overflow: hidden;
`;

export const StackSegment = styled.div<{ $tone: Tone; $grow: number }>`
  flex: ${({ $grow }) => $grow} 1 0;
  min-width: 4px;
  background: ${({ theme, $tone }) => toneColor(theme, $tone)};
`;

export const LegendGrid = styled.ul`
  list-style: none;
  margin: 0 0 ${({ theme }) => theme.spacing.space2}px;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const LegendItem = styled.li<{ $tone: Tone }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}

  i {
    font-size: 12px;
    color: ${({ theme, $tone }) => toneColor(theme, $tone)};
  }

  strong {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.onSurface};
  }
`;

// ── Warehouses ──────────────────────────────────────────────────────────

export const WarehouseList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const WarehouseItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const WarehouseTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const WarehouseStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space1}px ${({ theme }) => theme.spacing.space4}px;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}

  strong {
    color: ${({ theme }) => theme.colors.onSurface};
    font-variant-numeric: tabular-nums;
  }
`;

// ── Users ───────────────────────────────────────────────────────────────

export const UsersHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing.space2}px;
  margin-bottom: ${({ theme }) => theme.spacing.space4}px;
`;

export const SubHeading = styled.h3`
  margin: ${({ theme }) => theme.spacing.space5}px 0 ${({ theme }) => theme.spacing.space1}px;
  ${({ theme }) => textStyle(theme.typography.titleSmall)}
`;

export const Avatar = styled.span`
  width: ${({ theme }) => theme.layout.adminThumbSize + 4}px;
  height: ${({ theme }) => theme.layout.adminThumbSize + 4}px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primaryContainer};
`;

// ── Activity feed ───────────────────────────────────────────────────────

export const ActivityIcon = styled.span`
  width: ${({ theme }) => theme.layout.adminThumbSize}px;
  height: ${({ theme }) => theme.layout.adminThumbSize}px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  background: ${({ theme }) => theme.colors.surfaceContainer};

  i {
    font-size: 14px;
  }
`;

export const ActivityGrid = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  column-gap: ${({ theme }) => theme.spacing.space8}px;

  ${({ theme }) => theme.media.lg} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  li {
    border-top: 1px solid ${({ theme }) => theme.colors.divider};
  }
`;

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`;
